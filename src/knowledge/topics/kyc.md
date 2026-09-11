---
title: KYC and identity verification
slug: kyc
tags: [kyc, identity, verification, onboarding]
---

## Overview

KYC means Know Your Customer. Before a provisioned user can hold money or make
payments, the user must pass identity verification. The partner starts the
verification, the user gives identity data and a document, and bunq reviews it.

## Steps

1. Start the verification for the user.
2. Collect the user identity data: name, address, nationality, tax residence.
3. Upload an identity document, then link it to the verification.
4. Submit the verification for review.
5. Poll the verification status until it is approved or rejected.

## Status values

- PENDING: the verification is started but not submitted.
- SUBMITTED: bunq is reviewing the data.
- APPROVED: the user passed and can use the account.
- REJECTED: the user did not pass. Read the reason and retry.
