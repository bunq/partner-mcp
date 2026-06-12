# Chapter 3: Onboarding

Onboarding verifies a user's identity through document capture, selfie verification, and face matching. The process is session-based and follows a structured flow.

## Onboarding flow

1. **Create a session on behalf of the user** — using `credential.token_value` from the provision
2. **Fetch the onboarding model** — retrieve the current state and required steps
3. **Complete fulfillments** — address, name, tax, nationality
4. **Complete identity verification** — via the Incode SDK
5. **Finalize** — once all fulfillments are complete, bunq validates and activates the user

## Webhooks

Subscribe to receive updates when onboarding completes or is denied:

```http
POST /v1/user/{user_api_key_id}/notification-filter-url

{
  "notification_filters": [{
    "category": "USER_ONBOARDING",
    "notification_target": "https://your-webhook.com/onboarding-updates"
  }]
}
```

> `user_api_key_id` is the `UserApiKey.id` returned when creating a session for the provisioned user.
