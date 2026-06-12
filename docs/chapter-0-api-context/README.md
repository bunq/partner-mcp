# Chapter 0: Setting Up API Context

When integrating with the bunq API, security is a top priority. Instead of relying solely on API keys, bunq uses a three-step authentication process:

1. **Installation** — register your public key
2. **Device Registration** — link your server to the API key
3. **Session Creation** — get a session token for API calls

This approach prevents unauthorized use, protects sensitive financial data, and aligns with banking security standards like PSD2.

> **Pro tip:** The MCP server handles all three steps automatically. When you make your first tool call, it runs the full auth flow and caches the session. If the session expires, it refreshes automatically.

## What's in this chapter

- [Creating the Installation](./installation.md)
- [Device Registration](./device-registration.md)
- [Start a Session](./session.md)
- [Signing](./signing.md)
