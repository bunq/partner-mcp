# Device Registration

Registering a device links your API key to a specific server. bunq ensures that only pre-approved machines can make API calls, significantly reducing attack surfaces by restricting access to known, registered devices.

## Call the device-server endpoint

Pass the `installation_token` from the previous step in `X-Bunq-Client-Authentication`.

```http
POST /v1/device-server
X-Bunq-Client-Authentication: <installation_token>
X-Bunq-Client-Signature: <signature>
Content-Type: application/json

{
  "description": "My Partner Server",
  "secret": "<your_api_key>",
  "permitted_ips": ["*"]
}
```

**Fields:**

| Field | Description |
|---|---|
| `description` | Human-readable name for this device |
| `secret` | Your bunq Partner API key |
| `permitted_ips` | IP addresses allowed to use this device. Use `["*"]` to allow all, or specify IPv4 addresses. IPv6 is not currently supported. |

> **Note:** When using a standard API key, the DeviceServer and Installation are linked to the IP address where they were created. You cannot add new IP addresses later. Use `["*"]` if your server IP may change.

## Response

```json
{
  "Response": [
    { "Id": { "id": 42 } }
  ]
}
```

## What's next

Proceed to [Start a Session](./session.md).
