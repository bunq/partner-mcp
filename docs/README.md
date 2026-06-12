# bunq Partner API

## Overview

The bunq Partner API allows partners to create and manage user accounts through bunq's partner infrastructure. It handles the complete lifecycle of user creation:

1. Setting up the company account and API context
2. Creating a session securely via API Context calls
3. Setting up an OAuth Client
4. Provisioning users within the bunq platform
5. Completing onboarding KYC requirements
6. Performing actions on behalf of provisioned users (payments, accounts, cards, and more)

The API follows an asynchronous processing model where user creation happens in background processes, with status updates available through polling or webhooks.

## Prerequisites

Before using this API, ensure you have:

1. **Partner Directory** — an active partner directory with appropriate permissions (bunq configures this for sandbox and production)
2. **OAuth Client** — OAuth client credentials configured for your partner account (see Chapter 1)
3. **Authentication** — valid partner session tokens (see Chapter 0)
4. **Products** — access to the required products (e.g. `USER_VERIFIED`)

## Host URLs

| Environment | URL |
|---|---|
| Sandbox | `https://partner-api.sandbox.bunq.com` |
| Production | `https://api.partner.bunq.com` |

## Quick start with the MCP

If you're using the MCP server with Claude Desktop, the entire flow can be driven conversationally. See the [repository README](https://github.com/bunq/partner-mcp) for setup instructions.
