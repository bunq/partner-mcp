// ─── Corpus builder ───────────────────────────────────────────────────────────
// Turns two sources into a flat list of knowledge chunks:
//   1. The bundled OpenAPI spec  → one chunk per API operation (reference).
//   2. Hand-written topic pages   → one chunk per heading section (concepts).
// The build step (see index-build.ts) embeds these chunks. The runtime never
// re-reads these source files; it reads the prebuilt index.

import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, basename } from "path";
import { parse as parseYaml } from "yaml";
import type { KnowledgeChunk, TopicDoc } from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TOPICS_DIR = join(HERE, "topics");
const DEFAULT_SWAGGER_PATH = join(HERE, "..", "..", "partner-api-swagger.yaml");

const HTTP_METHOD_ALL = ["get", "post", "put", "patch", "delete"] as const;

interface CorpusOptions {
  swaggerPath?: string;
  topicsDir?: string;
}

// ─── Public entry ───────────────────────────────────────────────────────────

export function buildCorpus(options: CorpusOptions = {}): KnowledgeChunk[] {
  const swaggerPath = options.swaggerPath ?? DEFAULT_SWAGGER_PATH;
  const topicsDir = options.topicsDir ?? DEFAULT_TOPICS_DIR;
  return [...buildSwaggerChunkAll(swaggerPath), ...buildTopicChunkAll(topicsDir)];
}

// ─── Swagger source ───────────────────────────────────────────────────────────

export function buildSwaggerChunkAll(swaggerPath: string): KnowledgeChunk[] {
  const root = parseYaml(readFileSync(swaggerPath, "utf8"));
  const allPath = obj(root.paths);
  const chunkAll: KnowledgeChunk[] = [];

  for (const path of Object.keys(allPath)) {
    const pathItem = obj(allPath[path]);
    for (const method of HTTP_METHOD_ALL) {
      const operation = pathItem[method];
      if (operation && typeof operation === "object") {
        chunkAll.push(buildSwaggerChunk(root, method.toUpperCase(), path, operation));
      } else {
        // No operation for this method on this path.
      }
    }
  }
  return chunkAll;
}

function buildSwaggerChunk(root: any, method: string, path: string, operation: any): KnowledgeChunk {
  const summary = str(operation.summary);
  const line: string[] = [];

  line.push(`${method} ${path}`);
  if (summary) line.push(summary); else { /* Operation without a summary. */ }
  const description = str(operation.description).trim();
  if (description) line.push(description); else { /* Operation without a description. */ }

  const pathParamName = collectPathParamName(root, arr(operation.parameters));
  if (pathParamName.length) line.push(`Path parameters: ${pathParamName.join(", ")}.`); else { /* No path parameters. */ }

  const requestField = collectRequestField(root, operation.requestBody);
  if (requestField.length) line.push(`Request fields:\n${requestField.join("\n")}`); else { /* No request body. */ }

  const responseLine = collectResponseLine(operation.responses);
  if (responseLine.length) line.push(`Responses:\n${responseLine.join("\n")}`); else { /* No documented responses. */ }

  return {
    id: `swagger:${method}:${path}`,
    source: "swagger",
    title: summary ? `${method} ${path} — ${summary}` : `${method} ${path}`,
    citation: `${method} ${path}`,
    text: line.join("\n\n"),
    tags: arr(operation.tags).filter((t): t is string => typeof t === "string"),
  };
}

function collectPathParamName(root: any, allParameter: unknown[]): string[] {
  const nameAll: string[] = [];
  for (const rawParameter of allParameter) {
    const parameter = resolveRef(root, rawParameter);
    if (str(parameter.in) === "path") nameAll.push(str(parameter.name)); else { /* Header or query parameter, skipped as noise. */ }
  }
  return nameAll.filter(Boolean);
}

function collectRequestField(root: any, requestBody: unknown): string[] {
  const schema = resolveRef(root, jsonSchema(resolveRef(root, requestBody)));
  const property = obj(schema.properties);
  const line: string[] = [];
  for (const name of Object.keys(property)) {
    const field = resolveRef(root, property[name]);
    const description = str(field.description);
    line.push(description ? `- ${name}: ${description}` : `- ${name}`);
  }
  return line;
}

