import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { BunqApiError, BunqClient, BunqSessionMissingError } from "../src/bunq-client.ts";
import { StateStoreFile } from "../src/state-store.ts";
import {
  createFakeBunq,
  PARTNER_USER_ID,
  PROVISIONED_USER_API_KEY_ID,
  PROVISIONED_USER_ID,
} from "./fake-bunq.ts";

const API_KEY = "sandbox_partner_key";
const CREDENTIAL_TOKEN = "credential_of_user";

function createClient(fake = createFakeBunq(API_KEY), options: { stateFile?: string; apiKey?: string } = {}) {
  const client = new BunqClient(options.apiKey ?? API_KEY, "sandbox", {
    fetch: fake.fetch,
    stateStore: options.stateFile ? new StateStoreFile(options.stateFile) : undefined,
  });
  return { client, fake };
}

test("partner session: installation, device-server and session-server, then a signed call", async () => {
  const { client, fake } = createClient();

  await client.call("POST", "/partner-user-provision", { email: "a@b.c" });

  assert.deepEqual(
    fake.allCall.map((c) => `${c.method} ${c.path}`),
    ["POST /v1/installation", "POST /v1/device-server", "POST /v1/session-server", "POST /v1/partner-user-provision"]
  );
  assert.equal(client.currentUserId, PARTNER_USER_ID);
  assert.match(fake.allCall[3].headers["X-Bunq-Client-Authentication"], /^session-sandbox_partner_key-/);
});

test("create_user_session keeps the token inside the client and returns the granting user id", async () => {
  const { client } = createClient();

  const result = await client.createUserSession(CREDENTIAL_TOKEN);

  assert.deepEqual(result, { userId: PROVISIONED_USER_ID, userApiKeyId: PROVISIONED_USER_API_KEY_ID });
  assert.equal(JSON.stringify(result).includes("session-"), false);
});

test("callForUser uses the provisioned user's own session, also for the user_api_key_id", async () => {
  const { client, fake } = createClient();
  await client.createUserSession(CREDENTIAL_TOKEN);

  await client.callForUser(PROVISIONED_USER_ID, "GET", `/user/${PROVISIONED_USER_ID}/card`);
  await client.callForUser(PROVISIONED_USER_API_KEY_ID, "POST", `/user/${PROVISIONED_USER_API_KEY_ID}/notification-filter-url`, {
    notification_filters: [],
  });

  for (const c of fake.allCall.slice(-2)) {
    assert.match(c.headers["X-Bunq-Client-Authentication"], /^session-credential_of_user-/);
  }
});

test("callForUser uses the partner session for the partner's own user id", async () => {
  const { client, fake } = createClient();

  await client.callForUser(PARTNER_USER_ID, "GET", `/user/${PARTNER_USER_ID}/notification-filter-failure`);

  assert.match(fake.allCall.at(-1)!.headers["X-Bunq-Client-Authentication"], /^session-sandbox_partner_key-/);
});

test("callForUser without a session for that user fails with a clear error", async () => {
  const { client } = createClient();

  await assert.rejects(client.callForUser(12345, "GET", "/user/12345/card"), BunqSessionMissingError);
});

test("a 401 renews the session and retries once", async () => {
  const fake = createFakeBunq(API_KEY);
  let countCard = 0;
  fake.route((c) => {
    if (c.path === "/v1/user/100/card") {
      countCard += 1;
      return countCard === 1 ? { status: 401, json: { Error: [{ error_description: "expired" }] }, isSigned: false } : undefined;
    } else {
      return undefined;
    }
  });
  const { client } = createClient(fake);

  await client.callForUser(PARTNER_USER_ID, "GET", "/user/100/card");

  assert.equal(countCard, 2);
  assert.equal(fake.callsTo("/v1/session-server").length, 2);
});

test("a 403 is not retried", async () => {
  const fake = createFakeBunq(API_KEY);
  fake.route((c) =>
    c.path === "/v1/user/100/card"
      ? { status: 403, json: { Error: [{ error_description: "no access" }] }, isSigned: false }
      : undefined
  );
  const { client } = createClient(fake);

  await assert.rejects(client.callForUser(PARTNER_USER_ID, "GET", "/user/100/card"), (e: unknown) => {
    assert.ok(e instanceof BunqApiError);
    assert.equal(e.status, 403);
    assert.match(e.message, /no access/);
    return true;
  });
  assert.equal(fake.callsTo("/v1/user/100/card").length, 1);
});

test("a non-JSON response keeps the HTTP status", async () => {
  const fake = createFakeBunq(API_KEY);
  fake.route((c) => (c.path === "/v1/user/100/card" ? { status: 502, text: "<html>Bad gateway</html>", isSigned: false } : undefined));
  const { client } = createClient(fake);

  await assert.rejects(client.callForUser(PARTNER_USER_ID, "GET", "/user/100/card"), (e: unknown) => {
    assert.ok(e instanceof BunqApiError);
    assert.equal(e.status, 502);
    assert.match(e.message, /non-JSON.*Bad gateway/);
    return true;
  });
});

test("a response with a wrong server signature is refused", async () => {
  const fake = createFakeBunq(API_KEY);
  fake.route((c) => (c.path === "/v1/user/100/card" ? { json: { Response: [] }, isSignatureBroken: true } : undefined));
  const { client } = createClient(fake);

  await assert.rejects(client.callForUser(PARTNER_USER_ID, "GET", "/user/100/card"), /signature is not valid/);
});

