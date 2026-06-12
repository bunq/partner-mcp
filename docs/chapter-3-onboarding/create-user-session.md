# Create a Session on Behalf of the User

Before you can complete onboarding or take any actions on behalf of a provisioned user, you must create a session using their `credential.token_value`.

## Create the session

```http
POST /v1/session-server

{
  "secret": "<credential.token_value>"
}
```

**Response:**
```json
{
  "Response": [
    { "Id": { "id": 2173 } },
    {
      "Token": {
        "id": 2173,
        "token": "f981bd6d26b8328b89e85a774c404bb02e72d18062dab92bb59c9e59a1c5958f"
      }
    },
    {
      "UserApiKey": {
        "id": 1364,
        "requested_by_user": {
          "UserCompany": { "id": 1360, "display_name": "Your Partner Company" }
        },
        "granted_by_user": {
          "UserPerson": { "id": 1363, "display_name": "New bunqer" }
        }
      }
    }
  ]
}
```

Save:
- `Token.token` — session token for all subsequent calls on behalf of this user
- `UserApiKey.id` — used as `user_id` in onboarding webhook subscriptions and identity verification submission
- `UserApiKey.granted_by_user.UserPerson.id` — the provisioned user's actual user ID

## ⚠️ This must happen before the credential expires

- **Sandbox:** within 1 hour of the token being issued
- **Production:** within 4 hours

If you miss the window, use [Refresh Credential](../chapter-2-provision/refreshing-credential.md) to get a new token.
