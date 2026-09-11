// ─── Knowledge index builder ──────────────────────────────────────────────────
// Build step, run by "npm run build:knowledge". It chunks the corpus, embeds
// every chunk, and writes knowledge-index.json at the repo root. The model
// downloads to models/ on the first run, then stays committed for offline use.

import { writeFileSync } from "fs";
import { join } from "path";
import { buildCorpus, loadTopicAll } from "./corpus.js";
import { embed, EMBEDDING_DIM, EMBEDDING_MODEL } from "./embed.js";
import type { IndexedChunk, KnowledgeIndex } from "./search.js";

// The npm script runs this from the repo root, so source files resolve the same
// way whether the build runs before or after tsc.
const ROOT = process.cwd();
const SWAGGER_PATH = join(ROOT, "partner-api-swagger.yaml");
const TOPICS_DIR = join(ROOT, "src", "knowledge", "topics");
const OUTPUT_PATH = join(ROOT, "knowledge-index.json");

async function main(): Promise<void> {
  const chunkAll = buildCorpus({ swaggerPath: SWAGGER_PATH, topicsDir: TOPICS_DIR });
  process.stderr.write(`Embedding ${chunkAll.length} chunks with ${EMBEDDING_MODEL}...\n`);

  const indexedAll: IndexedChunk[] = [];
  for (const chunk of chunkAll) {
    const embedding = await embed(chunk.text, { allowRemoteModels: true });
    indexedAll.push({ ...chunk, embedding });
  }

  const index: KnowledgeIndex = {
    model: EMBEDDING_MODEL,
    dim: EMBEDDING_DIM,
    chunkAll: indexedAll,
    topicAll: loadTopicAll(TOPICS_DIR),
  };
  writeFileSync(OUTPUT_PATH, JSON.stringify(index));
  process.stderr.write(`Wrote ${indexedAll.length} chunks to ${OUTPUT_PATH}\n`);
}

main().catch((error) => {
  process.stderr.write(`Index build failed: ${String(error)}\n`);
  process.exit(1);
});