test("a successful response without a server signature is refused", async () => {
  const fake = createFakeBunq(API_KEY);
  fake.route((c) => (c.path === "/v1/user/100/card" ? { json: { Response: [] }, isSigned: false } : undefined));
  const { client } = createClient(fake);

  await assert.rejects(client.callForUser(PARTNER_USER_ID, "GET", "/user/100/card"), /no X-Bunq-Server-Signature/);
});

test("state file: a restart reuses the installation and the user sessions", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bunq-mcp-"));
  const stateFile = path.join(dir, "state.json");
  const fake = createFakeBunq(API_KEY);
  const first = createClient(fake, { stateFile });
  await first.client.ensureSession();
  await first.client.createUserSession(CREDENTIAL_TOKEN);
  const countCallBeforeRestart = fake.allCall.length;

  const second = createClient(fake, { stateFile });
  await second.client.callForUser(PROVISIONED_USER_ID, "GET", `/user/${PROVISIONED_USER_ID}/card`);

  assert.deepEqual(
    fake.allCall.slice(countCallBeforeRestart).map((c) => c.path),
    [`/v1/user/${PROVISIONED_USER_ID}/card`]
  );
  assert.equal(fs.statSync(stateFile).mode & 0o777, 0o600);
});

test("state file of another API key is not reused", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bunq-mcp-"));
  const stateFile = path.join(dir, "state.json");
  await createClient(createFakeBunq(API_KEY), { stateFile }).client.ensureSession();

  const other = createClient(createFakeBunq("other_key"), { stateFile, apiKey: "other_key" });
  await other.client.ensureSession();

  assert.equal(other.fake.callsTo("/v1/installation").length, 1);
});

test("an encrypted GET sends no body", async () => {
  const { client, fake } = createClient();

  await client.callForUser(PARTNER_USER_ID, "GET", "/user/100/card/1", null, true);

  assert.equal(fake.allCall.at(-1)!.body.length, 0);
});

test("parallel calls on a fresh client share one installation", async () => {
  const { client, fake } = createClient();

  await Promise.all([1, 2, 3].map(() => client.call("GET", "/partner-user-provision")));

  assert.equal(fake.callsTo("/v1/installation").length, 1);
  assert.equal(fake.callsTo("/v1/session-server").length, 1);
});

test("parallel 401s share one session renewal", async () => {
  const fake = createFakeBunq(API_KEY);
  const allTokenRefused = new Set<string>();
  fake.route((c) => {
    if (c.path.startsWith("/v1/user/100/card")) {
      const token = c.headers["X-Bunq-Client-Authentication"];
      if (allTokenRefused.size === 0 || allTokenRefused.has(token)) {
        allTokenRefused.add(token);
        return { status: 401, json: { Error: [{ error_description: "expired" }] }, isSigned: false };
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  });
  const { client } = createClient(fake);
  await client.ensureSession();

  await Promise.all([1, 2, 3].map((n) => client.callForUser(PARTNER_USER_ID, "GET", `/user/100/card/${n}`)));

  assert.equal(fake.callsTo("/v1/session-server").length, 2);
});

test("a 500 during renewal keeps the installation and the error", async () => {
  const fake = createFakeBunq(API_KEY);
  let countSession = 0;
  fake.route((c) => {
    if (c.path === "/v1/session-server") {
      countSession += 1;
      return countSession > 1 ? { status: 500, json: { Error: [{ error_description: "server busy" }] }, isSigned: false } : undefined;
    } else if (c.path === "/v1/user/100/card") {
      return { status: 401, json: { Error: [{ error_description: "expired" }] }, isSigned: false };
    } else {
      return undefined;
    }
  });
  const { client } = createClient(fake);

  await assert.rejects(client.callForUser(PARTNER_USER_ID, "GET", "/user/100/card"), /500: server busy/);
  assert.equal(fake.callsTo("/v1/installation").length, 1);
});

test("a signed error response with a wrong signature is refused", async () => {
  const fake = createFakeBunq(API_KEY);
  fake.route((c) =>
    c.path === "/v1/user/100/card"
      ? { status: 400, json: { Error: [{ error_description: "fake" }] }, isSignatureBroken: true }
      : undefined
  );
  const { client } = createClient(fake);

  await assert.rejects(client.callForUser(PARTNER_USER_ID, "GET", "/user/100/card"), /signature is not valid/);
});

test("state file: two processes keep each other's user sessions", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bunq-mcp-"));
  const stateFile = path.join(dir, "state.json");
  const fake = createFakeBunq(API_KEY);
  const first = createClient(fake, { stateFile });
  const second = createClient(fake, { stateFile });

  await first.client.createUserSession("credential_a");
  await second.client.ensureSession();

  const stored = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  assert.equal(Object.keys(stored.users).length, 1);
  assert.ok(stored.partner);
});

test("state file of another environment or key stays untouched", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bunq-mcp-"));
  const stateFile = path.join(dir, "state.json");
  const bindingSandbox = { env: "sandbox", apiKeyHash: "aaa" };
  const fakeA = createFakeBunq(API_KEY);
  await new BunqClient(API_KEY, "sandbox", { fetch: fakeA.fetch, stateStore: new StateStoreFile(stateFile, bindingSandbox) }).ensureSession();
  const contentBefore = fs.readFileSync(stateFile, "utf8");

  const fakeB = createFakeBunq("other_key");
  const other = new BunqClient("other_key", "sandbox", {
    fetch: fakeB.fetch,
    stateStore: new StateStoreFile(stateFile, { env: "sandbox", apiKeyHash: "bbb" }),
  });
  await other.ensureSession();

  assert.equal(fs.readFileSync(stateFile, "utf8"), contentBefore);
});
