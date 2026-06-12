# Chapter 7: Cards

## Create a credit card

```http
POST /v1/user/{user_id}/card-credit

{
  "second_line": "Jan de Vries",
  "type": "MASTERCARD",
  "product_type": "MASTERCARD_CREDIT_CO_BRANDED",
  "product_sub_type": "<partner_specific_value>",
  "order_status": "VIRTUAL_DELIVERY"
}
```

| Field | Description |
|---|---|
| `second_line` | Text on the second line of the card (max 17 chars) |
| `product_type` | `MASTERCARD_CREDIT_CO_BRANDED` or `MASTERCARD_BUSINESS_CO_BRANDED` |
| `product_sub_type` | Partner-specific value that determines card design |
| `order_status` | `VIRTUAL_DELIVERY` for immediate use, `NEW_CARD_REQUEST_RECEIVED` for physical delivery |

## Create a debit card

```http
POST /v1/user/{user_id}/card-debit

{
  "second_line": "Jan de Vries",
  "type": "MASTERCARD",
  "product_type": "<partner_specific_value>",
  "order_status": "VIRTUAL_DELIVERY"
}
```

## Get card details

```http
GET /v1/user/{user_id}/card/{card_id}
```

## List all cards

```http
GET /v1/user/{user_id}/card
```

## Update a card

Use this to activate a card after delivery, change its status, or update limits.

```http
PUT /v1/user/{user_id}/card/{card_id}

{
  "status": "ACTIVE"
}
```

| Status | Description |
|---|---|
| `ACTIVE` | Activate the card |
| `DEACTIVATED` | Temporarily deactivate |
| `LOST` | Report as lost (permanent) |
| `STOLEN` | Report as stolen (permanent) |
| `CANCELLED` | Cancel permanently (requires `cancellation_reason`) |

**Update spending limits:**
```json
{
  "card_limit": { "value": "500.00", "currency": "EUR" },
  "card_limit_atm": { "value": "200.00", "currency": "EUR" }
}
```

## Card statuses

| Status | Meaning |
|---|---|
| `ACTIVE` | Card is active and usable |
| `DEACTIVATED` | Temporarily deactivated |
| `LOST` | Reported as lost |
| `STOLEN` | Reported as stolen |
| `CANCELLED` | Permanently cancelled |
| `EXPIRED` | Card has expired |
| `PIN_TRIES_EXCEEDED` | Blocked after too many wrong PIN attempts |
