import { test } from "node:test";
import assert from "node:assert/strict";
// handler.ts uses ".js" runtime imports, which the strip-types runner cannot
// remap to ".ts". So this wiring test runs against the compiled output. The
// "npm test" script builds first. Type-only imports may still point at source.
import { handleTool } from "../dist/handler.js";
import { TOOLS } from "../dist/tools.js";
import type { BunqClient } from "../src/bunq-client.ts";

// The knowledge tools never touch the client, so a null client is safe here.
const NO_CLIENT = null as unknown as BunqClient;

test("tools list exposes the three knowledge tools", () => {
  const nameAll = TOOLS.map((t) => t.name);
  assert.ok(nameAll.includes("search_knowledge"));
  assert.ok(nameAll.includes("list_topics"));
  assert.ok(nameAll.includes("get_topic"));
});

test("list_topics returns the seeded kyc topic", async () => {
  const result = (await handleTool("list_topics", {}, NO_CLIENT)) as {
    topic_all: Array<{ slug: string }>;
  };
  assert.ok(result.topic_all.some((t) => t.slug === "kyc"));
});

test("get_topic returns the full body for a known slug", async () => {
  const result = (await handleTool("get_topic", { slug: "kyc" }, NO_CLIENT)) as { body: string };
  assert.match(result.body, /Know Your Customer/);
});

test("get_topic throws a helpful error for an unknown slug", async () => {
  await assert.rejects(() => handleTool("get_topic", { slug: "does-not-exist" }, NO_CLIENT), /Unknown topic/);
});

test("search_knowledge answers a question without an API key", async () => {
  const result = (await handleTool("search_knowledge", { query: "how do I freeze a user" }, NO_CLIENT)) as {
    query: string;
    result: Array<{ citation: string; source: string }>;
  };
  assert.equal(result.query, "how do I freeze a user");
  assert.ok(result.result.length > 0);
  for (const hit of result.result) {
    assert.ok(hit.source === "swagger" || hit.source === "topic");
  }
});
