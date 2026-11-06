import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

// Keeps the key pairs, installations and sessions across server restarts, so a
// restart does not register a new device-server and lose provisioned-user sessions.
// The file holds private keys and tokens, so it is written with mode 0600.

export interface AuthContextState {
  privateKeyPem: string;
  publicKeyPem: string;
  installationToken: string;
  serverPublicKey: string;
  sessionToken: string | null;
  secret: string;
  userId: number;
  userApiKeyId: number | null;
}

export interface ClientState {
  version: 1;
  partner: AuthContextState | null;
  users: Record<string, AuthContextState>;
}

const STATE_VERSION = 1;
const STATE_DIR_MODE = 0o700;
const STATE_FILE_MODE = 0o600;
const STATE_DIR_NAME = ".bunq-partner-mcp";
const API_KEY_HASH_LENGTH = 12;

export function createStateEmpty(): ClientState {
  return { version: STATE_VERSION, partner: null, users: {} };
}

export interface StateStore {
  load(): ClientState;
  save(state: ClientState): void;
}

export class StateStoreMemory implements StateStore {
  private state: ClientState = createStateEmpty();

  load(): ClientState {
    return this.state;
  }

  save(state: ClientState): void {
    this.state = state;
  }
}

export class StateStoreFile implements StateStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  get path(): string {
    return this.filePath;
  }

  load(): ClientState {
    if (fs.existsSync(this.filePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as ClientState;
        return parsed.version === STATE_VERSION ? parsed : createStateEmpty();
      } catch {
        // A corrupt file only costs one new installation; never block the server on it.
        return createStateEmpty();
      }
    } else {
      return createStateEmpty();
    }
  }

  save(state: ClientState): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true, mode: STATE_DIR_MODE });
    const fileTemporary = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(fileTemporary, JSON.stringify(state, null, 2), { mode: STATE_FILE_MODE });
    fs.renameSync(fileTemporary, this.filePath);
  }
}

/**
 * Persistence is on by default for sandbox and off for production.
 * BUNQ_PERSIST_STATE=true|false overrides the default; BUNQ_STATE_FILE overrides the path.
 */
export function createStateStoreFromEnv(
  env: NodeJS.ProcessEnv,
  bunqEnv: string,
  apiKey: string
): StateStore {
  const isPersistEnabled =
    env.BUNQ_PERSIST_STATE === undefined ? bunqEnv === "sandbox" : env.BUNQ_PERSIST_STATE === "true";

  if (isPersistEnabled) {
    return new StateStoreFile(env.BUNQ_STATE_FILE ?? determineStateFilePathDefault(bunqEnv, apiKey));
  } else {
    return new StateStoreMemory();
  }
}

function determineStateFilePathDefault(bunqEnv: string, apiKey: string): string {
  // One file per environment and API key, so two keys never share an installation.
  const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex").slice(0, API_KEY_HASH_LENGTH);
  return path.join(os.homedir(), STATE_DIR_NAME, `state-${bunqEnv}-${apiKeyHash}.json`);
}
