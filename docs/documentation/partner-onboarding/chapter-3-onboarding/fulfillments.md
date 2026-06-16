# Complete the Fulfillments

These calls are made using the **provisioned user's session token**, not the partner's session token.

> **Note:** Fulfillment endpoints do not require a fixed or unmasked IP address. Requests from server-side integrations behind a VPN, proxy, or corporate NAT are accepted regardless of IP geolocation.

## Set main address

```http
POST /v1/user/{user_id}/address-main

{
  "address_main": {
    "street": "Keizersgracht",
    "house_number": "116",
    "postal_code": "1015 CW",
    "city": "Amsterdam",
    "country": "NL"
  }
}
```

## Set postal address

```http
POST /v1/user/{user_id}/address-postal

{
  "address_postal": {
    "street": "Keizersgracht",
    "house_number": "116",
    "postal_code": "1015 CW",
    "city": "Amsterdam",
    "country": "NL"
  }
}
```

## Set personal information

```http
PUT /v1/user-person/{user_id}

{
  "first_name": "Jan",
  "middle_name": "",
  "last_name": "de Vries",
  "date_of_birth": "1990-05-15"
}
```

## Set tax residency (required within 90 days)

```http
POST /v1/user/{user_id}/tax-resident

{
  "tax_resident": [
    {
      "country": "NL",
      "tax_number": "426702311",
      "status": "CONFIRMED"
    }
  ]
}
```

## Set nationality (required within 90 days)

```http
POST /v1/user/{user_id}/nationality

{
  "all_nationality": ["NL"]
}
```
