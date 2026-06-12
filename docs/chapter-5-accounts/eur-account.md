# EUR Monetary Account

Creates a full IBAN bank account for the user.

```http
POST /v1/user/{user_id}/monetary-account-bank

{
  "currency": "EUR",
  "description": "Main Account"
}
```

**Response:**
```json
{
  "Response": [{ "Id": { "id": 1234 } }]
}
```

The account will have a unique IBAN assigned automatically. Retrieve it via:

```http
GET /v1/user/{user_id}/monetary-account-bank/{account_id}
```

The IBAN is in the `alias` array with `type: "IBAN"`.
