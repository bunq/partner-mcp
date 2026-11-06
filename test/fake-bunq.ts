import crypto from "crypto";

// A minimal bunq API stand-in for tests. It answers installation, device-server and
// session-server like the real API, signs every response after installation with its
// server key (as core ViewPostProcessorAuthentication does), and checks the client
// request signature.

export const PARTNER_USER_ID = 100;
export const PROVISIONED_USER_ID = 500;
export const PROVISIONED_USER_API_KEY_ID = 900;

export interface FakeCall {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: Buffer;
}

export interface FakeReply {
  status?: number;
  json?: unknown;
  text?: string;
  isSigned?: boolean;
  isSignatureBroken?: boolean;
}

export type FakeRoute = (call: FakeCall) => FakeReply | undefined;

export function createFakeBunq(apiKeyPartner: string) {
  const { privateKey: serverPrivateKey, publicKey: serverPublicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const allCall: FakeCall[] = [];
  const clientKeyByInstallationToken = new Map<string, string>();
  const allRoute: FakeRoute[] = [];
  let counter = 0;

  function reply(call: FakeCall): FakeReply {
    for (const route of allRoute) {
      const result = route(call);
      if (result) return result;
    }

    if (call.method === "POST" && call.path === "/v1/installation") {
      counter += 1;
      const token = `installation-${counter}`;
      clientKeyByInstallationToken.set(token, JSON.parse(call.body.toString()).client_public_key);
      return {
        isSigned: false,
        json: {
          Response: [{ Id: { id: counter } }, { Token: { token } }, { ServerPublicKey: { server_public_key: serverPublicKey } }],
        },
      };
    } else if (call.method === "POST" && call.path === "/v1/device-server") {
      return { json: { Response: [{ Id: { id: 1 } }] } };
    } else if (call.method === "POST" && call.path === "/v1/session-server") {
      counter += 1;
      const secret = JSON.parse(call.body.toString()).secret;
      const user =
        secret === apiKeyPartner
          ? { UserCompany: { id: PARTNER_USER_ID } }
          : { UserApiKey: { id: PROVISIONED_USER_API_KEY_ID, granted_by_user: { UserPerson: { id: PROVISIONED_USER_ID } } } };
      return { json: { Response: [{ Id: { id: counter } }, { Token: { token: `session-${secret}-${counter}` } }, user] } };
    } else {
      return { json: { Response: [{ Id: { id: 1 } }] } };
    }
  }

  function assertRequestSignatureValid(call: FakeCall): void {
    const signature = call.headers["X-Bunq-Client-Signature"];
    if (call.body.length > 0 && call.headers["X-Bunq-Client-Authentication"]) {
      const isValid = [...clientKeyByInstallationToken.values()].some((key) =>
        crypto.verify("sha256", call.body, key, Buffer.from(signature ?? "", "base64"))
      );
      if (isValid) {
        // Signature matches one of the installed client keys.
      } else {
        throw new Error(`fake bunq: bad client signature on ${call.method} ${call.path}`);
      }
    } else {
      // Unauthenticated or empty-body requests carry no signature.
    }
  }

  const fetchFake: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const call: FakeCall = {
      method: init?.method ?? "GET",
      path: url.pathname + url.search,
      headers: { ...(init?.headers as Record<string, string>) },
      body: init?.body ? Buffer.from(init.body as Uint8Array) : Buffer.alloc(0),
    };
    allCall.push(call);
    assertRequestSignatureValid(call);

    const result = reply(call);
    const bodyText = result.text ?? JSON.stringify(result.json ?? {});
    const headers = new Headers();
    if (result.isSigned ?? true) {
      const signature = crypto.sign("sha256", Buffer.from(bodyText), serverPrivateKey);
      if (result.isSignatureBroken) signature[0] ^= 0xff;
      headers.set("X-Bunq-Server-Signature", signature.toString("base64"));
    } else {
      // Installation responses are not signed.
    }
    return new Response(bodyText, { status: result.status ?? 200, headers });
  };

  return {
    fetch: fetchFake,
    allCall,
    route(route: FakeRoute) {
      allRoute.push(route);
    },
    callsTo(path: string) {
      return allCall.filter((c) => c.path === path);
    },
  };
}
