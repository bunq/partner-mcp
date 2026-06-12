# bunq Partner MCP

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects AI assistants like Claude to the bunq Partner API. Once set up, you can drive the entire partner onboarding flow — provisioning users, KYC, accounts, payments, cards, and compliance — through natural language conversation.

## What you can do

After connecting, you can ask Claude things like:

- *"Provision a new user with email jan@example.nl and phone +31612345678"*
- *"Check the status of provision 4521"*
- *"Create a EUR bank account for user 8823"*
- *"Make a payment of €50 from account 12 to IBAN NL91ABNA0417164300"*
- *"Show me all open compliance inquiries for user 9002"*
- *"Register a webhook for mutations on user 8823 pointing to https://myapp.com/webhooks"*

Claude handles the full auth lifecycle, request signing, token management, and status polling automatically.

## Prerequisites

- [Node.js 20+](https://nodejs.org)
- A bunq Partner API key (provided by bunq)
- [Claude Desktop](https://claude.ai/download) with a Pro or Team subscription

## Setup

### 1. Clone and build

```bash
git clone https://github.com/bunq/partner-mcp.git
cd partner-mcp
npm install
npm run build
```

### 2. Add to Claude Desktop

Edit your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bunq-partner": {
      "command": "node",
      "args": ["/absolute/path/to/partner-mcp/dist/index.js"],
      "env": {
        "BUNQ_API_KEY": "your_partner_api_key_here",
        "BUNQ_ENV": "sandbox"
      }
    }
  }
}
```

Replace `/absolute/path/to/partner-mcp` with the actual path where you cloned the repo.

### 3. Restart Claude Desktop

Quit and reopen Claude Desktop. You should see the bunq tools available.

### 4. Verify the connection

Ask Claude: *"Check my bunq session info"* — it should respond with your authenticated user ID and environment.

## Environments

| `BUNQ_ENV` | Base URL |
|---|---|
| `sandbox` (default) | `https://partner-api.sandbox.bunq.com` |
| `production` | `https://api.partner.bunq.com` |

Always test in sandbox first. Sandbox API keys contain a `sandbox_` prefix.

## Updating

When a new version is released:

```bash
cd partner-mcp
git pull
npm install
npm run build
```

Then restart Claude Desktop.

## Available tools (41)

See [docs/](./docs/) for the full documentation, or browse by chapter:

- [Chapter 0 — API Context](./docs/chapter-0-api-context/) (auth, session, signing)
- [Chapter 1 — OAuth](./docs/chapter-1-oauth/)
- [Chapter 2 — User Provision](./docs/chapter-2-provision/)
- [Chapter 3 — Onboarding & KYC](./docs/chapter-3-onboarding/)
- [Chapter 4 — Webhooks](./docs/chapter-4-webhooks/)
- [Chapter 5 — Monetary Accounts](./docs/chapter-5-accounts/)
- [Chapter 6 — Payments](./docs/chapter-6-payments/)
- [Chapter 7 — Cards](./docs/chapter-7-cards/)
- [Chapter 8 — Compliance](./docs/chapter-8-compliance/)

## Project structure

```
partner-mcp/
├── src/
│   ├── index.ts          # MCP server entry point (stdio transport)
│   ├── bunq-client.ts    # HTTP client + auth lifecycle
│   ├── tools.ts          # Tool definitions (MCP schemas)
│   └── handler.ts        # Tool → API call mapping
├── docs/                 # Documentation (synced to GitBook)
├── scripts/
│   └── UPDATE.md         # Script to update MCP + docs from GitLab MRs
├── package.json
└── tsconfig.json
```

## Support

- 📚 [Full documentation](https://lexy.gitbook.io/partner-onboarding-api-docs)
- 🐛 [Open an issue](https://github.com/bunq/partner-mcp/issues)
- 💬 [bunq Together](https://together.bunq.com)
