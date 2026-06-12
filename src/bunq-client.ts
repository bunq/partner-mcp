import crypto from "crypto";
import { randomUUID } from "crypto";

// ─── Environment ──────────────────────────────────────────────────────────────

export type BunqEnv = "sandbox" | "production";

const BASE_URLS: Record<BunqEnv, string> = {
  sandbox: "https://partner-api.sandbox.bunq.com",
  production: "https://api.partner.bunq.com",
};

// ─── Session State ─────────────────────────────────────────────────────────────

interface SessionState {
  privateKeyPem: string;
  publicKeyPem: string;
  installationToken: string;
  sessionToken: string;
  userId: number;
  serverPublicKey: string;
}

// ─── Response parsing ──────────────────────────────────────────────────────────

/** bunq wraps all responses in { Response: [ { TypeName: {...} }, ... ] } */
function parseResponse(body: Record<string, unknown>): Record<string, unknown> {
  const items = body.Response as Array<Record<string, unknown>>;
  if (!Array.isArray(items)) return body;
  const merged: Record<string, unknown> = {};
  for (const item of items) {
    for (const [k, v] of Object.entries(item)) {
      if (k in merged) {
        // Multiple items of same type — store as array
        if (!Array.isArray(merged[k])) merged[k] = [merged[k]];
        (merged[k] as unknown[]).push(v);
      } else {
        merged[k] = v;
      }
    }
  }
  return merged;
}

// ─── BunqClient ────────────────────────────────────────────────────────────────

export class BunqClient {
  private env: BunqEnv;
  private apiKey: string;
  private baseUrl: string;
  private session: SessionState | null = null;

  constructor(apiKey: string, env: BunqEnv = "sandbox") {
    this.apiKey = apiKey;
    this.env = env;
    this.baseUrl = BASE_URLS[env];
  }

  // ── Crypto helpers ──────────────────────────────────────────────────────────

