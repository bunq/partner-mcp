// ─── Tool definitions for bunq Partner MCP ───────────────────────────────────
// Each tool maps 1-to-1 with a logical operation on the Partner API.
// Input schemas use JSON Schema (draft-07) as required by MCP.
// Source of truth: https://lexy.gitbook.io/partner-onboarding-api-docs

export const TOOLS = [

  // ── Session ─────────────────────────────────────────────────────────────────
  {
    name: "get_session_info",
    description:
      "Returns the current session status, authenticated user ID, and active environment " +
      "(sandbox/production). Useful to verify the connection is working before other calls.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "refresh_session",
    description:
      "Force-refreshes the bunq session token. Use this if you receive authentication errors.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },

  // ── OAuth Client ─────────────────────────────────────────────────────────────
  {
    name: "create_oauth_client",
    description:
      "Creates a new OAuth client for the partner account. Required before provisioning any users.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_oauth_clients",
    description: "Lists all OAuth clients for the partner account.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_oauth_client",
    description: "Gets details (client_id, secret, callback URLs) for a specific OAuth client.",
    inputSchema: {
      type: "object",
      properties: {
        oauth_client_id: { type: "number", description: "ID of the OAuth client." },
      },
      required: ["oauth_client_id"],
    },
  },
  {
    name: "register_oauth_callback_url",
    description: "Registers an OAuth callback URL for a specific OAuth client.",
    inputSchema: {
      type: "object",
      properties: {
        oauth_client_id: { type: "number", description: "ID of the OAuth client." },
        url: { type: "string", description: "HTTPS callback URL to register." },
      },
      required: ["oauth_client_id", "url"],
    },
  },

  // ── Partner User Provision ───────────────────────────────────────────────────
  {
    name: "create_provision",
    description:
      "Provisions a new UserPerson under the partner account. Kicks off the full onboarding " +
      "flow. Returns a provision_id to monitor progress via get_provision. " +
      "The provision goes through sub-statuses: PENDING_PROCESS_USER → " +
      "PENDING_PROCESS_RELATION_USER → PENDING_PROCESS_OAUTH_REQUEST → " +
      "PENDING_PROCESS_USER_ONBOARDING. When ACTIVE, a credential.token_value is returned — " +
      "this is Eva's API key. It expires in 1h (sandbox) / 4h (production): create a session " +
      "immediately with create_user_session.",
    inputSchema: {
      type: "object",
      properties: {
        external_uuid: {
          type: "string",
          description: "Your unique UUID for this user (for deduplication). Must be a valid UUID.",
        },
        email: {
          type: "string",
          description: "Verified email address of the user.",
        },
        phone_number: {
          type: "string",
          description: "Verified phone number of the user (e.g. +31612345678).",
        },
        products: {
          type: "array",
          items: { type: "string", enum: ["USER_VERIFIED", "USER_ANONYMOUS_TRANSACTION_AUDIT"] },
          description: "Products to provision. Defaults to ['USER_VERIFIED'].",
          default: ["USER_VERIFIED"],
        },
        user_verified_type: {
          type: "string",
          enum: ["PARTNER_USER_PERSON", "PARTNER_USER_COMPANY"],
          description: "Type of user to provision. Defaults to PARTNER_USER_PERSON.",
          default: "PARTNER_USER_PERSON",
        },
      },
      required: ["external_uuid", "email", "phone_number"],
    },
  },
  {
    name: "get_provision",
    description:
      "Gets the current status and details of a user provision. Poll this after create_provision " +
      "to track progress. When status=ACTIVE and credential.token_value is present, immediately " +
      "call create_user_session — the token expires in 1h (sandbox) / 4h (production).",
    inputSchema: {
      type: "object",
      properties: {
        provision_id: { type: "number", description: "ID of the provision." },
      },
      required: ["provision_id"],
    },
  },
  {
    name: "list_provisions",
    description: "Lists all partner user provisions with optional filtering.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Comma-separated status filter (e.g. CREATED,ACTIVE).",
        },
        external_uuid: { type: "string", description: "Filter by your external UUID." },
      },
      required: [],
    },
  },
  {
    name: "close_provision",
    description: "Cancels a user provision. Sets status to CANCELLED.",
    inputSchema: {
      type: "object",
      properties: {
        provision_id: { type: "number", description: "ID of the provision to cancel." },
      },
      required: ["provision_id"],
    },
  },
  {
    name: "reset_provision_token",
    description:
      "Requests a new credential API key for a provision whose token was lost, expired, or " +
      "revoked. Sets status to TOKEN_RESET_REQUESTED. Poll get_provision until a new " +
      "credential.token_value appears, then call create_user_session immediately.",
    inputSchema: {
      type: "object",
      properties: {
        provision_id: { type: "number", description: "ID of the provision." },
      },
      required: ["provision_id"],
    },
  },

  // ── User Session (on behalf of provisioned user) ─────────────────────────────
  {
    name: "create_user_session",
    description:
      "Creates a session on behalf of a provisioned user using their credential.token_value " +
      "(obtained from get_provision when status=ACTIVE). Returns a session token and " +
      "UserApiKey.id — use this session token for all subsequent calls on behalf of that user. " +
      "Must be called within 1h (sandbox) / 4h (production) of the token being issued.",
    inputSchema: {
      type: "object",
      properties: {
        credential_token: {
          type: "string",
          description: "The credential.token_value from the ACTIVE provision.",
        },
      },
      required: ["credential_token"],
    },
  },

  // ── Webhooks / Notification Filters ─────────────────────────────────────────
  {
    name: "set_notification_filters",
    description:
      "Sets webhook URLs for a user. ⚠️ This REPLACES all existing filters — always include " +
      "the full desired list in one call. To add one filter, fetch the existing ones first and " +
      "include them all. To remove all, pass an empty array. " +
      "Categories: PARTNER_USER_PROVISION, USER_ONBOARDING, USER_INFORMATION_INQUIRY, " +
      "MUTATION, PAYMENT, CARD, CARD_TRANSACTION_SUCCESSFUL, CARD_TRANSACTION_FAILED.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID (use UserApiKey.id for provisioned users)." },
        filters: {
          type: "array",
          description: "Full list of notification filters to set.",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: [
                  "PARTNER_USER_PROVISION",
                  "USER_ONBOARDING",
                  "USER_INFORMATION_INQUIRY",
                  "MUTATION",
                  "PAYMENT",
                  "CARD",
                  "CARD_TRANSACTION_SUCCESSFUL",
                  "CARD_TRANSACTION_FAILED",
                ],
              },
              notification_target: { type: "string", description: "HTTPS webhook URL." },
            },
            required: ["category", "notification_target"],
          },
        },
      },
      required: ["user_id", "filters"],
    },
  },
  {
    name: "list_notification_failures",
    description:
      "Lists failed webhook deliveries for the partner's company user. The userId should be " +
      "the UserCompany.id — this returns failures for all underlying provisioned users.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "UserCompany.id of the partner." },
      },
      required: ["user_id"],
    },
  },
  {
    name: "retry_notification_failures",
    description:
      "Retries delivery of up to 100 failed webhook notifications by their failure IDs.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID who owns the failed notifications." },
        failure_ids: {
          type: "string",
          description: "Comma-separated failure IDs to retry (e.g. '123,456,789').",
        },
      },
      required: ["user_id", "failure_ids"],
    },
  },

  // ── KYC Fulfillments ─────────────────────────────────────────────────────────
  {
    name: "set_address_main",
    description: "Sets the main (residential) address for a provisioned user during onboarding.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the provisioned user." },
        street: { type: "string", description: "Street name." },
        house_number: { type: "string", description: "House number." },
        postal_code: { type: "string", description: "Postal code (e.g. 1111 AA)." },
        city: { type: "string", description: "City." },
        country: { type: "string", description: "ISO-3166 country code (e.g. NL).", default: "NL" },
      },
      required: ["user_id", "street", "house_number", "postal_code", "city"],
    },
  },
  {
    name: "set_address_postal",
    description: "Sets the postal address for a provisioned user during onboarding.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the provisioned user." },
        street: { type: "string", description: "Street name." },
        house_number: { type: "string", description: "House number." },
        postal_code: { type: "string", description: "Postal code." },
        city: { type: "string", description: "City." },
        country: { type: "string", description: "ISO-3166 country code.", default: "NL" },
      },
      required: ["user_id", "street", "house_number", "postal_code", "city"],
    },
  },
  {
    name: "update_user_person",
    description:
      "Updates personal information for a provisioned user: name and date of birth.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the provisioned user." },
        first_name: { type: "string", description: "First name." },
        middle_name: { type: "string", description: "Middle name (optional)." },
        last_name: { type: "string", description: "Last name." },
        date_of_birth: { type: "string", description: "Date of birth in YYYY-MM-DD format." },
      },
      required: ["user_id", "first_name", "last_name", "date_of_birth"],
    },
  },
  {
    name: "set_tax_resident",
    description:
      "Submits tax residency information for a provisioned user. Required within 90 days.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the provisioned user." },
        tax_residents: {
          type: "array",
          description: "List of tax residencies.",
          items: {
            type: "object",
            properties: {
              country: { type: "string", description: "ISO-3166 country code." },
              tax_number: { type: "string", description: "Tax identification number." },
              status: { type: "string", enum: ["CONFIRMED"], default: "CONFIRMED" },
            },
            required: ["country", "tax_number"],
          },
        },
      },
      required: ["user_id", "tax_residents"],
    },
  },
  {
    name: "set_nationality",
    description:
      "Submits nationality information for a provisioned user. Required within 90 days.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the provisioned user." },
        nationalities: {
          type: "array",
          items: { type: "string" },
          description: "List of ISO-3166 country codes (e.g. ['NL', 'DE']).",
        },
      },
      required: ["user_id", "nationalities"],
    },
  },
  {
    name: "start_identity_verification",
    description:
      "Creates an identity verification session using the Incode SDK. Returns a session ID. " +
      "Follow up with get_identity_verification to obtain the SDK token, pass it to the Incode " +
      "SDK, then call submit_identity_verification once the SDK flow completes.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the provisioned user." },
        purpose: {
          type: "string",
          enum: ["VERIFICATION"],
          default: "VERIFICATION",
          description: "Verification purpose.",
        },
        provider: {
          type: "string",
          enum: ["INCODE"],
          default: "INCODE",
          description: "Identity verification provider.",
        },
      },
      required: ["user_id"],
    },
  },
  {
    name: "get_identity_verification",
    description:
      "Gets the identity verification session details including the SDK token and status. " +
      "Use the token field to initialise the Incode SDK in your app.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the provisioned user." },
        session_id: { type: "number", description: "ID of the identity verification session." },
      },
      required: ["user_id", "session_id"],
    },
  },
  {
    name: "submit_identity_verification",
    description:
      "Notifies bunq that the Incode SDK flow is complete and the identity verification result " +
      "is ready to be processed. Call this after the SDK returns a successful completion callback.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "UserApiKey.id of the provisioned user." },
        session_id: { type: "number", description: "ID of the identity verification session." },
      },
      required: ["user_id", "session_id"],
    },
  },
  {
    name: "link_document_identification",
    description:
      "Links an uploaded attachment to a document type for KYC purposes " +
      "(e.g. CRYPTO_KYC_QUESTIONNAIRE). Call after upload_attachment.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the provisioned user." },
        document_type: { type: "string", description: "Document type (e.g. CRYPTO_KYC_QUESTIONNAIRE)." },
        document_country_of_issuance: {
          type: "string",
          description: "ISO-3166 country of issuance (use country of residence).",
        },
        document_attachment_id: { type: "number", description: "ID of the front attachment." },
        document_back_attachment_id: {
          type: "number",
          description: "ID of the back attachment (optional).",
        },
      },
      required: ["user_id", "document_type", "document_country_of_issuance", "document_attachment_id"],
    },
  },

  // ── Attachment ───────────────────────────────────────────────────────────────
  {
    name: "upload_attachment",
    description:
      "Uploads a file attachment for a provisioned user. The attachment ID can then be passed " +
      "to respond_to_inquiry_entry via all_attachment_id to submit documents for a compliance " +
      "inquiry. Supported types: image/png, image/jpeg, image/gif, application/pdf. " +
      "Note: the actual file bytes must be sent as raw binary — provide the file path.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the provisioned user." },
        description: { type: "string", description: "Human-readable description of the file." },
        content_type: {
          type: "string",
          enum: ["image/png", "image/jpeg", "image/gif", "application/pdf"],
          description: "MIME type of the file.",
          default: "image/jpeg",
        },
        base64_content: {
          type: "string",
          description: "Base64-encoded file content.",
        },
      },
      required: ["user_id", "description", "content_type", "base64_content"],
    },
  },
  {
    name: "get_attachment",
    description: "Gets metadata and download URLs for a previously uploaded attachment.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID." },
        attachment_id: { type: "number", description: "Attachment ID." },
      },
      required: ["user_id", "attachment_id"],
    },
  },

  // ── Monetary Accounts ─────────────────────────────────────────────────────────
  {
    name: "create_bank_account",
    description:
      "Creates a EUR IBAN bank account (MonetaryAccountBank) for a provisioned user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the user." },
        currency: { type: "string", description: "ISO-4217 currency code.", default: "EUR" },
        description: { type: "string", description: "Account display name.", default: "Main Account" },
      },
      required: ["user_id"],
    },
  },
  {
    name: "create_external_account",
    description:
      "Creates a non-EUR external monetary account (MonetaryAccountExternal) via CurrencyCloud.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the user." },
        currency: { type: "string", description: "ISO-4217 currency code (non-EUR)." },
        service: {
          type: "string",
          enum: ["CURRENCY_CLOUD"],
          description: "External service provider.",
          default: "CURRENCY_CLOUD",
        },
        description: { type: "string", description: "Account display name.", default: "External Account" },
        display_name: { type: "string", description: "Legal name of user/company." },
      },
      required: ["user_id", "currency"],
    },
  },
  {
    name: "list_monetary_accounts",
    description: "Lists all monetary accounts for a user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID." },
      },
      required: ["user_id"],
    },
  },
  {
    name: "get_monetary_account",
    description: "Gets details of a specific monetary account including balance and IBAN.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID." },
        account_id: { type: "number", description: "Monetary account ID." },
      },
      required: ["user_id", "account_id"],
    },
  },

  // ── Payments ──────────────────────────────────────────────────────────────────
  {
    name: "create_payment",
    description:
      "Creates a payment from a monetary account. For provisioned users without PSD2 access, " +
      "only internal transfers between Eva and the partner are allowed. " +
      "Description is limited to 140 characters.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "Sending user's ID." },
        account_id: { type: "number", description: "Source monetary account ID." },
        amount: { type: "string", description: "Amount as decimal string (e.g. '10.00')." },
        currency: { type: "string", description: "ISO-4217 currency code.", default: "EUR" },
        description: { type: "string", description: "Payment description (max 140 chars)." },
        counterparty_iban: { type: "string", description: "Recipient IBAN." },
        counterparty_name: { type: "string", description: "Recipient name." },
        merchant_reference: {
          type: "string",
          description: "Optional merchant reference for tracking (max 35 chars).",
        },
      },
      required: ["user_id", "account_id", "amount", "description", "counterparty_iban"],
    },
  },
  {
    name: "get_payment",
    description: "Gets details of a specific payment.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID." },
        account_id: { type: "number", description: "Monetary account ID." },
        payment_id: { type: "number", description: "Payment ID." },
      },
      required: ["user_id", "account_id", "payment_id"],
    },
  },
  {
    name: "list_payments",
    description: "Lists all payments (incoming and outgoing) for a monetary account.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID." },
        account_id: { type: "number", description: "Monetary account ID." },
      },
      required: ["user_id", "account_id"],
    },
  },

  // ── Cards ─────────────────────────────────────────────────────────────────────
  {
    name: "create_credit_card",
    description:
      "Orders a new Mastercard credit card for a user. Use order_status=VIRTUAL_DELIVERY for " +
      "immediate virtual card, or NEW_CARD_REQUEST_RECEIVED for physical delivery by post.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID." },
        second_line: { type: "string", description: "Second line of text on the card (max 17 chars)." },
        name_on_card: { type: "string", description: "Name as it appears on the card." },
        product_type: {
          type: "string",
          enum: ["MASTERCARD_CREDIT_CO_BRANDED", "MASTERCARD_BUSINESS_CO_BRANDED"],
          description: "Card product type.",
        },
        product_sub_type: {
          type: "string",
          description: "Card design sub-type (partner-specific value).",
        },
        order_status: {
          type: "string",
          enum: ["NEW_CARD_REQUEST_RECEIVED", "VIRTUAL_DELIVERY"],
          description: "Physical delivery or virtual card.",
          default: "VIRTUAL_DELIVERY",
        },
      },
      required: ["user_id", "second_line", "product_type"],
    },
  },
  {
    name: "create_debit_card",
    description:
      "Orders a new Mastercard debit card for a user. Use order_status=VIRTUAL_DELIVERY for " +
      "immediate virtual card, or NEW_CARD_REQUEST_RECEIVED for physical delivery by post.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID." },
        second_line: { type: "string", description: "Second line of text on the card (max 17 chars)." },
        name_on_card: { type: "string", description: "Name as it appears on the card." },
        product_type: { type: "string", description: "Card product type (partner-specific value)." },
        product_sub_type: {
          type: "string",
          description: "Card design sub-type (partner-specific value).",
        },
        order_status: {
          type: "string",
          enum: ["NEW_CARD_REQUEST_RECEIVED", "VIRTUAL_DELIVERY"],
          description: "Physical delivery or virtual card.",
          default: "VIRTUAL_DELIVERY",
        },
        monetary_account_id_fallback: {
          type: "number",
          description: "Fallback account ID if balance is insufficient.",
        },
      },
      required: ["user_id", "second_line", "product_type"],
    },
  },
  {
    name: "get_card",
    description: "Gets details of a specific card including status, limits, and expiry date.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID." },
        card_id: { type: "number", description: "Card ID." },
      },
      required: ["user_id", "card_id"],
    },
  },
  {
    name: "list_cards",
    description: "Lists all cards (credit and debit) for a user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID." },
      },
      required: ["user_id"],
    },
  },
  {
    name: "update_card",
    description:
      "Updates a card's status, spending limits, or PIN. Use to activate a card after delivery, " +
      "block/unblock it, or report it lost/stolen.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID." },
        card_id: { type: "number", description: "Card ID." },
        status: {
          type: "string",
          enum: ["ACTIVE", "DEACTIVATED", "LOST", "STOLEN", "CANCELLED"],
          description: "New card status.",
        },
        card_limit: {
          type: "object",
          description: "Daily spending limit.",
          properties: {
            value: { type: "string" },
            currency: { type: "string" },
          },
        },
        card_limit_atm: {
          type: "object",
          description: "Daily ATM withdrawal limit.",
          properties: {
            value: { type: "string" },
            currency: { type: "string" },
          },
        },
        cancellation_reason: {
          type: "string",
          enum: ["FRAUD", "LOST", "STOLEN", "OTHER"],
          description: "Required when status=CANCELLED.",
        },
      },
      required: ["user_id", "card_id"],
    },
  },

  // ── Compliance: User Information Inquiry ─────────────────────────────────────
  {
    name: "list_user_inquiries",
    description:
      "Lists compliance information inquiries for a provisioned user. " +
      "Use status=EXPECTING_REPLY_FROM_USER to find open inquiries requiring action.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the provisioned user." },
        status: {
          type: "string",
          enum: ["EXPECTING_REPLY_FROM_USER", "EXPECTING_REPLY_FROM_BUNQ", "FINALIZED"],
          description: "Filter by inquiry status.",
        },
        purpose: {
          type: "string",
          description: "Filter by purpose (e.g. ONBOARDING, COMPLIANCE_TRANSACTION_MONITORING).",
        },
      },
      required: ["user_id"],
    },
  },
  {
    name: "get_user_inquiry",
    description:
      "Gets full details of a compliance inquiry including all entries and their status.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "User ID." },
        inquiry_id: { type: "number", description: "Inquiry ID." },
      },
      required: ["user_id", "inquiry_id"],
    },
  },
  {
    name: "respond_to_inquiry_entry",
    description:
      "Submits an answer for a specific inquiry entry on behalf of Eva. Provide either " +
      "attachment IDs (upload via upload_attachment first) or a free-text answer, or both. " +
      "Only PENDING entries can be answered. After submission the entry moves to WAITING_FOR_REVIEW.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "ID of the provisioned user." },
        inquiry_id: { type: "number", description: "Inquiry ID." },
        entry_id: { type: "number", description: "Entry ID within the inquiry." },
        all_attachment_id: {
          type: "array",
          items: { type: "number" },
          description: "IDs of attachments to submit (for document-based entries).",
        },
        answer: {
          type: "string",
          description: "Free-text answer (for open-ended entries like source of income).",
        },
      },
      required: ["user_id", "inquiry_id", "entry_id"],
    },
  },
] as const;
