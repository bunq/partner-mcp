# User Information Inquiry

## List inquiries for a user

```http
GET /v1/user/{user_id}/user-information-inquiry?status=EXPECTING_REPLY_FROM_USER
```

| Query param | Description |
|---|---|
| `status` | Filter: `EXPECTING_REPLY_FROM_USER`, `EXPECTING_REPLY_FROM_BUNQ`, `FINALIZED` |
| `purpose` | Filter: `ONBOARDING`, `COMPLIANCE_TRANSACTION_MONITORING`, `COMPLIANCE_SCREENING`, etc. |

Use `status=EXPECTING_REPLY_FROM_USER` to find open inquiries that still require action.

**Response:**
```json
{
  "Response": [{
    "UserInformationInquiry": {
      "id": 1001,
      "user_id": 12345,
      "title": "We need some information from you",
      "purpose": "ONBOARDING",
      "status": "EXPECTING_REPLY_FROM_USER",
      "time_expiry": "2026-07-01 00:00:00.000000",
      "all_entry": [{
        "UserInformationInquiryEntry": {
          "id": 2001,
          "type": "USER_PERSON_SOURCE_OF_FUND",
          "status": "PENDING"
        }
      }]
    }
  }]
}
```

## Entry types (examples)

| Type | Description |
|---|---|
| `USER_PERSON_INVOLVEMENT_IN_POLITICS` | Whether the user is politically exposed |
| `USER_PERSON_SOURCE_OF_INCOME` | User's source of income |
| `USER_PERSON_SOURCE_OF_FUND` | User's source of funds |
| `USER_PERSON_COUNTRY_OF_BIRTH` | User's country of birth |
| `USER_PERSON_ACCOUNT_PURPOSE` | Intended purpose of the bank account |
| `IDENTIFICATION_DOCUMENT_VERIFY` | Identity document verification |

## Submit an answer for an entry

```http
PUT /v1/user/{user_id}/user-information-inquiry/{inquiry_id}/partner-user-information-inquiry-entry/{entry_id}

{
  "all_attachment_id": [1771],
  "answer": "My income comes from employment at Example BV."
}
```

| Field | Description |
|---|---|
| `all_attachment_id` | IDs of uploaded attachments (for document-based entries) |
| `answer` | Free-text answer (for open-ended entries) |

At least one of `all_attachment_id` or `answer` must be provided.

**Constraints:**
- Only entries with status `PENDING` can be answered
- Attachments must belong to the provisioned user

**After submission:** entry status → `WAITING_FOR_REVIEW`. Once all entries are in `WAITING_FOR_REVIEW`, the inquiry status moves to `EXPECTING_REPLY_FROM_BUNQ`.

## Entry status reference

| Status | Meaning |
|---|---|
| `PENDING` | Not yet addressed |
| `SUBMITTED` | User has submitted a response |
| `WAITING_FOR_REVIEW` | Submitted and queued for review |
| `AUTO_APPROVED` | Automatically approved |
| `AUTO_REJECTED` | Automatically rejected |
| `APPROVED` | Manually approved |
| `REJECTED` | Manually rejected |
| `CANCELLED` | No longer requires action |
