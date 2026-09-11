// ─── Knowledge layer shared types ─────────────────────────────────────────────
// A chunk is one searchable unit of the help book. A topic is one hand-written
// explainer page, returned whole by the get_topic tool.

export interface KnowledgeChunk {
  id: string;
  source: "swagger" | "topic";
  title: string;
  citation: string;
  text: string;
  tags: string[];
}

export interface TopicDoc {
  slug: string;
  title: string;
  tags: string[];
  body: string;
}
