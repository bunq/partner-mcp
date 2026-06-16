# Compliance Webhooks

Subscribe to receive notifications when compliance inquiries are created or updated:

```http
POST /v1/user/{user_api_key_id}/notification-filter-url

{
  "notification_filters": [{
    "category": "USER_INFORMATION_INQUIRY",
    "notification_target": "https://your-webhook.com/compliance"
  }]
}
```

## Webhook payload example

```json
{
  "NotificationUrl": {
    "category": "USER_INFORMATION_INQUIRY",
    "event_type": "USER_INFORMATION_INQUIRY_EXPECTING_REPLY_FROM_USER",
    "object": {
      "UserInformationInquiry": {
        "id": 17,
        "user_id": 1358,
        "title": "We need additional information",
        "purpose": "COMPLIANCE_TRANSACTION_MONITORING",
        "status": "EXPECTING_REPLY_FROM_USER",
        "all_entry": [{
          "UserInformationInquiryEntry": {
            "id": 17,
            "type": "USER_PERSON_SOURCE_OF_FUND",
            "status": "PENDING"
          }
        }]
      }
    }
  }
}
```
