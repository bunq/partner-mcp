# Partner Onboarding

## Overview <a href="#overview" id="overview"></a>

The Partner User Provision API allows partners to create and manage user accounts through bunq's partner infrastructure. This API handles the complete lifecycle of user creation:

1. Setting up the company account
2. Create a session securely via “API Context” calls
3. Setting up Oauth Client
4. Provisioning the users within the bunq platform
5. Complete onboarding KYC requirements
6. Finally, perform all actions on-behalf-of the provisioned users (Payments, Accounts, Cards and more)

The API follows an asynchronous processing model where user creation happens in background processes, with status updates available through polling.

## Prerequisites <a href="#prerequisites" id="prerequisites"></a>

Before using this API, ensure you have:

1. Partner Directory: An active partner directory with appropriate permissions — bunq to configure for sandbox and production
2. OAuth Client: OAuth client credentials configured for your partner account
   1. See Chapter 1
3. Authentication: Valid partner session tokens
4. Products: Access to the required products (e.g., `USER_VERIFIED`)

## Host URL for the API endpoints

<pre><code><strong>Sandbox
</strong><strong>https://partner-api.sandbox.bunq.com
</strong></code></pre>

<pre><code><strong>Production
</strong><strong>https://api.partner.bunq.com
</strong></code></pre>

## Postman Collection

{% file src="/broken/files/BSgiHOpYr5THLE5CrPO1" %}
