# Created Provision

The provision is ready when `sub_status` reaches `PENDING_PROCESS_USER_ONBOARDING`. At this point:

- The bunq user account exists
- The OAuth setup is complete
- A `credential.token_value` is available — this is **Eva's API key**

```http
GET /v1/partner-user-provision/{provision_id}
```

**Response when ACTIVE:**
```json
{
  "Response": [{
    "PartnerUserProvision": {
      "id": 123,
      "status": "ACTIVE",
      "sub_status": "PENDING_PROCESS_USER_ONBOARDING",
      "action_required": "USER",
      "label_user": {
        "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "display_name": "User Name",
        "country": "NL",
        "type": "PERSON"
      },
      "oauth_request": {
        "id": 456,
        "status": "ACTIVE",
        "authorization_code": "auth_code_123",
        "client_id": "client_id_456"
      },
      "credential": {
        "id": 789,
        "status": "PENDING_FIRST_USE",
        "expiry_time": "2025-08-20 14:45:24.567890",
        "token_value": "credential_token_abc123def456"
      }
    }
  }]
}
```

## ⚠️ Critical: the credential expires

The `credential.token_value` is Eva's API key. It **must be used to create a session immediately**:

| Environment | Expiry window |
|---|---|
| Sandbox | **1 hour** |
| Production | **4 hours** |

If you don't create a session within this window, `credential.status` moves to `EXPIRED` and the token can no longer be used. You'll need to call [Refresh Credential](./refreshing-credential.md) to get a new one.

**Credential status values:**

| Status | Meaning |
|---|---|
| `PENDING_FIRST_USE` | Token is ready — create a session now |
| `ACTIVE` | Session was created successfully. `token_value` becomes `null` — store it before this happens |
| `EXPIRED` | Window elapsed without a session being created |

> Once `status` becomes `ACTIVE`, `token_value` is set to `null` for security. Make sure you store it before creating the session.

## Next step

Use `credential.token_value` to [create a session on behalf of the user](../chapter-3-onboarding/create-user-session.md).
