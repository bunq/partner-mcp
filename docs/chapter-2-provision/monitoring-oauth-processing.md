# Monitoring OAuth Processing

```http
GET /v1/partner-user-provision/{provision_id}
```

**Response at this stage:**
```json
{
  "Response": [{
    "PartnerUserProvision": {
      "status": "CREATED",
      "sub_status": "PENDING_PROCESS_OAUTH_REQUEST",
      "label_user": {
        "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "display_name": "User Name",
        "country": "NL",
        "type": "PERSON"
      },
      "oauth_request": null,
      "credential": null
    }
  }]
}
```

`label_user` is now populated — the bunq user account exists. OAuth setup is still in progress.
