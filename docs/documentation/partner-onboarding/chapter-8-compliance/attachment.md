---
layout:
  width: wide
  title:
    visible: true
  description:
    visible: true
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
  metadata:
    visible: true
  tags:
    visible: true
  actions:
    visible: true
---

# Attachment

{% openapi-operation spec="partner-api" path="/user/{userId}/attachment" method="post" %}
[OpenAPI partner-api](https://4401d86825a13bf607936cc3a9f3897a.r2.cloudflarestorage.com/gitbook-x-prod-openapi/raw/6c8614bfe9f05aadd99fd055b7a2b727e8d7c5d35406fa397fa4e1c591688cfe.yaml?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=dce48141f43c0191a2ad043a6888781c%2F20260616%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260616T092017Z&X-Amz-Expires=172800&X-Amz-Signature=624d208b63fde489aaabe445efe1969d17e7c27587ed42d6f2a2fe0aff991c5b&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
{% endopenapi-operation %}

{% openapi-operation spec="partner-api" path="/user/{userId}/attachment/{attachmentId}" method="get" %}
[OpenAPI partner-api](https://4401d86825a13bf607936cc3a9f3897a.r2.cloudflarestorage.com/gitbook-x-prod-openapi/raw/6c8614bfe9f05aadd99fd055b7a2b727e8d7c5d35406fa397fa4e1c591688cfe.yaml?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=dce48141f43c0191a2ad043a6888781c%2F20260616%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260616T092017Z&X-Amz-Expires=172800&X-Amz-Signature=624d208b63fde489aaabe445efe1969d17e7c27587ed42d6f2a2fe0aff991c5b&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
{% endopenapi-operation %}

#### If required, sometimes attachments need to be linked with onboarding for additional information via document type

**Endpoint**&#x20;

```http
POST /v1/user/{user_id}/document-identification
```

**Request**

```http
{
    "document_type": "CRYPTO_KYC_QUESTIONNAIRE",
    "document_country_of_issuance": "NL", // <- country of residence of the user
    "document_attachment_id": 1771,
    "document_back_attachment_id": 2067 // <- optional
}
```

**Response**

```http
{
    "Response": [
        {
            "Id": {
                "id": 261
            }
        }
    ]
}
```
