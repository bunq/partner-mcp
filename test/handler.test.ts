import { test } from "node:test";
import assert from "node:assert/strict";
import { BunqClient } from "../src/bunq-client.ts";
import { buildPath, handleTool, validateArgs } from "../src/handler.ts";
import { OPERATIONS } from "../src/operations.ts";
import { TOOLS } from "../src/tools.ts";
import { createFakeBunq, PARTNER_USER_ID, PROVISIONED_USER_ID } from "./fake-bunq.ts";

const API_KEY = "sandbox_partner_key";
const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

function createClient() {
  const fake = createFakeBunq(API_KEY);
  return { fake, client: new BunqClient(API_KEY, "sandbox", { fetch: fake.fetch }) };
}

test("every path placeholder of every operation is a tool argument", () => {
  for (const [name, operation] of Object.entries(OPERATIONS)) {
    const tool = TOOL_BY_NAME.get(name)!;
    const allPlaceholder = [...operation.path.matchAll(/\{([a-z_0-9]+)\}/g)].map((m) => m[1]);
    for (const placeholder of allPlaceholder.filter((p) => p !== "partner_user_id")) {
      assert.ok(placeholder in tool.inputSchema.properties, `${name}: path needs ${placeholder}`);
      assert.ok((tool.inputSchema.required as readonly string[]).includes(placeholder), `${name}: ${placeholder} must be required`);
    }
    if (operation.scope === "user") {
      assert.equal(allPlaceholder[0], "user_id", `${name}: a user-scope path starts with {user_id}`);
    } else {
      // Partner scope uses the partner's own session.
    }
  }
});

test("missing required argument is refused before any API call", async () => {
  const { client, fake } = createClient();

  await assert.rejects(handleTool("get_card", { user_id: 1 }, client), /Missing required argument for get_card: card_id/);
  assert.equal(fake.allCall.length, 0);
});

test("a numeric string becomes a number; a non-number is refused", () => {
  const tool = TOOL_BY_NAME.get("get_card")!;

  assert.deepEqual(validateArgs(tool, { user_id: "5", card_id: 7 }), { user_id: 5, card_id: 7 });
  assert.throws(() => validateArgs(tool, { user_id: "abc", card_id: 7 }), /must be a number/);
});

test("buildPath fills placeholders, the partner id, and only present query arguments", () => {
  assert.equal(buildPath(OPERATIONS.get_payment, { user_id: 5, account_id: 6, payment_id: 7 }, 100), "/user/5/monetary-account/6/payment/7");
  assert.equal(buildPath(OPERATIONS.get_oauth_client, { oauth_client_id: 3 }, 100), "/user/100/oauth-client/3");
  assert.equal(buildPath(OPERATIONS.list_provisions, { status: "ACTIVE", external_uuid: "" }, 100), "/partner-user-provision?status=ACTIVE");
});

test("create_user_session returns ids and no token", async () => {
  const { client } = createClient();

  const result = (await handleTool("create_user_session", { credential_token: "cred" }, client)) as Record<string, unknown>;

  assert.equal(result.user_id, PROVISIONED_USER_ID);
  assert.equal(JSON.stringify(result).includes("session-"), false);
});

test("a per-user tool sends the documented request with the provisioned user's session", async () => {
  const { client, fake } = createClient();
  await handleTool("create_user_session", { credential_token: "cred" }, client);

  await handleTool(
    "create_payment",
    { user_id: PROVISIONED_USER_ID, account_id: 6, amount: "1.00", description: "Test", counterparty_iban: "NL00BUNQ0000000000" },
    client
  );

  const call = fake.allCall.at(-1)!;
  assert.equal(`${call.method} ${call.path}`, `POST /v1/user/${PROVISIONED_USER_ID}/monetary-account/6/payment`);
  assert.match(call.headers["X-Bunq-Client-Authentication"], /^session-cred-/);
  assert.deepEqual(JSON.parse(call.body.toString()), {
    amount: { value: "1.00", currency: "EUR" },
    counterparty_alias: { type: "IBAN", value: "NL00BUNQ0000000000", name: "" },
    description: "Test",
  });
});

test("an OAuth tool uses the partner's own user id in the path", async () => {
  const { client, fake } = createClient();

  await handleTool("list_oauth_clients", {}, client);

  assert.equal(fake.allCall.at(-1)!.path, `/v1/user/${PARTNER_USER_ID}/oauth-client`);
});
