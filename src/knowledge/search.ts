// ─── Semantic search over the knowledge index ─────────────────────────────────
// The index holds every chunk with its embedding, plus the whole topic docs for
// the list_topics and get_topic tools. Search embeds the query once, then ranks
// chunks by cosine similarity. The embedder is injected so tests can stub it.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { KnowledgeChunk, TopicDoc } from "./types.js";
import type { Embedder } from "./embed.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_INDEX_PATH = join(HERE, "..", "..", "knowledge-index.json");

export interface IndexedChunk extends KnowledgeChunk {
  embedding: number[];
}

export interface KnowledgeIndex {
  model: string;
  dim: number;
  chunkAll: IndexedChunk[];
  topicAll: TopicDoc[];
}

export interface SearchHit {
  title: string;
  citation: string;
  source: "swagger" | "topic";
  text: string;
  score: number;
}

export function loadIndex(indexPath: string = DEFAULT_INDEX_PATH): KnowledgeIndex {
  return JSON.parse(readFileSync(indexPath, "utf8")) as KnowledgeIndex;
}

export async function searchIndex(
  index: KnowledgeIndex,
  query: string,
  embed: Embedder,
  topK = 5
): Promise<SearchHit[]> {
  const queryVector = await embed(query);
  const scoredAll = index.chunkAll.map((chunk) => ({
    chunk,
    score: cosine(queryVector, chunk.embedding),
  }));
  scoredAll.sort((a, b) => b.score - a.score);
  return scoredAll.slice(0, topK).map(({ chunk, score }) => ({
    title: chunk.title,
    citation: chunk.citation,
    source: chunk.source,
    text: chunk.text,
    score,
  }));
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator > 0) {
    return dot / denominator;
  } else {
    return 0;
  }
}
