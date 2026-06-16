# Chapter 3: Onboarding

### Introduction

Onboarding verifies a user's identity through document capture, selfie verification, and face matching. The process is session-based and follows a structured flow.

### Core Concepts

Session-Based Flow:

* Each onboarding starts with a session that tracks the user's progress
* Sessions are identified by a unique session ID
* Sessions maintain state throughout the onboarding lifecycle

Onboarding Model:

* The onboarding model represents the current state and configuration
* It defines required steps, verification rules, and business logic
* It's fetched at the start and updated as the user progresses

Fulfillments:

* Fulfillments are individual verification steps (e.g., ID scan, selfie, face match, address, name, email, etc)
* Each fulfillment must be completed to have a fully verified user.
* The system tracks which fulfillments are pending, in progress, or completed and can be accessed by doing a PUT call on the onboarding model.

### Onboarding Flow

1\. Session Initialization

* Create a new session on behalf of the user
* Session contains initial configuration and requirements

2\. Fetch Onboarding Model

* Retrieve the onboarding model for the session
* Use this to configure the client-side flow

3\. User Progression

* User completes each step (ID capture, selfie, etc.)
* Each completion updates the session state
* The onboarding model may be updated to reflect progress

4\. Fulfillment Completion

* Mark individual fulfillments as completed as steps finish
* System validates each fulfillment against requirements
* Progress is tracked in real-time
* Make sure to fulfill Identity Verification via obtaining a session token in `/identity-verification-session` endpoint

5\. Finalization

* Once all required fulfillments are complete, finalize the session
* System performs final validation and processing
* Onboarding result is generated and available for retrieval

### State Management

* Sessions progress through states: created → in\_progress → completed / failed
* The onboarding model reflects current requirements and completed steps
* Fulfillments track individual verification task completion

### Key Principles

* Idempotency: Operations can be safely retried
* State Consistency: The model always reflects the current session state
* Progressive Enhancement: Steps can be completed in sequence or parallel where supported
* Validation: Each step is validated before allowing progression

This flow ensures a structured, trackable onboarding process with clear state management and validation at each stage.

### Webhooks

You can subscribe to webhooks to receive an update when User is fully onboarded or denied by our system. This is a final state, when user is verified and onboarded, then Monetary Accounts and Cards can be created.

**Endpoint:**

```http
POST /v1/user/{user_api_key_id}/notification-filter-url
```

**Request Body:**

```json
{
    "notification_filters": [
        {
            "category": "USER_ONBOARDING",
            "notification_target": "https://your-webhook-endpoint.com/user-onboarding-updates"
        }
    ]
}
```

It is very important to note that the `user_api_key_id` here is the `UserApiKey.id` which can be found when creating a session for the underlying user in the subsequent API calls.

