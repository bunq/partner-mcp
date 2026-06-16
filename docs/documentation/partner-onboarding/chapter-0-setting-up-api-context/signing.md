# Signing

## Why signing is required

For certain API calls — specifically any request that **creates or accepts a payment** — bunq requires a request signature. This allows bunq to detect whether the request body has been tampered with in transit. If you forget to sign a payment request, you'll receive error `466`.

## What is a signature?

A signature is an additional header — `X-Bunq-Client-Signature` — containing a base64-encoded RSA-SHA256 hash of the **request body only** (not headers or the URL).

## How to sign a request

1. Take the raw request body as a string
2. Sign it using SHA256 and your private key (PKCS #1 v1.5 padding)
3. Base64-encode the result
4. Pass it in the `X-Bunq-Client-Signature` header

**PHP example:**
```php
openssl_sign($requestBody, $signature, $privateKey, OPENSSL_ALGO_SHA256);
$encodedSignature = base64_encode($signature);
```

**Example signed payment request:**
```bash
curl 'https://partner-api.sandbox.bunq.com/v1/user/1800297/monetary-account/1989601/payment' \
  --header 'X-Bunq-Client-Authentication: <session_token>' \
  --header 'X-Bunq-Client-Signature: eMymd9ynLx+j5tpcoPMlaJ7...' \
  --data '{
    "amount": { "value": "0.10", "currency": "EUR" },
    "counterparty_alias": { "type": "IBAN", "value": "NL91ABNA0417164300", "name": "Test" },
    "description": "Test payment"
  }'
```

## Troubleshooting error 466

If you're getting invalid signature errors, check:

- ✅ You have a key pair generated from the installation step
- ✅ You're using SHA256 with PKCS #1 v1.5 padding
- ✅ You're signing **only the request body** (no headers, no URL)
- ✅ You're base64-encoding the signature before sending
- ✅ There are no extra spaces or trailing line breaks in the body
- ✅ The body you sign is identical to the body you send

> The MCP server handles signing automatically for all tool calls that require it.

## Response signatures

bunq also signs its responses using its server private key. The signature is in the `X-Bunq-Server-Signature` response header. You can verify it using the server public key received during installation.