  private generateKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    return { privateKeyPem: privateKey, publicKeyPem: publicKey };
  }

  /** bunq uses RSA-SHA256 signature over the request body */
  private signBody(body: string, privateKeyPem: string): string {
    const sign = crypto.createSign("SHA256");
    sign.update(body);
    sign.end();
    return sign.sign(privateKeyPem, "base64");
  }

  // ── Headers ─────────────────────────────────────────────────────────────────

  private commonHeaders(authToken: string, bodyStr: string, privateKeyPem?: string) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "User-Agent": "bunq-partner-mcp/1.0",
      "X-Bunq-Language": "en_US",
      "X-Bunq-Region": "nl_NL",
      "X-Bunq-Client-Request-Id": randomUUID(),
      "X-Bunq-Geolocation": "0 0 0 0 NL",
      "X-Bunq-Client-Authentication": authToken,
    };
    if (privateKeyPem && bodyStr) {
      headers["X-Bunq-Client-Signature"] = this.signBody(bodyStr, privateKeyPem);
    }
    return headers;
  }

  // ── Raw HTTP ────────────────────────────────────────────────────────────────

  private async request(
    method: string,
    path: string,
    body: Record<string, unknown> | null,
    authToken: string,
    privateKeyPem?: string
  ): Promise<Record<string, unknown>> {
    const bodyStr = body ? JSON.stringify(body) : "";
    const headers = this.commonHeaders(authToken, bodyStr, privateKeyPem);

    const res = await fetch(`${this.baseUrl}/v1${path}`, {
      method,
      headers,
      body: bodyStr || undefined,
    });

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const errs = json.Error as Array<Record<string, string>> | undefined;
      const msg = errs?.[0]?.error_description ?? JSON.stringify(json);
      throw new Error(`bunq API error ${res.status}: ${msg}`);
    }

    return parseResponse(json);
  }

  // ── Auth flow ───────────────────────────────────────────────────────────────

  /** Full auth bootstrap: installation → device-server → session-server */
  async ensureSession(): Promise<void> {
    if (this.session) return;

    const { privateKeyPem, publicKeyPem } = this.generateKeyPair();

    // 1. Installation
    const installRes = await fetch(`${this.baseUrl}/v1/installation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "User-Agent": "bunq-partner-mcp/1.0",
        "X-Bunq-Language": "en_US",
        "X-Bunq-Region": "nl_NL",
        "X-Bunq-Client-Request-Id": randomUUID(),
      },
      body: JSON.stringify({ client_public_key: publicKeyPem }),
    });

    if (!installRes.ok) {
      const err = await installRes.text();
      throw new Error(`Installation failed (${installRes.status}): ${err}`);
    }

    const installJson = parseResponse((await installRes.json()) as Record<string, unknown>);
    const installationToken = (installJson.Token as { token: string }).token;
    const serverPublicKey = (installJson.ServerPublicKey as { server_public_key: string }).server_public_key;

    // 2. Device Server
    await this.request(
      "POST",
      "/device-server",
      { description: "bunq-partner-mcp", secret: this.apiKey, permitted_ips: ["*"] },
      installationToken,
      privateKeyPem
    );

    // 3. Session Server
    const sessionRes = await this.request(
      "POST",
      "/session-server",
      { secret: this.apiKey },
      installationToken,
      privateKeyPem
    );

    const sessionToken = (sessionRes.Token as { token: string }).token;

    // Extract user ID — could be UserCompany, UserPerson, or UserApiKey
    const userObj =
      (sessionRes.UserCompany as { id: number } | undefined) ||
      (sessionRes.UserPerson as { id: number } | undefined) ||
      (sessionRes.UserApiKey as { id: number } | undefined);
    const userId = userObj?.id ?? 0;

    this.session = {
      privateKeyPem,
      publicKeyPem,
      installationToken,
      sessionToken,
      userId,
      serverPublicKey,
    };
  }

  /** Re-creates the session (e.g. after expiry) */
  async refreshSession(): Promise<void> {
    this.session = null;
    await this.ensureSession();
  }

  // ── Authenticated API call ──────────────────────────────────────────────────

  async call(
    method: string,
    path: string,
    body: Record<string, unknown> | null = null
  ): Promise<Record<string, unknown>> {
    await this.ensureSession();
    const s = this.session!;
    try {
      return await this.request(method, path, body, s.sessionToken, s.privateKeyPem);
    } catch (err) {
      // On 401/403, refresh and retry once
      if (err instanceof Error && /40[13]/.test(err.message)) {
        await this.refreshSession();
        const s2 = this.session!;
        return await this.request(method, path, body, s2.sessionToken, s2.privateKeyPem);
      }
      throw err;
    }
  }

  /**
   * Creates a session using a provisioned user's credential.token_value.
   * Used by create_user_session — this does NOT use the partner's session,
   * it authenticates as the provisioned user directly.
   */
  async callWithKey(
    credentialToken: string,
    method: string,
    path: string,
    body: Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    // For session-server we need a fresh key pair and installation first,
    // then create device-server and session using the user's credential token.
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    // Installation for the user's key
    const installRes = await fetch(`${this.baseUrl}/v1/installation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "User-Agent": "bunq-partner-mcp/1.0",
        "X-Bunq-Language": "en_US",
        "X-Bunq-Region": "nl_NL",
        "X-Bunq-Client-Request-Id": randomUUID(),
      },
      body: JSON.stringify({ client_public_key: publicKey }),
    });

    if (!installRes.ok) {
      const err = await installRes.text();
      throw new Error(`User installation failed (${installRes.status}): ${err}`);
    }

    const installJson = parseResponse((await installRes.json()) as Record<string, unknown>);
    const installToken = (installJson.Token as { token: string }).token;

    // Device server for the user
    await this.request(
      "POST",
      "/device-server",
      { description: "bunq-partner-mcp-user", secret: credentialToken, permitted_ips: ["*"] },
      installToken,
      privateKey
    );

    // Now create the session — this is what the caller actually wanted
    const sessionRes = await this.request(
      "POST",
      "/session-server",
      { secret: credentialToken },
      installToken,
      privateKey
    );

    return sessionRes;
  }

  /**
   * Uploads a file attachment using the correct binary Content-Type approach.
   * bunq requires raw binary body with Content-Type and X-Bunq-Attachment-Description headers.
   */
  async callAttachment(
    userId: number,
    description: string,
    contentType: string,
    base64Content: string
  ): Promise<Record<string, unknown>> {
    await this.ensureSession();
    const s = this.session!;

    const binaryBuffer = Buffer.from(base64Content, "base64");
    const sign = crypto.createSign("SHA256");
    sign.update(binaryBuffer);
    sign.end();
    const signature = sign.sign(s.privateKeyPem, "base64");

    const res = await fetch(`${this.baseUrl}/v1/user/${userId}/attachment`, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
        "User-Agent": "bunq-partner-mcp/1.0",
        "X-Bunq-Language": "en_US",
        "X-Bunq-Region": "nl_NL",
        "X-Bunq-Client-Request-Id": randomUUID(),
        "X-Bunq-Client-Authentication": s.sessionToken,
        "X-Bunq-Client-Signature": signature,
        "X-Bunq-Attachment-Description": description,
      },
      body: binaryBuffer,
    });

    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const errs = json.Error as Array<Record<string, string>> | undefined;
      const msg = errs?.[0]?.error_description ?? JSON.stringify(json);
      throw new Error(`Attachment upload error ${res.status}: ${msg}`);
    }
    return parseResponse(json);
  }

  // ── Convenience getters ─────────────────────────────────────────────────────

  get currentUserId(): number {
    return this.session?.userId ?? 0;
  }

  get environment(): BunqEnv {
    return this.env;
  }

  get isAuthenticated(): boolean {
    return this.session !== null;
  }
}
