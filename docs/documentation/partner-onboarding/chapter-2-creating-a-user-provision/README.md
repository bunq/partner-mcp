# Chapter 2: Creating a User Provision

Provisioning a user is the initial step in the process of creating a user account within the bunq platform. This step involves assigning basic user attributes and configurations, such as unique identifiers, contact method, and necessary personal details. By completing this step, you obtain an API Key in order to do actions on-behalf-of the user (such as finalizing the onboarding and then creating monetary accounts, cards, payments etc).

## User Person

**Endpoint:**

```http
POST /v1/partner-user-provision

{
    "external_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "user_verified_type": "PARTNER_USER_PERSON",
    "email": "testemail1@test.com",
    "phone_number": "+31123456789",
    "products": ["USER_VERIFIED"]
}
```

> 📝 **Last updated:** 2026-02-20\
> See related changes in [Changelog](/broken/pages/qBSZV9msurxBTbHkR6mF#id-2026-02-24)

**Parameters:**

| Field           | Type   | Required | Description                                                                |
| --------------- | ------ | -------- | -------------------------------------------------------------------------- |
| `external_uuid` | string | Yes      | Unique identifier for this provision request. Must be a valid UUID.        |
| `products`      | array  | Yes      | List of products to provision for the user. In this case,  `USER_VERIFIED` |
| `email`         | string | Yes      | A verified email given by the user.                                        |
| `phone_number`  | string | Yes      | A verified Phone Number given by the user.                                 |

**Response:**

```json
{
    "Response": [
        {
            "PartnerUserProvision": {
                "id": 429307,
                "created": "2026-02-10 18:33:15.807152",
                "updated": "2026-02-10 18:33:15.807152",
                "external_uuid": "6ecb48d1-0568-47ff-bfd3-9e6703669b02",
                "status": "CREATED",
                "sub_status": "PENDING_PROCESS_USER",
                "action_required": "SYSTEM",
                "products": [
                    "USER_VERIFIED"
                ],
                "label_user": null,
                "oauth_request": null,
                "credential": null
            }
        }
    ]
}
```

The response contains the `provision_id` used for monitoring. Save this ID for monitoring the provision status.

## User Company (Under development)

**Endpoint:**

```http
POST /v1/partner-user-provision

{
    "external_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "user_verified_type": "PARTNER_USER_COMPANY",
    "email": "testemail1@test.com",
    "phone_number": "+31123456789",
    "products": ["COMPANY_VERIFIED"],
    "director_relation_provision_id": 123 // The PartnerUserProvision ID of the Director
}
```

**Response:**

```json
{
    "Response": [
        {
            "PartnerUserProvision": {
                "id": 429307,
                "created": "2026-02-10 18:33:15.807152",
                "updated": "2026-02-10 18:33:15.807152",
                "external_uuid": "6ecb48d1-0568-47ff-bfd3-9e6703669b02",
                "status": "CREATED",
                "sub_status": "PENDING_PROCESS_USER",
                "action_required": "SYSTEM",
                "products": [
                    "COMPANY_VERIFIED"
                ],
                "label_user": null,
                "oauth_request": null,
                "credential": null
            }
        }
    ]
}
```

The response contains the `provision_id` used for monitoring. Save this ID for monitoring the provision status.

