#!/usr/bin/env node
/**
 * bunq Partner API — MCP Server
 *
 * Implements the Model Context Protocol (MCP) over stdio so Claude Desktop
 * and any MCP-compatible client can drive the full bunq Partner onboarding
 * flow conversationally.
 *
 * Usage:
 *   BUNQ_API_KEY=<key> BUNQ_ENV=sandbox node dist/index.js
 *
 * Required env vars:
 *   BUNQ_API_KEY   — Your bunq Partner API key
 *   BUNQ_ENV       — "sandbox" (default) or "production"
 */

import { readFileSync } from "fs";
import { createInterface } from "readline";
import { BunqClient, type BunqEnv } from "./bunq-client.js";
import { TOOLS } from "./tools.js";
import { handleTool } from "./handler.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY = process.env.BUNQ_API_KEY ?? "";
const ENV = (process.env.BUNQ_ENV ?? "sandbox") as BunqEnv;

if (!API_KEY) {
  process.stderr.write(
    "Error: BUNQ_API_KEY environment variable is required.\n" +
    "Usage: BUNQ_API_KEY=<key> BUNQ_ENV=sandbox node dist/index.js\n"
  );
  process.exit(1);
}

// ─── MCP message types ────────────────────────────────────────────────────────

interface McpRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// ─── Response helpers ─────────────────────────────────────────────────────────

function send(msg: McpResponse): void {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function ok(id: string | number | null, result: unknown): void {
  send({ jsonrpc: "2.0", id, result });
}

function err(id: string | number | null, code: number, message: string, data?: unknown): void {
  send({ jsonrpc: "2.0", id, error: { code, message, data } });
}

// ─── Client (lazily initialised) ─────────────────────────────────────────────

const client = new BunqClient(API_KEY, ENV);

// ─── Method handlers ──────────────────────────────────────────────────────────

async function dispatch(req: McpRequest): Promise<void> {
  const { id, method, params = {} } = req;

  try {
    switch (method) {
      // ── Lifecycle ───────────────────────────────────────────────────────────
      case "initialize": {
        ok(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: "bunq-partner-mcp",
            version: "1.0.0",
          },
        });
        break;
      }

      case "notifications/initialized":
      case "$/cancelRequest":
        // Notifications — no response needed
        break;

      // ── Tool discovery ──────────────────────────────────────────────────────
      case "tools/list": {
        ok(id, { tools: TOOLS });
        break;
      }

      // ── Tool execution ──────────────────────────────────────────────────────
      case "tools/call": {
        const toolName = params.name as string;
        const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;

        process.stderr.write(`[bunq-mcp] Tool call: ${toolName}\n`);

        try {
          const result = await handleTool(toolName, toolArgs, client);
          ok(id, {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          });
        } catch (toolErr) {
          const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
          process.stderr.write(`[bunq-mcp] Tool error: ${msg}\n`);
          ok(id, {
            content: [{ type: "text", text: `Error: ${msg}` }],
            isError: true,
          });
        }
        break;
      }

      // ── Prompts (not used) ──────────────────────────────────────────────────
      case "prompts/list": {
        ok(id, { prompts: [] });
        break;
      }

      // ── Resources (not used) ────────────────────────────────────────────────
      case "resources/list": {
        ok(id, { resources: [] });
        break;
      }

      default: {
        err(id, -32601, `Method not found: ${method}`);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    err(id, -32603, `Internal error: ${msg}`);
  }
}

// ─── Stdio transport ──────────────────────────────────────────────────────────

process.stderr.write(`[bunq-mcp] Starting bunq Partner MCP server (${ENV})\n`);

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let req: McpRequest;
  try {
    req = JSON.parse(trimmed) as McpRequest;
  } catch {
    err(null, -32700, "Parse error: invalid JSON");
    return;
  }

  dispatch(req).catch((e) => {
    process.stderr.write(`[bunq-mcp] Unhandled: ${e}\n`);
  });
});

rl.on("close", () => {
  process.stderr.write("[bunq-mcp] stdin closed, exiting\n");
  process.exit(0);
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
