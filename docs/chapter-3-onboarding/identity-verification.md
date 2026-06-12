# Complete Identity Verification with SDK

Identity verification uses the **Incode SDK**. The flow is:

1. Create a verification session → get a session ID
2. Fetch the session to get the **SDK token**
3. Pass the token to the Incode SDK in your app
4. The user completes facial verification and ID check in the SDK
5. Once the SDK reports success, notify bunq via a PUT call
6. Poll until the result is `APPROVED`

## Step 1: Create a verification session

```http
POST /v1/user/{user_id}/identity-verification-session

{
  "purpose": "VERIFICATION",
  "provider": "INCODE"
}
```

**Response:**
```json
{
  "Response": [{ "Id": { "id": 36 } }]
}
```

## Step 2: Get the SDK token

```http
GET /v1/user/{user_id}/identity-verification-session/36
```

**Response:**
```json
{
  "Response": [{
    "IdentityVerificationSessionIncode": {
      "id": 36,
      "status": "CREATED",
      "token": "token_value_123",
      "url_api": "https://demo-api.incodesmile.com/0/",
      "should_record_session": true,
      "result": null
    }
  }]
}
```

Pass `token` and `url_api` to the Incode SDK to start the session in your app.

## Step 3: Submit once the SDK completes

After the Incode SDK reports a successful completion in your app, notify bunq:

```http
PUT /v1/user/{user_api_key_id}/identity-verification-session/36

{
  "status": "SUBMITTED"
}
```

> Use `user_api_key_id` (the `UserApiKey.id` from the session creation step) — not the `UserPerson.id`.

## Step 4: Poll for the result

```http
GET /v1/user/{user_api_key_id}/identity-verification-session/36
```

**Response when approved:**
```json
{
  "Response": [{
    "IdentityVerificationSessionIncode": {
      "id": 65541,
      "status": "PROCESSED",
      "result": {
        "result": "APPROVED",
        "all_fail_reason": []
      }
    }
  }]
}
```

Once `result.result = APPROVED`, identity verification is complete and you can proceed to create monetary accounts and cards.
