import crypto, { randomUUID } from "crypto";
import {
  encryptRequest,
  decryptResponse,
  HEADER_SERVER_ENCRYPTION_IV,
  HEADER_SERVER_ENCRYPTION_KEY,
  HEADER_SERVER_ENCRYPTION_HMAC,
} from "./encryption.ts";
import {
  createStateEmpty,
  StateStoreMemory,
  type AuthContextState,
  type ClientState,
  type StateStore,
} from "./state-store.ts";

// ─── Environment ──────────────────────────────────────────────────────────────

export type BunqEnv = "sandbox" | "production";

const BASE_URLS: Record<BunqEnv, string> = {
  sandbox: "https://partner-api.sandbox.bunq.com",
  production: "https://api.partner.bunq.com",
};

const API_VERSION_PREFIX = "/v1";
const RSA_MODULUS_LENGTH = 2048;
const TIMEOUT_DEFAULT_MS = 30_000;
const HTTP_STATUS_UNAUTHORIZED = 401;
const ERROR_BODY_PREVIEW_LENGTH = 200;
const USER_AGENT = "bunq-partner-mcp/1.0";
const DEVICE_DESCRIPTION_PARTNER = "bunq-partner-mcp";
const DEVICE_DESCRIPTION_USER = "bunq-partner-mcp-user";
const HEADER_SERVER_SIGNATURE = "X-Bunq-Server-Signature";
const HEADER_CLIENT_SIGNATURE = "X-Bunq-Client-Signature";
const HEADER_CLIENT_AUTHENTICATION = "X-Bunq-Client-Authentication";
const CONTENT_TYPE_JSON = "application/json";
const METHODS_WITHOUT_BODY = ["GET", "HEAD"];

// ─── Errors ───────────────────────────────────────────────────────────────────

export class BunqApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "BunqApiError";
  }
}

export class BunqSessionMissingError extends Error {
  constructor(userId: number) {
    super(
      `No session for user ${userId}. Call create_user_session with the provisioned user's ` +
        `credential token first, then use the user_id it returns.`
    );
    this.name = "BunqSessionMissingError";
  }
}

// ─── Response parsing ─────────────────────────────────────────────────────────

/** bunq wraps all responses in { Response: [ { TypeName: {...} }, ... ] } */
export function parseResponse(body: Record<string, unknown>): Record<string, unknown> {
  const items = body.Response as Array<Record<string, unknown>>;
  if (!Array.isArray(items)) return body;
  const merged: Record<string, unknown> = {};
  for (const item of items) {
    for (const [k, v] of Object.entries(item)) {
      if (k in merged) {
        if (!Array.isArray(merged[k])) merged[k] = [merged[k]];
        (merged[k] as unknown[]).push(v);
      } else {
        merged[k] = v;
      }
    }
  }
  if ("Pagination" in body) merged.Pagination = body.Pagination;
  return merged;
}

