# Refreshing the Credential API Key

Use this when the existing `credential.token_value` is lost, expired, or revoked. As long as the provision and user are active, you can always request a new token.

## Step 1: Request a token reset

```http
PUT /v1/partner-user-provision/{provision_id}

{
  "status": "TOKEN_RESET_REQUESTED"
}
```

**Response:**
```json
{
  "Response": [{ "Id": { "id": 123 } }]
}
```

## Step 2: Poll until the new token appears

```http
GET /v1/partner-user-provision/{provision_id}
```

Poll until `credential.status = PENDING_FIRST_USE` and a new `token_value` appears in the response.

## Step 3: Create a session immediately

Use the new `token_value` to create a session — the same expiry window applies:

- **Sandbox:** 1 hour
- **Production:** 4 hours

See [Create a Session on Behalf of the User](../chapter-3-onboarding/create-user-session.md).
