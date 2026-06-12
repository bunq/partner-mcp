# Monitoring User Processing

Poll this endpoint after creating a provision to track progress.

```http
GET /v1/partner-user-provision/{provision_id}
```

**Response at this stage:**
```json
{
  "Response": [{
    "PartnerUserProvision": {
      "id": 123,
      "status": "CREATED",
      "sub_status": "PENDING_PROCESS_USER",
      "action_required": "NONE",
      "label_user": null,
      "oauth_request": null,
      "credential": null
    }
  }]
}
```

`label_user: null` means the user account hasn't been created yet. Keep polling until `sub_status` changes.

## Alternative: use webhooks instead of polling

```http
POST /v1/user/{user_id}/notification-filter-url

{
  "notification_filters": [{
    "category": "PARTNER_USER_PROVISION",
    "notification_target": "https://your-webhook.com/provision-updates"
  }]
}
```

> The `user_id` here is your **company user ID** (the partner account), not the provisioned user's ID.
