# Chapter 5: Monetary Accounts

Monetary accounts are the core financial containers in bunq. Each account has its own balance, transaction history, IBAN (for EUR accounts), and status.

## Account types

| Type | Description |
|---|---|
| `MonetaryAccountBank` | Standard IBAN account for EUR transactions |
| `MonetaryAccountExternal` | Non-EUR account via CurrencyCloud |

## Account statuses

| Status | Meaning |
|---|---|
| `ACTIVE` | Fully operational |
| `BLOCKED` | Access restricted |
| `CANCELLED` | Permanently closed |
| `FROZEN` | Temporarily suspended (regulatory/compliance) |

## List all accounts for a user

```http
GET /v1/user/{user_id}/monetary-account
```
