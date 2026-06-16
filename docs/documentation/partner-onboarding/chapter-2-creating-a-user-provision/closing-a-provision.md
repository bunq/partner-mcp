# Closing a Provision

To cancel a provision, set its status to `CANCELLED`:

```http
PUT /v1/partner-user-provision/{provision_id}

{
  "status": "CANCELLED"
}
```

**Response:**
```json
{
  "Response": [{ "Id": { "id": 123 } }]
}
```

After cancellation, the provision status becomes `CLOSED`.

## Status reference

| Status | Meaning |
|---|---|
| `CREATED` | Provision created, processing in progress |
| `ACTIVE` | Provision fully active and operational |
| `CANCELLED` | Cancellation requested |
| `FAILED` | Provision failed during processing |
| `CLOSED` | Provision closed and no longer active |

## Sub-status reference

| Sub-status | Main status | Meaning |
|---|---|---|
| `NONE` | Any | No specific sub-process active |
| `PENDING_PROCESS_USER` | `CREATED` | Creating bunq user account |
| `PENDING_PROCESS_RELATION_USER` | `CREATED` | Establishing partner-user relationship |
| `PENDING_PROCESS_OAUTH_REQUEST` | `CREATED` | Setting up OAuth access |
| `PENDING_PROCESS_USER_ONBOARDING` | `CREATED` | User ready for onboarding |
| `PENDING_PROCESS_CLOSURE` | `CANCELLED` | Closure in progress |
| `PENDING_PROCESS_TOKEN_RESET` | `TOKEN_RESET_REQUESTED` | New credential being generated |
