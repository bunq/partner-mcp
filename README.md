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

## Sessions for provisioned users

Calls on behalf of a provisioned user (KYC, accounts, payments, cards, inquiries, freeze) must use that user's own session, not your partner session.

1. When a provision is `ACTIVE`, call `create_user_session` with its `credential.token_value`.
2. The server creates the user's installation, device and session, and keeps the session token itself. The tool returns only `user_id` and `user_api_key_id`.
3. Pass that `user_id` to every per-user tool. The server picks the matching session. Use `user_api_key_id` only to register that user's webhooks with `set_notification_filters`.

A per-user tool called before `create_user_session` fails with a message that tells you to create the session first.

## Optional settings

| Variable | Default | Meaning |
|---|---|---|
| `BUNQ_PERSIST_STATE` | `true` for sandbox, `false` for production | Keeps the key pairs, installations and sessions in a local file, so a restart does not register a new device or lose user sessions. |
| `BUNQ_STATE_FILE` | `~/.bunq-partner-mcp/state-<env>-<key hash>.json` | Where that file goes. It holds private keys and tokens and is written with mode `0600`. |
| `BUNQ_TIMEOUT_MS` | `30000` | HTTP timeout per call. |

The server checks the `X-Bunq-Server-Signature` of every successful response and refuses an unsigned or wrongly signed one.

## Updating

When a new version is released:

```bash
cd partner-mcp
git pull
npm install
npm run build
```

Then restart Claude Desktop.

## Available tools

The full API documentation — covering auth, OAuth, user provision, onboarding & KYC, webhooks, monetary accounts, payments, devices, cards, and compliance — lives in GitBook:

📚 **[Partner Onboarding API docs](https://partner.doc.bunq.com/)**

## Project structure

```
partner-mcp/
├── src/
│   ├── index.ts          # MCP server entry point (stdio transport)
│   ├── bunq-client.ts    # HTTP client, partner and user sessions, signatures
│   ├── state-store.ts    # Optional state file for keys and sessions
│   ├── encryption.ts     # Application-layer request/response encryption
│   ├── tools.ts          # Tool definitions (MCP schemas)
│   ├── operations.ts     # One entry per API tool: method, path, session, body
│   └── handler.ts        # Argument checks, custom tools, operation runner
├── test/                 # Unit tests (node:test), incl. the swagger parity test
├── partner-api-swagger.yaml       # Maintained OpenAPI spec
├── package.json
└── tsconfig.json
```

## Support

- 📚 [Full documentation](https://partner.doc.bunq.com/)
- 🐛 [Open an issue](https://github.com/bunq/partner-mcp/issues)
- 💬 [bunq Together](https://together.bunq.com)
