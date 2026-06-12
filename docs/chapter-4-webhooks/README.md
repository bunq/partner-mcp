# Chapter 4: Webhooks

Instead of polling, subscribe to webhook notifications to receive real-time updates.

## ⚠️ Replace-all behaviour

The `POST /notification-filter-url` endpoint **completely replaces** all existing filters for the user on every call. To add a new filter without removing existing ones, include all current filters plus the new one in the same request.

```http
POST /v1/user/{user_id}/notification-filter-url

{
  "notification_filters": [
    {
      "category": "PARTNER_USER_PROVISION",
      "notification_target": "https://your-webhook.com/provision"
    },
    {
      "category": "MUTATION",
      "notification_target": "https://your-webhook.com/payments"
    }
  ]
}
```

To clear all filters: `{ "notification_filters": [] }`

## Available categories

### Provisioning

| Category | Event | Description |
|---|---|---|
| `PARTNER_USER_PROVISION` | `PARTNER_USER_PROVISION_PROCESS_UPDATED` | Provision status changed |
| `USER_ONBOARDING` | `USER_ONBOARDING_UPDATED` | Onboarding status changed |

### Compliance

| Category | Event | Description |
|---|---|---|
| `USER_INFORMATION_INQUIRY` | `USER_INFORMATION_INQUIRY_EXPECTING_REPLY_FROM_USER` | Inquiry requires user response |
| `USER_INFORMATION_INQUIRY` | `USER_INFORMATION_INQUIRY_FINALIZED` | Inquiry resolved |

### Payments

| Category | Event | Description |
|---|---|---|
| `MUTATION` | `MUTATION_CREATED` | Account balance decreased |
| `MUTATION` | `MUTATION_RECEIVED` | Account balance increased |
| `PAYMENT` | `PAYMENT_CREATED` | Payment initiated |
| `PAYMENT` | `PAYMENT_RECEIVED` | Payment received |
| `PAYMENT` | `PAYMENT_REJECTED` | Payment rejected |

### Cards

| Category | Event | Description |
|---|---|---|
| `CARD_TRANSACTION_SUCCESSFUL` | `CARD_PAYMENT_ALLOWED` | Card payment approved |
| `CARD_TRANSACTION_FAILED` | `CARD_TRANSACTION_NOT_ALLOWED` | Card transaction declined |
| `CARD` | `CARD_UPDATED` | Card properties updated |

## Handling failed webhooks

bunq retries failed webhooks up to 5 times (6 total attempts) with 1-minute intervals. After the 6th failure, the webhook is stored as a failure record.

### List failures

```http
GET /v1/user/{user_company_id}/notification-filter-failure
```

> Use your `UserCompany.id` — this returns failures for all provisioned users.

### Retry failures

```http
POST /v1/user/{user_id}/notification-filter-failure

{
  "notification_filter_failed_ids": "123,456,789"
}
```

Up to 100 IDs per request.

## Webhook security

bunq sends webhooks from:
- **Sandbox:** various AWS IP addresses
- **Production:** `185.40.108.0/22`

For additional security, you can enable certificate pinning — bunq will validate your server's certificate before delivering webhooks. See [bunq certificate pinning docs](https://doc.bunq.com/basics/callbacks-webhooks#certificate-pinning).