function collectResponseLine(responses: unknown): string[] {
  const allResponse = obj(responses);
  const line: string[] = [];
  for (const code of Object.keys(allResponse)) {
    const description = str(obj(allResponse[code]).description);
    line.push(description ? `- ${code}: ${description}` : `- ${code}`);
  }
  return line;
}

function jsonSchema(requestBody: any): unknown {
  return obj(obj(obj(requestBody.content)["application/json"]).schema);
}

// ─── Topic source ───────────────────────────────────────────────────────────

export function buildTopicChunkAll(topicsDir: string): KnowledgeChunk[] {
  const chunkAll: KnowledgeChunk[] = [];
  for (const doc of loadTopicAll(topicsDir)) {
    for (const section of splitBySectionAll(doc.body)) {
      chunkAll.push({
        id: `topic:${doc.slug}#${section.anchor}`,
        source: "topic",
        title: section.heading ? `${doc.title} — ${section.heading}` : doc.title,
        citation: `topics/${doc.slug}.md${section.heading ? `#${section.anchor}` : ""}`,
        text: section.heading ? `${section.heading}\n\n${section.text}` : section.text,
        tags: doc.tags,
      });
    }
  }
  return chunkAll;
}

export function loadTopicAll(topicsDir: string): TopicDoc[] {
  const fileAll = readdirSyncOrEmpty(topicsDir).filter((f) => f.endsWith(".md"));
  return fileAll.map((file) => parseTopic(readFileSync(join(topicsDir, file), "utf8"), file));
}

export function parseTopic(raw: string, file: string): TopicDoc {
  const { front, body } = splitFrontMatter(raw);
  const slug = str(front.slug) || basename(file, ".md");
  return {
    slug,
    title: str(front.title) || slug,
    tags: parseTagList(front.tags),
    body: body.trim(),
  };
}

interface Section {
  heading: string;
  anchor: string;
  text: string;
}

function splitBySectionAll(body: string): Section[] {
  const lineAll = body.split("\n");
  const sectionAll: Section[] = [];
  let heading = "";
  let bufferAll: string[] = [];

  const flush = () => {
    const text = bufferAll.join("\n").trim();
    if (text || heading) sectionAll.push({ heading, anchor: toAnchor(heading), text }); else { /* Empty leading buffer, nothing to flush. */ }
  };

  for (const line of lineAll) {
    const match = line.match(/^##\s+(.*)$/);
    if (match) {
      flush();
      heading = match[1].trim();
      bufferAll = [];
    } else {
      bufferAll.push(line);
    }
  }
  flush();
  return sectionAll.filter((s) => s.text.length > 0);
}

// ─── Front-matter parser ──────────────────────────────────────────────────────
// Minimal key: value front matter between leading "---" fences. No dependency
// on a YAML front-matter package; the format is a flat map plus a tag list.

function splitFrontMatter(raw: string): { front: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (match) {
    const front: Record<string, string> = {};
    for (const line of match[1].split("\n")) {
      const pair = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (pair) front[pair[1]] = pair[2].trim(); else { /* Blank or malformed front-matter line. */ }
    }
    return { front, body: match[2] };
  } else {
    return { front: {}, body: raw };
  }
}

function parseTagList(value: string | undefined): string[] {
  if (value) {
    return value
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  } else {
    return [];
  }
}

function toAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Local helpers ────────────────────────────────────────────────────────────

function resolveRef(root: any, node: any): any {
  if (node && typeof node === "object" && typeof node.$ref === "string") {
    return getByPath(root, node.$ref) ?? {};
  } else {
    return node ?? {};
  }
}

function getByPath(root: unknown, ref: string): any {
  const partAll = ref.replace(/^#\//, "").split("/");
  let node: any = root;
  for (const part of partAll) {
    if (node && typeof node === "object" && part in node) node = node[part]; else return undefined;
  }
  return node;
}

function readdirSyncOrEmpty(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function obj(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {};
}
