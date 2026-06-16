# Creating the Installation

Installation is the first step in activating your API key. It creates an **API context** — a secure foundation for all future interactions. This step ensures that the API key is properly registered and associated with a trusted device, reducing the risk of unauthorized access.

## Generate a key pair

First, generate a public-private RSA key pair:

```bash
openssl genrsa -out installation.key && \
openssl rsa -in installation.key -outform PEM -pubout -out installation.pub
```

Your keys are stored at:
- `$(pwd)/installation.pub` — public key (sent to bunq)
- `$(pwd)/installation.key` — private key (kept secret, used to sign requests)

## Call the installation endpoint

```http
POST /v1/installation
Host: partner-api.sandbox.bunq.com
Content-Type: application/json

{
  "client_public_key": "<contents of installation.pub>"
}
```

## Response

```json
{
  "Response": [
    { "Id": { "id": 1 } },
    { "Token": { "token": "installation_token_here" } },
    { "ServerPublicKey": { "server_public_key": "-----BEGIN PUBLIC KEY-----\n..." } }
  ]
}
```

Save all three values:
- `Id.id` — your installation ID
- `Token.token` — the **installation token**, used to authenticate device and session creation
- `ServerPublicKey.server_public_key` — bunq's public key, used to verify response signatures

## What's next

With the `installation_token` and `server_public_key` in hand, proceed to [Device Registration](./device-registration.md).
