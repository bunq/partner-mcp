# Chapter 8: Compliance

A `UserInformationInquiry` is a structured request from bunq to gather specific information or documents from a provisioned user. Inquiries are created internally by bunq — during onboarding or compliance review — and surfaced to partners via the API.

Each inquiry contains one or more entries (`all_entry`). Each entry represents a single piece of information being requested (e.g. proof of identity, source of income). An inquiry is fulfilled when all its entries are addressed.

## What counts as a response

Each entry can be answered with:
- **Attachments** (`all_attachment_id`) — for document-based entries. Upload files first via `POST /user/{userId}/attachment`, then pass the IDs.
- **Free text** (`answer`) — for open-ended questions like source of income or account purpose.

At least one must be provided. Some entry types require both.
