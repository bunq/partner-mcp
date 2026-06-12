# User Onboarding

After creating a session for the provisioned user, fetch and update the onboarding model.

## Fetch the onboarding model

```http
GET /v1/user/{user_id}/user-onboarding
```

Returns the current onboarding state, required fulfillments, and progress.

## Update the onboarding model

```http
PUT /v1/user/{user_id}/user-onboarding/{onboarding_id}

{
  "status": "..."
}
```
