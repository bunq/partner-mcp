import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { OPERATIONS } from "../src/operations.ts";
import { determineAllToolNameCustom } from "../src/handler.ts";
import { TOOLS } from "../src/tools.ts";

// Keeps partner-api-swagger.yaml, src/tools.ts and src/operations.ts in step.
// The swagger is what partners read (GitBook renders it), so every tool must be in it,
// and every swagger operation must be a tool or be listed below with a reason.

const SWAGGER_FILE = new URL("../partner-api-swagger.yaml", import.meta.url);

/** Swagger operations that are part of the auth handshake, which the client does itself. */
const SWAGGER_OPERATION_NOT_A_TOOL = new Set([
  "POST /installation",
  "GET /installation",
  "POST /device-server",
  "GET /device-server",
  "POST /session-server",
]);

/** Custom tools and the swagger operation each one calls. */
const TOOL_CUSTOM_OPERATION: Record<string, string | null> = {
  get_session_info: null,
  refresh_session: null,
  create_user_session: "POST /session-server",
  upload_attachment: "POST /user/{}/attachment",
};

/** Swagger operations that have no tool yet. Remove an entry when its tool is added. */
const KNOWN_GAP_TOOL = new Set<string>([
  "GET /user/{}/challenge-request",
  "GET /user/{}/challenge-request/{}",
  "PUT /user/{}/challenge-request/{}",
  "GET /user/{}/monetary-account-bank",
  "GET /user/{}/monetary-account-bank/{}",
  "GET /user/{}/monetary-account-external",
  "GET /user/{}/monetary-account-external/{}",
  "PUT /user/{}/monetary-account-external/{}",
  "GET /user/{}/monetary-account/{}/mastercard-action",
  "GET /user/{}/monetary-account/{}/mastercard-action/{}",
  "GET /user/{}/notification-filter-url",
  "GET /user/{}/user-onboarding",
  "GET /user/{}/user-onboarding/{}",
  "POST /user/{}/user-onboarding",
  "PUT /user/{}/user-onboarding/{}",
  "PUT /user/{}/oauth-client/{}",
  "PUT /user/{}/card/{}/generated-cvc2/{}",
]);

/** Tool operations that the swagger does not document yet. Remove an entry when the path is added. */
const KNOWN_GAP_SWAGGER = new Set<string>([
  "POST /user/{}/address-main",
  "POST /user/{}/address-postal",
  "PUT /user-person/{}",
  "POST /user/{}/tax-resident",
  "POST /user/{}/nationality",
  "POST /user/{}/identity-verification-session",
  "GET /user/{}/identity-verification-session/{}",
  "PUT /user/{}/identity-verification-session/{}",
  "POST /user/{}/document-identification",
  "GET /user/{}/monetary-account",
  "GET /user/{}/monetary-account/{}",
]);

function normalize(method: string, path: string): string {
  return `${method.toUpperCase()} ${path.split("?")[0].replace(/\{[^}]+\}/g, "{}")}`;
}

function readSwaggerOperations(): Set<string> {
  const allOperation = new Set<string>();
  let pathCurrent: string | null = null;
  for (const line of fs.readFileSync(SWAGGER_FILE, "utf8").split("\n")) {
    const matchPath = /^  (\/[^:\s]*):\s*$/.exec(line);
    const matchMethod = /^    (get|post|put|delete|patch):\s*$/.exec(line);
    if (matchPath) {
      pathCurrent = matchPath[1];
    } else if (matchMethod && pathCurrent) {
      allOperation.add(normalize(matchMethod[1], pathCurrent));
    } else if (/^\S/.test(line)) {
      pathCurrent = null;
    } else {
      // A line inside an operation.
    }
  }
  return allOperation;
}

function readToolOperations(): Set<string> {
  const allOperation = new Set<string>();
  for (const operation of Object.values(OPERATIONS)) {
    allOperation.add(normalize(operation.method, operation.path));
  }
  for (const operation of Object.values(TOOL_CUSTOM_OPERATION)) {
    if (operation) allOperation.add(operation);
  }
  return allOperation;
}

test("every tool has exactly one implementation, and every implementation has a tool", () => {
  const allToolName = TOOLS.map((t) => t.name);
  const allCustom = determineAllToolNameCustom();
  const allOperationName = Object.keys(OPERATIONS);

  assert.equal(new Set(allToolName).size, allToolName.length, "duplicate tool name");
  for (const name of allToolName) {
    const countImplementation = Number(allCustom.includes(name)) + Number(allOperationName.includes(name));
    assert.equal(countImplementation, 1, `tool ${name} needs exactly one of OPERATIONS or TOOL_CUSTOM`);
  }
  for (const name of [...allCustom, ...allOperationName]) {
    assert.ok(allToolName.includes(name), `${name} is implemented but has no tool definition`);
  }
  assert.deepEqual(new Set(allCustom), new Set(Object.keys(TOOL_CUSTOM_OPERATION)));
});

test("every tool operation is documented in the swagger", () => {
  const allSwagger = readSwaggerOperations();
  const allMissing = [...readToolOperations()].filter((op) => allSwagger.has(op) === false && KNOWN_GAP_SWAGGER.has(op) === false);

  assert.deepEqual(allMissing, [], "add these paths to partner-api-swagger.yaml");
});

test("every swagger operation is a tool, part of the auth handshake, or a known gap", () => {
  const allTool = readToolOperations();
  const allMissing = [...readSwaggerOperations()].filter(
    (op) => allTool.has(op) === false && SWAGGER_OPERATION_NOT_A_TOOL.has(op) === false && KNOWN_GAP_TOOL.has(op) === false
  );

  assert.deepEqual(allMissing, [], "add a tool for these swagger operations, or list them with a reason");
});

test("the known-gap lists hold only real gaps", () => {
  const allSwagger = readSwaggerOperations();
  const allTool = readToolOperations();

  assert.deepEqual([...KNOWN_GAP_TOOL].filter((op) => allTool.has(op)), [], "these now have a tool: remove them from KNOWN_GAP_TOOL");
  assert.deepEqual([...KNOWN_GAP_TOOL].filter((op) => allSwagger.has(op) === false), [], "not in the swagger at all");
  assert.deepEqual([...KNOWN_GAP_SWAGGER].filter((op) => allSwagger.has(op)), [], "now in the swagger: remove them from KNOWN_GAP_SWAGGER");
});
