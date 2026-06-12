# Chapter 6: Payments

## Create a payment

```http
POST /v1/user/{user_id}/monetary-account/{account_id}/payment

{
  "amount": {
    "value": "10.00",
    "currency": "EUR"
  },
  "counterparty_alias": {
    "type": "IBAN",
    "value": "NL91ABNA0417164300",
    "name": "Counterparty Name"
  },
  "description": "Payment description"
}
```

| Field | Required | Description |
|---|---|---|
| `amount.value` | ✅ | Decimal string (e.g. `"10.00"`) |
| `amount.currency` | ✅ | Must match the account currency |
| `counterparty_alias.type` | ✅ | Must be `IBAN` |
| `counterparty_alias.value` | ✅ | Recipient's IBAN |
| `counterparty_alias.name` | | Recipient's display name |
| `description` | ✅ | Max 140 characters |
| `merchant_reference` | | Optional tracking reference (max 35 chars) |

> ⚠️ **Payment restrictions:** For provisioned users without PSD2 access, only internal transfers between Eva's account and the partner's account are allowed. External IBAN transfers require PSD2 access.

> Payments require a request signature (`X-Bunq-Client-Signature`). The MCP handles this automatically.

**Response:**
```json
{
  "Response": [{ "Id": { "id": 9876 } }]
}
```

## Get payment details

```http
GET /v1/user/{user_id}/monetary-account/{account_id}/payment/{payment_id}
```

## List all payments

```http
GET /v1/user/{user_id}/monetary-account/{account_id}/payment
```

Returns all incoming (positive amounts) and outgoing (negative amounts) payments for the account.

**Payment statuses:**

| Status | Meaning |
|---|---|
| `PENDING` | Being processed |
| `SETTLED` | Completed successfully |
| `REJECTED` | Rejected by bank |
| `CANCELLED` | Cancelled before processing |
