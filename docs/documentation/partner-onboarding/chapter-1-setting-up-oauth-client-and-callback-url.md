# Chapter 1: Setting up OAuth Client and Callback URL

OAuth is an open standard for access delegation commonly used to grant websites or applications limited access to user information without exposing passwords. In this context, bunq uses OAuth to ensure secure and controlled access to its platform, allowing provisioned users or APIs to interact with services only after obtaining the necessary permissions. This process involves creating an OAuth client and authorizing it through a series of steps to ensure the user's data is protected.

## Step 1: Create OAuth Client for the company

**Endpoint:**

```http
POST /v1/user/{user_id}/oauth-client

{}
```

**Response:**

```json
{
    "Response": [
        {
            "Id": {
                "id": 789
            }
        }
    ]
}
```

***

## Step 2: Read OAuth Client Details

**Endpoint:**

```http
GET /v1/user/{user_id}/oauth-client/{client_id}
```

**Response:**

```json
{
    "Response": [
        {
            "OauthClient": {
                "id": 789,
                "status": "ACTIVE",
                "display_name": null,
                "client_id": "client_abc123def456",
                "secret": "secret_xyz789uvw012",
                "callback_url": []
            }
        }
    ]
}
```

**Fields:**

| Field          | Type    | Description                            |
| -------------- | ------- | -------------------------------------- |
| `id`           | integer | Unique identifier for the OAuth client |
| `status`       | string  | Status (e.g., `ACTIVE`)                |
| `display_name` | string  | Human-readable name                    |
| `client_id`    | string  | OAuth client ID                        |
| `secret`       | string  | OAuth client secret                    |
| `callback_url` | array   | Registered callback URLs               |

***

## Step 3: Register OAuth Callback URL

**Endpoint:**

```http
POST /v1/user/{user_id}/oauth-client/{client_id}/callback-url

{
    "url": "https://yourpartner.com/oauth/callback"
}
```

**Response:**

```json
{
    "Response": [
        {
            "Id": {
                "id": 456
            }
        }
    ]
}
```

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `url`     | string | Yes      | HTTPS callback URL to register |

***

## Step 4: Read Callback URL Details

**Endpoint:**

```http
GET /v1/user/{user_id}/oauth-client/{client_id}/callback-url/{callback_url_id}
```

**Response:**

```json
{
    "Response": [
        {
            "OauthCallbackUrl": {
                "id": 456,
                "created": "2025-08-13 14:45:20.123456",
                "updated": "2025-08-13 14:45:20.123456",
                "url": "https://yourpartner.com/oauth/callback"
            }
        }
    ]
}
```
