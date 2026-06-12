# Chapter 1: Setting Up OAuth Client and Callback URL

OAuth ensures secure and controlled access to the bunq platform, allowing provisioned users or APIs to interact with services only after obtaining the necessary permissions.

## Step 1: Create an OAuth Client

```http
POST /v1/user/{user_id}/oauth-client
X-Bunq-Client-Authentication: <session_token>

{}
```

**Response:**
```json
{
  "Response": [{ "Id": { "id": 789 } }]
}
```

Save the `id` as your `oauth_client_id`.

## Step 2: Read OAuth Client Details

```http
GET /v1/user/{user_id}/oauth-client/{oauth_client_id}
```

**Response:**
```json
{
  "Response": [{
    "OauthClient": {
      "id": 789,
      "status": "ACTIVE",
      "display_name": null,
      "client_id": "client_abc123def456",
      "secret": "secret_xyz789uvw012",
      "callback_url": []
    }
  }]
}
```

| Field | Description |
|---|---|
| `client_id` | OAuth client ID used in authorization flows |
| `secret` | OAuth client secret |
| `callback_url` | Registered callback URLs |

## Step 3: Register an OAuth Callback URL

```http
POST /v1/user/{user_id}/oauth-client/{oauth_client_id}/callback-url

{
  "url": "https://yourpartner.com/oauth/callback"
}
```

**Response:**
```json
{
  "Response": [{ "Id": { "id": 456 } }]
}
```

## Step 4: Read Callback URL Details

```http
GET /v1/user/{user_id}/oauth-client/{oauth_client_id}/callback-url/{callback_url_id}
```

**Response:**
```json
{
  "Response": [{
    "OauthCallbackUrl": {
      "id": 456,
      "created": "2025-08-13 14:45:20.123456",
      "updated": "2025-08-13 14:45:20.123456",
      "url": "https://yourpartner.com/oauth/callback"
    }
  }]
}
```