function determineErrorMessage(status: number, json: Record<string, unknown>): string {
  const allError = json.Error as Array<Record<string, string>> | undefined;
  const allDescription = (allError ?? []).map((e) => e.error_description).filter(Boolean);
  const detail = allDescription.length > 0 ? allDescription.join("; ") : JSON.stringify(json);
  return `bunq API error ${status}: ${detail}`;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export interface BunqClientOptions {
  stateStore?: StateStore;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

interface SendOptions {
  authToken: string | null;
  body?: Record<string, unknown> | null;
  bodyRaw?: Buffer;
  contentType?: string;
  headersExtra?: Record<string, string>;
  encrypt?: boolean;
  isSignatureExpected?: boolean;
}

export interface UserSessionResult {
  userId: number;
  userApiKeyId: number | null;
}

export class BunqClient {
  private readonly apiKey: string;
  private readonly env: BunqEnv;
  private readonly baseUrl: string;
  private readonly stateStore: StateStore;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private state: ClientState;

  constructor(apiKey: string, env: BunqEnv = "sandbox", options: BunqClientOptions = {}) {
    this.apiKey = apiKey;
    this.env = env;
    this.baseUrl = BASE_URLS[env];
    this.stateStore = options.stateStore ?? new StateStoreMemory();
    this.timeoutMs = options.timeoutMs ?? TIMEOUT_DEFAULT_MS;
    this.fetchImpl = options.fetch ?? fetch;
    this.state = this.stateStore.load();
    if (this.state.partner && this.state.partner.secret !== apiKey) {
      // A state file of another API key must never be reused.
      this.state = createStateEmpty();
    } else {
      // State belongs to this API key.
    }
  }

  // ── Partner session ─────────────────────────────────────────────────────────

  async ensureSession(): Promise<void> {
    if (this.state.partner?.sessionToken) {
      // Reuse the stored session. An expired one is renewed on the first 401.
    } else if (this.state.partner) {
      await this.renewSession(this.state.partner);
    } else {
      this.state.partner = await this.createContext(this.apiKey);
      await this.createSession(this.state.partner);
    }
  }

  async refreshSession(): Promise<void> {
    await this.ensureSession();
    await this.renewSession(this.state.partner!);
  }

  async call(
    method: string,
    path: string,
    body: Record<string, unknown> | null = null,
    encrypt = false
  ): Promise<Record<string, unknown>> {
    await this.ensureSession();
    return this.sendWithRetry(this.state.partner!, method, path, { body, encrypt });
  }

  // ── Provisioned-user sessions ───────────────────────────────────────────────

  /** Creates and stores a session for a provisioned user. The token never leaves the client. */
  async createUserSession(credentialToken: string): Promise<UserSessionResult> {
    const contextExisting = Object.values(this.state.users).find((u) => u.secret === credentialToken);
    let context: AuthContextState;

    if (contextExisting) {
      context = contextExisting;
      await this.renewSession(context);
    } else {
      context = await this.createContext(credentialToken);
      await this.createSession(context);
    }

    this.state.users[String(context.userId)] = context;
    this.saveState();
    return { userId: context.userId, userApiKeyId: context.userApiKeyId };
  }

  /**
   * Calls a /user/{userId}/... endpoint with the session that belongs to that user:
   * the provisioned user's own session, or the partner session for the partner's own user.
   */
  async callForUser(
    userId: number,
    method: string,
    path: string,
    body: Record<string, unknown> | null = null,
    encrypt = false
  ): Promise<Record<string, unknown>> {
    const context = await this.determineContextForUser(userId);
    return this.sendWithRetry(context, method, path, { body, encrypt });
  }

  async uploadAttachment(
    userId: number,
    description: string,
    contentType: string,
    base64Content: string
  ): Promise<Record<string, unknown>> {
    const context = await this.determineContextForUser(userId);
    return this.sendWithRetry(context, "POST", `/user/${userId}/attachment`, {
      bodyRaw: Buffer.from(base64Content, "base64"),
      contentType,
      headersExtra: { "X-Bunq-Attachment-Description": description },
    });
  }

  private async determineContextForUser(userId: number): Promise<AuthContextState> {
    const contextUser =
      this.state.users[String(userId)] ??
      Object.values(this.state.users).find((u) => u.userApiKeyId === userId);

    if (contextUser) {
      return contextUser;
    } else {
      await this.ensureSession();
      if (this.state.partner!.userId === userId) {
        return this.state.partner!;
      } else {
        throw new BunqSessionMissingError(userId);
      }
    }
  }

  // ── Installation, device and session ────────────────────────────────────────

  private async createContext(secret: string): Promise<AuthContextState> {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: RSA_MODULUS_LENGTH,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    const context: AuthContextState = {
      privateKeyPem: privateKey,
      publicKeyPem: publicKey,
      installationToken: "",
      serverPublicKey: "",
      sessionToken: null,
      secret,
      userId: 0,
      userApiKeyId: null,
    };

    const installation = await this.send(context, "POST", "/installation", {
      authToken: null,
      body: { client_public_key: publicKey },
      isSignatureExpected: false,
    });
    context.installationToken = (installation.Token as { token: string }).token;
    context.serverPublicKey = (installation.ServerPublicKey as { server_public_key: string }).server_public_key;

    const deviceDescription = secret === this.apiKey ? DEVICE_DESCRIPTION_PARTNER : DEVICE_DESCRIPTION_USER;
    await this.send(context, "POST", "/device-server", {
      authToken: context.installationToken,
      body: { description: deviceDescription, secret, permitted_ips: ["*"] },
    });

    return context;
  }

  private async createSession(context: AuthContextState): Promise<void> {
    const session = await this.send(context, "POST", "/session-server", {
      authToken: context.installationToken,
      body: { secret: context.secret },
    });
    context.sessionToken = (session.Token as { token: string }).token;

    const userApiKey = session.UserApiKey as
      | { id: number; granted_by_user?: Record<string, { id: number }> }
      | undefined;
    const userDirect =
      (session.UserCompany as { id: number } | undefined) ?? (session.UserPerson as { id: number } | undefined);

    if (userApiKey) {
      // A provisioned user's session: the path user id is the granting user, not the key.
      const userGranting = Object.values(userApiKey.granted_by_user ?? {})[0];
      context.userApiKeyId = userApiKey.id;
      context.userId = userGranting?.id ?? userApiKey.id;
    } else if (userDirect) {
      context.userId = userDirect.id;
    } else {
      throw new Error("session-server response has no UserCompany, UserPerson or UserApiKey");
    }
    this.saveState();
  }

  /** Makes a new session; if the stored installation is no longer valid, starts over. */
  private async renewSession(context: AuthContextState): Promise<void> {
    try {
      await this.createSession(context);
    } catch (error) {
      if (error instanceof BunqApiError) {
        Object.assign(context, await this.createContext(context.secret));
        await this.createSession(context);
      } else {
        throw error;
      }
    }
  }

  private saveState(): void {
    this.stateStore.save(this.state);
  }

  // ── HTTP ────────────────────────────────────────────────────────────────────

  private async sendWithRetry(
    context: AuthContextState,
    method: string,
    path: string,
    options: Omit<SendOptions, "authToken">
  ): Promise<Record<string, unknown>> {
    try {
      return await this.send(context, method, path, { ...options, authToken: context.sessionToken });
    } catch (error) {
      if (error instanceof BunqApiError && error.status === HTTP_STATUS_UNAUTHORIZED) {
        await this.renewSession(context);
        return await this.send(context, method, path, { ...options, authToken: context.sessionToken });
      } else {
        throw error;
      }
    }
  }

  private async send(
    context: AuthContextState,
    method: string,
    path: string,
    options: SendOptions
  ): Promise<Record<string, unknown>> {
    const bodyPlain: Buffer =
      options.bodyRaw ?? Buffer.from(options.body ? JSON.stringify(options.body) : "", "utf8");
    let bodyWire = bodyPlain;
    let headersEncryption: Record<string, string> = {};

    if (METHODS_WITHOUT_BODY.includes(method)) {
      // fetch refuses a body on GET and HEAD, so an encrypted read sends none.
      bodyWire = Buffer.alloc(0);
    } else if (options.encrypt) {
      const { cipher, headers } = encryptRequest(bodyPlain.toString("utf8"), context.serverPublicKey);
      bodyWire = cipher;
      headersEncryption = headers;
    } else {
      // Plain request body.
    }

    const headers: Record<string, string> = {
      "Content-Type": options.contentType ?? CONTENT_TYPE_JSON,
      "Cache-Control": "no-cache",
      "User-Agent": USER_AGENT,
      "X-Bunq-Language": "en_US",
      "X-Bunq-Region": "nl_NL",
      "X-Bunq-Client-Request-Id": randomUUID(),
      "X-Bunq-Geolocation": "0 0 0 0 NL",
      ...headersEncryption,
      ...options.headersExtra,
    };
    if (options.authToken) headers[HEADER_CLIENT_AUTHENTICATION] = options.authToken;
    if (options.authToken && bodyWire.length > 0) {
      headers[HEADER_CLIENT_SIGNATURE] = crypto.sign("sha256", bodyWire, context.privateKeyPem).toString("base64");
    }

    const response = await this.fetchWithTimeout(method, path, headers, bodyWire);
    const bodyResponse = Buffer.from(await response.arrayBuffer());
    const text = this.determineResponseText(context, response, bodyResponse, options.isSignatureExpected ?? true);

    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new BunqApiError(
        response.status,
        `bunq API returned a non-JSON response (${response.status}) for ${method} ${path}: ` +
          text.slice(0, ERROR_BODY_PREVIEW_LENGTH)
      );
    }

    if (response.ok) {
      return parseResponse(json);
    } else {
      throw new BunqApiError(response.status, determineErrorMessage(response.status, json));
    }
  }

  private async fetchWithTimeout(
    method: string,
    path: string,
    headers: Record<string, string>,
    body: Buffer
  ): Promise<Response> {
    try {
      return await this.fetchImpl(`${this.baseUrl}${API_VERSION_PREFIX}${path}`, {
        method,
        headers,
        body: body.length > 0 ? new Uint8Array(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new Error(`bunq API did not answer within ${this.timeoutMs} ms for ${method} ${path}`);
      } else {
        throw error;
      }
    }
  }

  private determineResponseText(
    context: AuthContextState,
    response: Response,
    body: Buffer,
    isSignatureExpected: boolean
  ): string {
    const isEncrypted =
      response.headers.has(HEADER_SERVER_ENCRYPTION_KEY) &&
      response.headers.has(HEADER_SERVER_ENCRYPTION_IV) &&
      response.headers.has(HEADER_SERVER_ENCRYPTION_HMAC);
    const text = isEncrypted
      ? decryptResponse(
          body,
          {
            key: response.headers.get(HEADER_SERVER_ENCRYPTION_KEY)!,
            iv: response.headers.get(HEADER_SERVER_ENCRYPTION_IV)!,
            hmac: response.headers.get(HEADER_SERVER_ENCRYPTION_HMAC)!,
          },
          context.privateKeyPem
        )
      : body.toString("utf8");

    if (response.ok && isSignatureExpected) {
      this.assertSignatureServerValid(context, response, body, Buffer.from(text, "utf8"));
    } else {
      // Error responses and the installation response are not signed by bunq.
    }

    return text;
  }

  /** bunq signs the response body with the installation's server key (RSA-SHA256). */
  private assertSignatureServerValid(
    context: AuthContextState,
    response: Response,
    bodyWire: Buffer,
    bodyPlain: Buffer
  ): void {
    const signature = response.headers.get(HEADER_SERVER_SIGNATURE);

    if (signature === null) {
      throw new Error(`bunq response has no ${HEADER_SERVER_SIGNATURE} header; refusing an unsigned response`);
    } else {
      const signatureBytes = Buffer.from(signature, "base64");
      const isValid =
        crypto.verify("sha256", bodyWire, context.serverPublicKey, signatureBytes) ||
        crypto.verify("sha256", bodyPlain, context.serverPublicKey, signatureBytes);

      if (isValid) {
        // Signature matches the server key from our installation.
      } else {
        throw new Error("bunq response signature is not valid; refusing the response");
      }
    }
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  get currentUserId(): number {
    return this.state.partner?.userId ?? 0;
  }

  get environment(): BunqEnv {
    return this.env;
  }

  get isAuthenticated(): boolean {
    return Boolean(this.state.partner?.sessionToken);
  }

  get userIdsWithSession(): number[] {
    return Object.values(this.state.users).map((u) => u.userId);
  }
}
