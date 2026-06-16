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

# Chapter 8: Compliance

A `UserInformationInquiry` is a structured request from bunq to gather specific information or documents from a user. Inquiries are created internally by bunq (e.g., during\
onboarding or compliance review) and are surfaced to partners via the Partner API so they can monitor the status of outstanding information requests for their provisioned\
users.

Each inquiry contains one or more entries (`all_entry`). Each entry represents a single piece of information or document that is being requested (e.g., proof of identity,\
source of income). An inquiry is fulfilled when all its entries have been addressed.

### Information required

* Attachments, that can be PDF, images, doc, etc.
* Free text answer
* Both are optional, but at least one needs to be provied. Based on the inquiry type both may be required as well

