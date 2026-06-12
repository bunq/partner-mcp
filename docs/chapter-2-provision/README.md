# Chapter 2: Creating a User Provision

Provisioning a user is the initial step in creating a user account within bunq. By completing this step, you obtain an API key to perform actions on behalf of the user — such as finalising onboarding, creating monetary accounts, cards, and payments.

## Create a UserPerson provision

```http
POST /v1/partner-user-provision

{
  "external_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "user_verified_type": "PARTNER_USER_PERSON",
  "email": "user@example.com",
  "phone_number": "+31612345678",
  "products": ["USER_VERIFIED"]
}
```

| Field | Required | Description |
|---|---|---|
| `external_uuid` | ✅ | Your unique UUID for this user (for deduplication). Must be a valid UUID. |
| `user_verified_type` | ✅ | `PARTNER_USER_PERSON` for individuals, `PARTNER_USER_COMPANY` for companies |
| `email` | ✅ | Verified email address of the user |
| `phone_number` | ✅ | Verified phone number (e.g. `+31612345678`) |
| `products` | ✅ | Array of products to provision. Currently: `USER_VERIFIED` |

**Response:**
```json
{
  "Response": [{
    "PartnerUserProvision": {
      "id": 429307,
      "created": "2026-02-10 18:33:15.807152",
      "updated": "2026-02-10 18:33:15.807152",
      "external_uuid": "550e8400-e29b-41d4-a716-446655440000",
      "status": "CREATED",
      "sub_status": "PENDING_PROCESS_USER",
      "action_required": "SYSTEM",
      "products": ["USER_VERIFIED"],
      "label_user": null,
      "oauth_request": null,
      "credential": null
    }
  }]
}
```

Save the `id` as your `provision_id` — you'll use it to monitor progress.

## UserCompany provision (under development)

```http
POST /v1/partner-user-provision

{
  "external_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "user_verified_type": "PARTNER_USER_COMPANY",
  "email": "company@example.com",
  "phone_number": "+31612345678",
  "products": ["COMPANY_VERIFIED"],
  "director_relation_provision_id": 123
}
```

`director_relation_provision_id` is the `PartnerUserProvision.id` of the Director (a previously provisioned UserPerson).

## Monitoring the provision

After creating a provision, poll `GET /v1/partner-user-provision/{provision_id}` to track progress through the following sub-statuses:

| Sub-status | What's happening |
|---|---|
| `PENDING_PROCESS_USER` | bunq user account is being created |
| `PENDING_PROCESS_RELATION_USER` | Partner-user relationship is being established |
| `PENDING_PROCESS_OAUTH_REQUEST` | OAuth access is being set up |
| `PENDING_PROCESS_USER_ONBOARDING` | User is ready for onboarding |

See the monitoring pages for detailed response examples at each stage.
