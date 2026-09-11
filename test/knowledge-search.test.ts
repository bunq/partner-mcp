import { test } from "node:test";
import assert from "node:assert/strict";
import { searchIndex, loadIndex, type KnowledgeIndex } from "../src/knowledge/search.ts";
import { embed } from "../src/knowledge/embed.ts";

// ─── Ranking with a stubbed embedder ──────────────────────────────────────────

test("search ranks the nearest chunk first", async () => {
  const index: KnowledgeIndex = {
    model: "stub",
    dim: 2,
    topicAll: [],
    chunkAll: [
      { id: "a", source: "topic", title: "A", citation: "a", text: "a", tags: [], embedding: [1, 0] },
      { id: "b", source: "topic", title: "B", citation: "b", text: "b", tags: [], embedding: [0, 1] },
      { id: "c", source: "topic", title: "C", citation: "c", text: "c", tags: [], embedding: [-1, 0] },
    ],
  };
  const stubEmbedder = async () => [0.9, 0.1];
  const hitAll = await searchIndex(index, "anything", stubEmbedder, 2);
  assert.equal(hitAll.length, 2);
  assert.equal(hitAll[0].citation, "a");
  assert.ok(hitAll[0].score > hitAll[1].score);
});

// ─── Real offline search over the committed index and model ────────────────────

test("real search finds the identity-verification knowledge offline", async () => {
  const index = loadIndex();
  const hitAll = await searchIndex(index, "how does a user prove their identity", (q) => embed(q), 3);
  const citationAll = hitAll.map((h) => h.citation.toLowerCase());
  const found = citationAll.some((c) => c.includes("kyc") || c.includes("identity"));
  assert.ok(found, `expected a KYC or identity hit, got: ${citationAll.join(", ")}`);
});
