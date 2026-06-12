# Monitoring Relation Processing

```http
GET /v1/partner-user-provision/{provision_id}
```

**Response at this stage:**
```json
{
  "Response": [{
    "PartnerUserProvision": {
      "status": "CREATED",
      "sub_status": "PENDING_PROCESS_RELATION_USER",
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

The partner-user relationship is being established. `label_user` contains the user's details.
