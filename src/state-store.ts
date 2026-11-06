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
  /** The environment and API key hash the file belongs to. A file of another pair is never reused. */
  binding?: StateBinding;
  partner: AuthContextState | null;
  users: Record<string, AuthContextState>;
}

export interface StateBinding {
  env: string;
  apiKeyHash: string;
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
  private readonly binding: StateBinding | null;
  private isWriteBlocked = false;

  constructor(filePath: string, binding: StateBinding | null = null) {
    this.filePath = filePath;
    this.binding = binding;
  }

  get path(): string {
    return this.filePath;
  }

  load(): ClientState {
    const stateFile = this.readFileOrNull();

    if (stateFile === null) {
      return createStateEmpty();
    } else if (this.isBindingMatch(stateFile)) {
      return stateFile;
    } else {
      // Another environment or API key owns this file: keep it intact and run without persistence.
      this.isWriteBlocked = true;
      process.stderr.write(`[bunq-mcp] ${this.filePath} belongs to another environment or API key; not using it.\n`);
      return createStateEmpty();
    }
  }

  /**
   * Merges with the file before writing, so two server processes with the same key (for example
   * Claude Desktop and Claude Code) keep each other's user sessions.
   */
  save(state: ClientState): void {
    if (this.isWriteBlocked) {
      // The file belongs to another environment or API key.
    } else {
      const stateFile = this.readFileOrNull();
      const usersFile = stateFile && this.isBindingMatch(stateFile) ? stateFile.users : {};
      const stateMerged: ClientState = {
        ...state,
        binding: this.binding ?? undefined,
        users: { ...usersFile, ...state.users },
      };
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true, mode: STATE_DIR_MODE });
      const fileTemporary = `${this.filePath}.${process.pid}.tmp`;
      fs.writeFileSync(fileTemporary, JSON.stringify(stateMerged, null, 2), { mode: STATE_FILE_MODE });
      fs.renameSync(fileTemporary, this.filePath);
    }
  }

  private readFileOrNull(): ClientState | null {
    if (fs.existsSync(this.filePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as ClientState;
        return parsed.version === STATE_VERSION ? parsed : null;
      } catch {
        // A corrupt file only costs one new installation; never block the server on it.
        return null;
      }
    } else {
      return null;
    }
  }

  private isBindingMatch(state: ClientState): boolean {
    if (this.binding === null || state.binding === undefined) {
      return true;
    } else {
      return state.binding.env === this.binding.env && state.binding.apiKeyHash === this.binding.apiKeyHash;
    }
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
    const binding = { env: bunqEnv, apiKeyHash: determineApiKeyHash(apiKey) };
    return new StateStoreFile(env.BUNQ_STATE_FILE ?? determineStateFilePathDefault(bunqEnv, apiKey), binding);
  } else {
    return new StateStoreMemory();
  }
}

export function determineApiKeyHash(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex").slice(0, API_KEY_HASH_LENGTH);
}

function determineStateFilePathDefault(bunqEnv: string, apiKey: string): string {
  // One file per environment and API key, so two keys never share an installation.
  return path.join(os.homedir(), STATE_DIR_NAME, `state-${bunqEnv}-${determineApiKeyHash(apiKey)}.json`);
}
