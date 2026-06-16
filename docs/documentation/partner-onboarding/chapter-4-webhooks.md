# Chapter 4: Webhooks

> 📝 **Last updated:** 2026-02-24\
> See related changes in [Changelog](/broken/pages/qBSZV9msurxBTbHkR6mF#id-2026-02-24)

Instead of polling, you can subscribe to webhook notifications to receive real-time updates about provision status changes or when compliance information inquires are created, or payments/cards etc.

## Subscribing to Webhooks

{% openapi-operation spec="partner-api" path="/user/{userId}/notification-filter-url" method="post" %}
[OpenAPI partner-api](https://4401d86825a13bf607936cc3a9f3897a.r2.cloudflarestorage.com/gitbook-x-prod-openapi/raw/6c8614bfe9f05aadd99fd055b7a2b727e8d7c5d35406fa397fa4e1c591688cfe.yaml?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=dce48141f43c0191a2ad043a6888781c%2F20260616%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260616T092017Z&X-Amz-Expires=172800&X-Amz-Signature=624d208b63fde489aaabe445efe1969d17e7c27587ed42d6f2a2fe0aff991c5b&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
{% endopenapi-operation %}

## Callback Categories

<details>

<summary>Callback Categories</summary>

#### Partner User Provision

| Category                 | Event Type                               | Explanation                                  |
| ------------------------ | ---------------------------------------- | -------------------------------------------- |
| `PARTNER_USER_PROVISION` | `PARTNER_USER_PROVISION_PROCESS_UPDATED` | Partner user provisioning properties changed |
| `USER_ONBOARDING`        | `USER_ONBOARDING_UPDATED`                | `User onboarding process status updated`     |

#### Compliance Inquiry

<table><thead><tr><th>Category</th><th width="263.134521484375">Event Type</th><th>Explanation</th></tr></thead><tbody><tr><td><code>USER_INFORMATION_INQUIRY</code></td><td><code>USER_INFORMATION_INQUIRY_EXPECTING_REPLY_FROM_USER</code></td><td>Compliance inquiry requiring user response</td></tr><tr><td><code>USER_INFORMATION_INQUIRY</code></td><td><code>USER_INFORMATION_INQUIRY_EXPECTING_REPLY_FROM_BUNQ</code> </td><td>Compliance inquiry requiring bunq review</td></tr><tr><td><code>USER_INFORMATION_INQUIRY</code></td><td><code>USER_INFORMATION_INQUIRY_FINALIZED</code></td><td>Compliance inquiry finalized.</td></tr><tr><td><code>SUPPORT</code></td><td><code>SUPPORT_MESSAGE_USER_TEXT_RECEIVED</code></td><td>Message from User via support is received</td></tr></tbody></table>

#### Transactions

| Category   | Event Type              | Explanation                                                |
| ---------- | ----------------------- | ---------------------------------------------------------- |
| `MUTATION` | `MUTATION_CREATED`      | Event where account balance is decreased                   |
| `MUTATION` | `MUTATION_RECEIVED`     | Event where account balance is increased                   |
| `PAYMENT`  | `PAYMENT_CREATED`       | User initiates a payment - sent to sender                  |
| `PAYMENT`  | `PAYMENT_RECEIVED`      | User receives a payment                                    |
| `PAYMENT`  | `PAYMENT_CLAIMED`       | Payment request has been accepted and processed            |
| `PAYMENT`  | `PAYMENT_REJECTED`      | Payment is rejected due to validation or processing issues |
| `PAYMENT`  | `PAYMENT_REVOKED`       | Payment is cancelled before processing                     |
| `PAYMENT`  | `PAYMENT_EXPIRED`       | Payment expires without being processed                    |
| `PAYMENT`  | `PAYMENT_BATCH_CREATED` | Batch payment is created                                   |
| `PAYMENT`  | `PAYMENT_BATCH_REVOKED` | Batch payment is cancelled                                 |

#### Card Transactions

| Category                      | Event Type                         | Explanation                                                                  |
| ----------------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| `CARD_TRANSACTION_SUCCESSFUL` | `CARD_PAYMENT_ALLOWED`             | Card payment approved and processed                                          |
| `CARD_TRANSACTION_SUCCESSFUL` | `CARD_WITHDRAWAL_ALLOWED`          | ATM withdrawal approved and processed                                        |
| `CARD_TRANSACTION_SUCCESSFUL` | `CARD_REVERSAL_ALLOWED`            | Merchant successfully reversed the payment                                   |
| `CARD_TRANSACTION_SUCCESSFUL` | `CARD_RESERVATION_ALLOWED`         | Pre-authorization allowed and unfinalized amount is reserved to be collected |
| `CARD_TRANSACTION_SUCCESSFUL` | `CARD_RESERVATION_FINALIZED`       | Pre-authorization is finalized and final amount is determined.               |
| `CARD_TRANSACTION_FAILED`     | `CARD_TRANSACTION_NOT_ALLOWED`     | Card transaction declined for various reasons                                |
| `CARD_TRANSACTION_UPDATED`    | `CARD_PAYMENT_UPDATED`             | Card transaction is updated (potentially amount is changed)                  |
| `CARD_TRANSACTION_UPDATED`    | `CARD_PAYMENT_SETTLED`             | Card transaction received a clearing.                                        |
| `CARD_TRANSACTION_REFUND`     | `CARD_TRANSACTION_REFUND_APPROVED` | Refund requested by the user was approved                                    |
| `CARD_TRANSACTION_REFUND`     | `CARD_TRANSACTION_REFUND_DENIED`   | Refund requested by the user was denied                                      |

#### Card and Tokenization (Apple/Google Pay)

| Category            | Event Type             | Explanation                                                      |
| ------------------- | ---------------------- | ---------------------------------------------------------------- |
| `CARD`              | `CARD_UPDATED`         | Card properties are updated                                      |
| `CARD_TOKENIZATION` | `CARD_TOKEN_ACTIVATED` | Card token activated for wallet                                  |
| `CARD_TOKENIZATION` | `CARD_TOKEN_SUSPENDED` | Card token suspended temporarily                                 |
| `CARD_TOKENIZATION` | `CARD_TOKEN_DELETED`   | Card token removed and permanently deleted                       |
| `CARD_TOKENIZATION` | `CARD_TOKEN_UPDATED`   | Card token details updated, for example expiry date is extended. |

#### Requests

| Category  | Event Type                          | Explanation                                                |
| --------- | ----------------------------------- | ---------------------------------------------------------- |
| `REQUEST` | `REQUEST_INQUIRY_CREATED`           | Payment request sent to someone and is pending acceptance. |
| `REQUEST` | `REQUEST_INQUIRY_ACCEPTED`          | Recipient approved the request.                            |
| `REQUEST` | `REQUEST_INQUIRY_REJECTED`          | Recipient declined the request.                            |
| `REQUEST` | `REQUEST_INQUIRY_REVOKED`           | Payment request cancelled                                  |
| `REQUEST` | `REQUEST_INQUIRY_EXPIRED`           | Payment request expired                                    |
| `REQUEST` | `REQUEST_RESPONSE_CREATED`          | Response to payment request                                |
| `REQUEST` | `REQUEST_RESPONSE_ACCEPTED`         | Response approved                                          |
| `REQUEST` | `REQUEST_RESPONSE_REJECTED`         | Response declined                                          |
| `REQUEST` | `REQUEST_RESPONSE_REVOKED`          | Response cancelled                                         |
| `REQUEST` | `REQUEST_RESPONSE_EXPIRED`          | Response expired                                           |
| `REQUEST` | `REQUEST_RESPONSE_REFUND_REQUESTED` | Refund requested for response                              |
| `REQUEST` | `REQUEST_RESPONSE_REFUNDED`         | Response refunded                                          |

</details>

### Callback Examples

<details>

<summary><strong>Webhook Body Example (<code>USER_INFORMATION_INQUIRY</code>):</strong></summary>

<pre class="language-json"><code class="lang-json">{
    "NotificationUrl": {
        "target_url": "https://your-webhook-endpoint.com/notifications",
        "category": "USER_INFORMATION_INQUIRY",
        "event_type": "USER_INFORMATION_INQUIRY_EXPECTING_REPLY_FROM_USER",
        "object": {
            "UserInformationInquiry": {
                "id": 17,
                "created": "2025-08-13 15:32:55.697184",
<strong>                "updated": "2025-08-13 15:32:55.817014",
</strong>                "user_id": 1358,
                "title": "We need additional information",
                "subtitle": "To continue your bunq experience, please provide the following information.",
                "purpose": "COMPLIANCE_TRANSACTION_MONITORING",
                "all_entry": [
                    {
                        "UserInformationInquiryEntry": {
                            "id": 17,
                            "created": "2025-08-13 15:32:55.755341",
                            "updated": "2025-08-13 15:32:55.755341",
                            "type": "USER_PERSON_SOURCE_OF_FUND",
                            "status": "PENDING",
                            "all_data_submitted": [],
                            "assistant_conversation": {
                                "id": 17,
                                "created": "2025-08-13 15:32:55.750785",
                                "updated": "2025-08-13 15:32:55.750785",
                                "user_id": 1358,
                                "user_subject_id": 1358,
                                "label_user": {
                                    "uuid": "d556bfc8-c1d4-4d79-a758-e3c2f9360546",
                                    "display_name": "New bunqer",
                                    "country": "NL",
                                    "avatar": {...},
                                    "public_nick_name": "New bunqer",
                                    "type": "PERSON"
                                },
                                "assistant_id": 18,
                                "type": "USER_INFORMATION_INQUIRY",
                                "typing_indicator_status": "INACTIVE",
                                "feedback_status": "NONE",
                                "read_status": "READ"
                            },
                            "context": [],
                            "reject_reason": null
                        }
                    }
                ],
                "assistant_conversation": {...}
            }
        }
    }
}
</code></pre>

**Webhook fields:**

**NotificationUrl Object:**

| `target_url` | Your configured webhook endpoint URL                     |
| ------------ | -------------------------------------------------------- |
| `category`   | Notification category (e.g., `USER_INFORMATION_INQUIRY`) |
| `event_type` | Specific event type within the category                  |
| `object`     | The actual object that triggered the notification        |

**UserInformationInquiry Object:**

| `id`                     | Unique identifier for the inquiry                                  |
| ------------------------ | ------------------------------------------------------------------ |
| `created`                | Timestamp when the inquiry was created                             |
| `updated`                | Timestamp when the inquiry was last updated                        |
| `user_id`                | ID of the user for whom the inquiry was created                    |
| `title`                  | Title of the inquiry (e.g., "We need additional information")      |
| `subtitle`               | Subtitle explaining the inquiry purpose                            |
| `purpose`                | Purpose of the inquiry (e.g., `COMPLIANCE_TRANSACTION_MONITORING`) |
| `all_entry`              | Array of inquiry entries with specific information requests        |
| `assistant_conversation` | Conversation details for user interaction                          |

**UserInformationInquiryEntry Object:**

| `id`                     | Unique identifier for the inquiry entry                            |
| ------------------------ | ------------------------------------------------------------------ |
| `type`                   | Type of information requested (e.g., `USER_PERSON_SOURCE_OF_FUND`) |
| `status`                 | Status of the entry (e.g., `PENDING`)                              |
| `all_data_submitted`     | Array of data submitted by the user                                |
| `assistant_conversation` | Conversation context for this specific entry                       |
| `context`                | Additional context information                                     |
| `reject_reason`          | Reason for rejection (if applicable)                               |



</details>

<details>

<summary><strong>Webhook Body Example (<code>PARTNER_USER_PROVISION</code>):</strong></summary>

```http
{
  "NotificationUrl": {
    "target_url": "https://webhook.site/73fef6b5-f7ba-419b-b65f-f66199489903",
    "category": "PARTNER_USER_PROVISION",
    "event_type": "PARTNER_USER_PROVISION_PROCESS_UPDATED",
    "object": {
      "PartnerUserProvision": {
        "id": 7,
        "created": "2025-09-03 08:24:13.795007",
        "updated": "2025-09-03 08:24:14.266407",
        "external_uuid": "f8b69bdd-e2fa-4161-9ff7-f4c597f8be8e",
        "status": "ACTIVE",
        "sub_status": "NONE",
        "action_required": "NONE",
        "products": [
          "USER_ANONYMOUS_TRANSACTION_AUDIT"
        ],
        "label_user": {
          "uuid": "ae92e7da-59d6-4dcd-a99b-0109baa5aebc",
          "display_name": "New bunqer",
          "country": "NL",
          "avatar": {
            "uuid": "353e5068-1254-4422-b949-596b9f86ebeb",
            "image": [
              {
                "attachment_public_uuid": "229705c3-9d5c-424f-abc4-3f84559abd6f",
                "height": 640,
                "width": 640,
                "content_type": "image/png",
                "urls": [
                  {
                    "type": "ORIGINAL",
                    "url": "https://bunq-triage-model-storage-public.s3.eu-central-1.amazonaws.com/bunq_file/File/content/e627dab1418debb69a8ab983e7cd99a7b0cb8c289892dde90a8b2f12d5e23140.png"
                  }
                ]
              }
            ],
            "anchor_uuid": "ae92e7da-59d6-4dcd-a99b-0109baa5aebc",
            "style": "NONE"
          },
          "public_nick_name": "New bunqer",
          "type": "PERSON"
        },
        "oauth_request": {
          "uuid": "c59a2b0d-1a16-4a5e-9ad7-93f4921d5b52",
          "created": "2025-09-03 08:24:14.110949",
          "updated": "2025-09-03 08:24:14.182413",
          "oauth_client_id": 13383,
          "oauth_client_display_name": null,
          "response_type": "code",
          "callback_url": "https://yourpartner.com/oauth/callback",
          "status": "ACCEPTED",
          "state": null,
          "authorization_code": "b967643d4c76956b550553a0ebd94f1024c734d0ebaefdca00d42d1f1bfae274",
          "user_alias_created": {
            "uuid": "490f019f-6e1c-4891-b2de-da9e85a12644",
            "display_name": "Sutton Onderlinge Waarborgmaatschappij",
            "country": "000",
            "avatar": {
              "uuid": "9debf55b-70b1-4d43-8d51-d6e7bd42fb5b",
              "image": [
                {
                  "attachment_public_uuid": "4b7e0d1d-9167-48ac-990a-70e342c87812",
                  "height": 126,
                  "width": 200,
                  "content_type": "image/jpeg",
                  "urls": [
                    {
                      "type": "ORIGINAL",
                      "url": "https://bunq-triage-model-storage-public.s3.eu-central-1.amazonaws.com/bunq_file/File/content/6979a145b7ea9ecc3459358122cb560608f02d36d4b8cd6b770f50e36aa35512.jpg"
                    }
                  ]
                }
              ],
              "anchor_uuid": "490f019f-6e1c-4891-b2de-da9e85a12644",
              "style": "NONE"
            },
            "public_nick_name": "Sutton Onderlinge Waarborgmaatschappij",
            "type": "COMPANY"
          },
          "redirect_url": "https://yourpartner.com/oauth/callback?code=b967643d4c76956b550553a0ebd94f1024c734d0ebaefdca00d42d1f1bfae274",
          "type": "BUNQ"
        },
        "credential": {
          "id": 2412203,
          "created": "2025-09-03 08:24:14.178726",
          "updated": "2025-09-03 08:24:14.178726",
          "status": "PENDING_FIRST_USE",
          "expiry_time": "2025-09-03 09:24:14.178685",
          "token_value": "a0239a79b1a8d4429062bbcbdccf30cfda06eb6a2a8effc041085135e36d63d4",
          "permitted_device": null
        }
      }
    }
  }
}
```

</details>

## Recovering Failed Webhooks <a href="#retry-mechanisms" id="retry-mechanisms"></a>

When the execution of a callback fails (e.g. the callback server is down or the response contains an error), we try to resend it for a maximum of 5 times, with an interval of one minute between each try. If your server is not reachable by the callback after the 6th total try, the callback is not sent anymore.

### Listing of failed Webhooks <a href="#listing-of-failed-callbacks" id="listing-of-failed-callbacks"></a>

After the sixth attempt of callback executing, the failed entry is stored and can be listed by UserApiKey

{% openapi-operation spec="partner-api" path="/user/{userId}/notification-filter-failure" method="get" %}
[OpenAPI partner-api](https://4401d86825a13bf607936cc3a9f3897a.r2.cloudflarestorage.com/gitbook-x-prod-openapi/raw/6c8614bfe9f05aadd99fd055b7a2b727e8d7c5d35406fa397fa4e1c591688cfe.yaml?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=dce48141f43c0191a2ad043a6888781c%2F20260616%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260616T092017Z&X-Amz-Expires=172800&X-Amz-Signature=624d208b63fde489aaabe445efe1969d17e7c27587ed42d6f2a2fe0aff991c5b&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
{% endopenapi-operation %}

{% openapi-operation spec="partner-api" path="/user/{userId}/notification-filter-failure" method="post" %}
[OpenAPI partner-api](https://4401d86825a13bf607936cc3a9f3897a.r2.cloudflarestorage.com/gitbook-x-prod-openapi/raw/6c8614bfe9f05aadd99fd055b7a2b727e8d7c5d35406fa397fa4e1c591688cfe.yaml?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=dce48141f43c0191a2ad043a6888781c%2F20260616%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260616T092017Z&X-Amz-Expires=172800&X-Amz-Signature=624d208b63fde489aaabe445efe1969d17e7c27587ed42d6f2a2fe0aff991c5b&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
{% endopenapi-operation %}

## **Webhook Security (Optional):**

* Webhooks are sent as POST requests to your configured URL
* Certificate Pinning can be registered for webhooks so that bunq validates that the certificate of the recipient and the certificate shared match.
* For more information -> [https://doc.bunq.com/basics/callbacks-webhooks#certificate-pinning](https://doc.bunq.com/basics/callbacks-webhooks#certificate-pinning)
* In addition, it is possible to also validate the vice-versa that bunq is the sender. If configured, bunq will send you their certificate which you can validate if its a match upon receiving the webhook.
  * To set this up, upon creation of `notification_filters[]` send also:
  * <pre><code><strong>"all_verification_type": ["BUNQ_CERTIFICATE"]
    </strong></code></pre>
  * bunq will send you the applicable certificate (for sandbox and production) separately

### Receiving Callbacks <a href="#receiving-callbacks" id="receiving-callbacks"></a>

* Callbacks for the sandbox environment will be made from different IP's at AWS.
* Callbacks for the production environment will be made from 185.40.108.0/22.

_The IP addresses might change_. We will notify you in a timely fashion if such a change is planned.

### Certificate Pinning <a href="#certificate-pinning" id="certificate-pinning"></a>

We recommend that you use certificate pinning as an extra security measure. We will check if the certificate of the recipient server matches the pinned certificate that you provided and cancel the callback if the check fails or we detect a mismatch.

#### How to set up certificate pinning <a href="#how-to-set-up-certificate-pinning" id="how-to-set-up-certificate-pinning"></a>

1.  Retrieve the SSL certificate of your server using the following command:

    `openssl s_client -servername www.example.com -connect www.example.com:443 < /dev/null | sed -n "/-----BEGIN/,/-----END/p" > www.example.com.pem`
2. `POST` the certificate to the `certificate-pinned`endpoint.

Once ready, every callback will be checked against the pinned certificate that you provided. Note that if the SSL certificate on your server expires or is changed, our callbacks will fail.
