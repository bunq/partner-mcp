# Non-EUR Monetary Account

Creates an external account for non-EUR currencies via CurrencyCloud.

```http
POST /v1/user/{user_id}/monetary-account-external

{
  "currency": "GBP",
  "service": "CURRENCY_CLOUD",
  "description": "GBP Account",
  "display_name": "Jan de Vries"
}
```

| Field | Required | Description |
|---|---|---|
| `currency` | ✅ | ISO-4217 currency code (non-EUR) |
| `service` | ✅ | Must be `CURRENCY_CLOUD` |
| `description` | | Account display name |
| `display_name` | | Legal name of the user or company |
| `daily_limit` | | Max daily spending (max €10,000 equivalent) |

**Response:**
```json
{
  "Response": [{ "Id": { "id": 5678 } }]
}
```
