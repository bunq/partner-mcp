// ─── Knowledge tool handlers ──────────────────────────────────────────────────
// Local handlers for the search_knowledge, list_topics and get_topic tools.
// They read the prebuilt index and the local model. They never call the API,
// so they work without an API key.

import { loadIndex, searchIndex, type KnowledgeIndex, type SearchHit } from "./search.js";
import { embed } from "./embed.js";

const DEFAULT_TOP_K = 5;

let indexCache: KnowledgeIndex | null = null;

function index(): KnowledgeIndex {
  if (indexCache) {
    return indexCache;
  } else {
    indexCache = loadIndex();
    return indexCache;
  }
}

export async function searchKnowledge(query: string, topK: number): Promise<{ query: string; result: SearchHit[] }> {
  const result = await searchIndex(index(), query, (text) => embed(text), topK > 0 ? topK : DEFAULT_TOP_K);
  return { query, result };
}

export function listTopic(): { topic_all: Array<{ slug: string; title: string; tags: string[] }> } {
  const topic_all = index().topicAll.map((topic) => ({ slug: topic.slug, title: topic.title, tags: topic.tags }));
  return { topic_all };
}

export function getTopic(slug: string): { slug: string; title: string; tags: string[]; body: string } {
  const topic = index().topicAll.find((candidate) => candidate.slug === slug);
  if (topic) {
    return { slug: topic.slug, title: topic.title, tags: topic.tags, body: topic.body };
  } else {
    throw new Error(`Unknown topic: ${slug}. Use list_topics to see the available topics.`);
  }
}
