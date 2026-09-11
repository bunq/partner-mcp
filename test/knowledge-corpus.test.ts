import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  buildSwaggerChunkAll,
  buildTopicChunkAll,
  parseTopic,
  loadTopicAll,
} from "../src/knowledge/corpus.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SWAGGER_PATH = join(HERE, "..", "partner-api-swagger.yaml");
const TOPICS_DIR = join(HERE, "..", "src", "knowledge", "topics");

// ─── Swagger source ───────────────────────────────────────────────────────────

test("swagger source yields one chunk per operation with a citation", () => {
  const chunkAll = buildSwaggerChunkAll(SWAGGER_PATH);
  assert.ok(chunkAll.length > 20, "expected many operation chunks");
  for (const chunk of chunkAll) {
    assert.equal(chunk.source, "swagger");
    assert.match(chunk.citation, /^(GET|POST|PUT|PATCH|DELETE) \//);
    assert.ok(chunk.text.length > 0);
  }
});

test("swagger chunk carries the installation request field", () => {
  const chunkAll = buildSwaggerChunkAll(SWAGGER_PATH);
  const installation = chunkAll.find((c) => c.citation === "POST /installation");
  assert.ok(installation, "installation operation must be present");
  assert.match(installation.text, /client_public_key/);
});

// ─── Topic source ───────────────────────────────────────────────────────────

test("topic front matter parses title, slug and tags", () => {
  const doc = parseTopic(
    "---\ntitle: KYC and identity verification\nslug: kyc\ntags: [kyc, identity]\n---\n\nbody text",
    "ignored.md"
  );
  assert.equal(doc.slug, "kyc");
  assert.equal(doc.title, "KYC and identity verification");
  assert.deepEqual(doc.tags, ["kyc", "identity"]);
  assert.equal(doc.body, "body text");
});

test("topic slug falls back to the file name without front matter", () => {
  const doc = parseTopic("# just a body\n", "payments.md");
  assert.equal(doc.slug, "payments");
  assert.equal(doc.title, "payments");
});

test("topic source splits one chunk per heading section", () => {
  const dir = mkdtempSync(join(tmpdir(), "topics-"));
  writeFileSync(
    join(dir, "sample.md"),
    "---\ntitle: Sample\nslug: sample\ntags: [a]\n---\n\n## Overview\n\nfirst\n\n## Steps\n\nsecond\n"
  );
  const chunkAll = buildTopicChunkAll(dir);
  assert.equal(chunkAll.length, 2);
  assert.deepEqual(
    chunkAll.map((c) => c.citation),
    ["topics/sample.md#overview", "topics/sample.md#steps"]
  );
  assert.match(chunkAll[0].text, /first/);
  assert.equal(chunkAll[0].tags[0], "a");
});

test("the seeded kyc topic loads and produces chunks", () => {
  const docAll = loadTopicAll(TOPICS_DIR);
  const kyc = docAll.find((d) => d.slug === "kyc");
  assert.ok(kyc, "kyc topic must be present");

  const chunkAll = buildTopicChunkAll(TOPICS_DIR);
  const status = chunkAll.find((c) => c.citation === "topics/kyc.md#status-values");
  assert.ok(status, "status-values section must become a chunk");
  assert.match(status.text, /APPROVED/);
});
