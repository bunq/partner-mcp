# Start a Session

Sessions provide temporary authentication. Even if a session token is exposed, it automatically expires after a set period. The session token is what you use to authenticate all subsequent API calls.

## Call the session-server endpoint

```http
POST /v1/session-server
X-Bunq-Client-Authentication: <installation_token>
X-Bunq-Client-Signature: <signature>
Content-Type: application/json

{
  "secret": "<your_api_key>"
}
```

## Response

```json
{
  "Response": [
    {
      "Id": { "id": 25536694 }
    },
    {
      "Token": {
        "id": 25536694,
        "created": "2025-03-05 16:12:11.918100",
        "updated": "2025-03-05 16:12:11.918100",
        "token": "ce717e3001d979ff5e22bac13508b46e7ad740971d1d75c5371614e546ca8b83"
      }
    },
    {
      "UserCompany": {
        "id": 1822179,
        "...": "rest of user object"
      }
    }
  ]
}
```

Save:
- `Token.token` — the **session token**, used in `X-Bunq-Client-Authentication` for all API calls
- `UserCompany.id` (or `UserPerson.id`) — your **user ID**, used in endpoint paths

## Session expiry

Sessions expire based on your auto-logout setting (default: 1 week). If your session expires, simply call `POST /v1/session-server` again to get a new token.

The MCP server handles this automatically — it detects 401 responses and refreshes the session transparently.
