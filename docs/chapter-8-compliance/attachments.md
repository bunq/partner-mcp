# Attachments

Upload files on behalf of a provisioned user. The resulting attachment ID is then passed to `respond_to_inquiry_entry` to submit documents for a compliance inquiry.

## Upload an attachment

The request body must be the **raw binary file content**. Content type and description are passed as headers.

```http
POST /v1/user/{user_id}/attachment
Content-Type: image/jpeg
X-Bunq-Attachment-Description: Passport front page
X-Bunq-Client-Authentication: <session_token>

<raw binary file bytes>
```

**Supported content types:** `image/png`, `image/jpeg`, `image/gif`, `application/pdf`

**Response:**
```json
{
  "Response": [{ "Id": { "id": 1771 } }]
}
```

Save the `id` — this is your `attachment_id`.

## Read attachment metadata

```http
GET /v1/user/{user_id}/attachment/{attachment_id}
```

**Response:**
```json
{
  "Response": [{
    "AttachmentUser": {
      "id": 1771,
      "attachment": {
        "description": "Passport front page",
        "content_type": "image/jpeg",
        "urls": [{ "type": "ORIGINAL", "url": "https://..." }]
      }
    }
  }]
}
```

## Link to a document type

For some onboarding flows, attachments must be linked to a specific document type:

```http
POST /v1/user/{user_id}/document-identification

{
  "document_type": "CRYPTO_KYC_QUESTIONNAIRE",
  "document_country_of_issuance": "NL",
  "document_attachment_id": 1771,
  "document_back_attachment_id": 2067
}
```

`document_back_attachment_id` is optional.
