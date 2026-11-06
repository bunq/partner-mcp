import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { parse } from "yaml";
import { OPERATIONS } from "../src/operations.ts";
import { determineAllToolNameCustom } from "../src/handler.ts";
import { TOOLS } from "../src/tools.ts";

// Keeps partner-api-swagger.yaml, src/tools.ts and src/operations.ts in step.
// The swagger is what partners read (GitBook renders it), so every tool must be in it,
// every swagger operation must be a tool or be listed below with a reason, and every body
// field and query parameter a tool sends must be documented.

const SWAGGER_FILE = new URL("../partner-api-swagger.yaml", import.meta.url);
const METHODS = ["get", "post", "put", "delete", "patch"];

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
const KNOWN_GAP_TOOL = new Set<string>([]);

/** Tool operations that the swagger does not document yet. Remove an entry when the path is added. */
const KNOWN_GAP_SWAGGER = new Set<string>([]);

interface SwaggerOperation {
  parameters?: Array<{ name?: string; in?: string }>;
  requestBody?: { content?: Record<string, { schema?: { properties?: Record<string, unknown> } }> };
}

function normalize(method: string, path: string): string {
  return `${method.toUpperCase()} ${path.split("?")[0].replace(/\{[^}]+\}/g, "{}")}`;
}

function readSwaggerOperations(): Map<string, SwaggerOperation> {
  const swagger = parse(fs.readFileSync(SWAGGER_FILE, "utf8"), { maxAliasCount: -1 }) as {
    paths: Record<string, Record<string, SwaggerOperation>>;
  };
  const allOperation = new Map<string, SwaggerOperation>();
  for (const [path, item] of Object.entries(swagger.paths)) {
    for (const method of METHODS.filter((m) => m in item)) {
      allOperation.set(normalize(method, path), item[method]);
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

/** Arguments with a sample value of the right type for every property, so a body builder emits every field. */
function createArgsSample(toolName: string): Record<string, unknown> {
  const tool = TOOLS.find((t) => t.name === toolName)!;
  const sample: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(tool.inputSchema.properties as Record<string, { type?: string; enum?: string[] }>)) {
    const byType: Record<string, unknown> = { number: 1, string: "x", array: ["x"], object: { x: 1 }, boolean: true };
    sample[name] = schema.enum ? schema.enum[0] : byType[schema.type ?? "string"];
  }
  return sample;
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
  const allMissing = [...readSwaggerOperations().keys()].filter(
    (op) => allTool.has(op) === false && SWAGGER_OPERATION_NOT_A_TOOL.has(op) === false && KNOWN_GAP_TOOL.has(op) === false
  );

  assert.deepEqual(allMissing, [], "add a tool for these swagger operations, or list them with a reason");
});

test("every body field and query parameter a tool sends is in the swagger", () => {
  const allSwagger = readSwaggerOperations();
  const allMissing: string[] = [];

  for (const [name, operation] of Object.entries(OPERATIONS)) {
    const swaggerOperation = allSwagger.get(normalize(operation.method, operation.path));
    if (swaggerOperation === undefined) continue;

    const allSwaggerField = Object.keys(swaggerOperation.requestBody?.content?.["application/json"]?.schema?.properties ?? {});
    const allBodyField = Object.keys(operation.body ? operation.body(createArgsSample(name)) : {});
    for (const field of allBodyField.filter((f) => allSwaggerField.includes(f) === false)) {
      allMissing.push(`${name}: body field ${field}`);
    }

    const allSwaggerQuery = (swaggerOperation.parameters ?? []).filter((p) => p.in === "query").map((p) => p.name);
    for (const query of (operation.query ?? []).filter((q) => allSwaggerQuery.includes(q) === false)) {
      allMissing.push(`${name}: query parameter ${query}`);
    }
  }

  assert.deepEqual(allMissing, [], "document these in partner-api-swagger.yaml, or stop sending them");
});

test("the known-gap lists hold only real gaps", () => {
  const allSwagger = readSwaggerOperations();
  const allTool = readToolOperations();

  assert.deepEqual([...KNOWN_GAP_TOOL].filter((op) => allTool.has(op)), [], "these now have a tool: remove them from KNOWN_GAP_TOOL");
  assert.deepEqual([...KNOWN_GAP_TOOL].filter((op) => allSwagger.has(op) === false), [], "not in the swagger at all");
  assert.deepEqual([...KNOWN_GAP_SWAGGER].filter((op) => allSwagger.has(op)), [], "now in the swagger: remove them from KNOWN_GAP_SWAGGER");
});
