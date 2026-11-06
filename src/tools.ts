// ─── Tool definitions for bunq Partner MCP ───────────────────────────────────
// Each tool maps 1-to-1 with a logical operation on the Partner API.
// Input schemas use JSON Schema (draft-07) as required by MCP.
// Source of truth: https://partner.doc.bunq.com/

const DESCRIPTION_USER_ID =
  "ID of the provisioned user: the user_id that create_user_session returns. The call uses that " +
  "user's session, so call create_user_session first. Your own partner user id also works.";

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

  {
    name: "update_oauth_client",
    description:
      "Activates or cancels one of your OAuth clients.",
    inputSchema: {
      type: "object",
      properties: {
        oauth_client_id: { type: "number", description: "ID of the OAuth client." },
        status: { type: "string", enum: ["ACTIVE", "CANCELLED"], description: "New status of the OAuth client." },
      },
      required: ["oauth_client_id", "status"],
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
      "PENDING_PROCESS_USER_ONBOARDING. When ACTIVE, the provision holds the user's credential " +
      "token. It expires in 1h (sandbox) / 4h (production): call create_user_session with the " +
      "provision_id immediately. Identify the user by email and phone_number, or by pointer. " +
      "USER_ANONYMOUS_TRANSACTION_AUDIT also needs date_of_birth and country_of_residence.",
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
        pointer: {
          type: "object",
          description: "Alternative to email/phone_number: {type: EMAIL|PHONE_NUMBER, value}.",
        },
        date_of_birth: { type: "string", description: "ISO 8601 date. Needed for USER_ANONYMOUS_TRANSACTION_AUDIT." },
        country_of_residence: {
          type: "string",
          description: "ISO 3166-1 alpha-2 country code. Needed for USER_ANONYMOUS_TRANSACTION_AUDIT.",
        },
      },
      required: ["external_uuid"],
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

  {
    name: "create_audit_transaction",
    description:
      "Reports a deposit or withdrawal that happened outside bunq for a provisioned user (crypto  " +
      "partners). bunq uses it for transaction monitoring; a high value can open a compliance  " +
      "inquiry. Uses your partner session.",
    inputSchema: {
      type: "object",
      properties: {
        external_uuid: { type: "string", description: "external_uuid of the provisioned user." },
        type: { type: "string", enum: ["DEPOSIT", "WITHDRAWAL"], description: "Direction of the transaction." },
        reference: { type: "string", description: "Your own reference for the transaction." },
        time_transaction: { type: "string", description: "ISO 8601 time of the transaction." },
        amount: { type: "string", description: "Amount as a decimal string, e.g. \"100.00\"." },
        balance_after_transaction: { type: "string", description: "Balance after the transaction as a decimal string." },
        currency: { type: "string", description: "ISO 4217 currency code. Default EUR." },
        counterparty_alias: { type: "object", description: "Counterparty: {type: IBAN, bank_account_holder_name, bank_account_iban} or {type: CARD, card_holder_name, card_primary_account_number_last_four_digit}." },
      },
      required: ["external_uuid", "type", "reference", "time_transaction", "amount", "balance_after_transaction", "counterparty_alias"],
    },
  },
  {
    name: "get_audit_transaction",
    description:
      "Gets an audit transaction that you reported.",
    inputSchema: {
      type: "object",
      properties: {
        audit_transaction_id: { type: "number", description: "ID returned by create_audit_transaction." },
      },
      required: ["audit_transaction_id"],
    },
  },

  // ── User Session (on behalf of provisioned user) ─────────────────────────────
  {
    name: "create_user_session",
    description:
      "Creates a session for a provisioned user. Pass provision_id: the server reads the ACTIVE " +
      "provision and uses its credential token, so the token never reaches the conversation. " +
      "The server keeps the session. Returns user_id (use it for every per-user tool) and " +
      "user_api_key_id (use it only for the user's webhooks in set_notification_filters). Call it " +
      "within 1h (sandbox) / 4h (production) after the provision turns ACTIVE.",
    inputSchema: {
      type: "object",
      properties: {
        provision_id: { type: "number", description: "ID of the ACTIVE provision (preferred)." },
        credential_token: {
          type: "string",
          description: "Only when you have the token outside this conversation: the credential.token_value.",
        },
      },
      required: [],
    },
  },

  // ── User Freeze ──────────────────────────────────────────────────────────────
  {
    name: "freeze_user",
    description:
      "Freezes a user you provisioned. A partner pays for its active users, so freeze a user you " +
      "no longer pay for. The user's monetary accounts and cards freeze along with the user, while " +
      "the subscription and partner connection are kept so the user can be unfrozen later. The " +
      "partner keeps access to the frozen user. Reverse with unfreeze_user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
      },
      required: ["user_id"],
    },
  },
  {
    name: "unfreeze_user",
    description:
      "Unfreezes a user you previously froze. The user's monetary accounts and cards unfreeze along " +
      "with the user and return to active. Use when the partner resumes paying for the user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
      },
      required: ["user_id"],
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
        user_id: {
          type: "number",
          description:
            "For a provisioned user's webhooks: the user_api_key_id that create_user_session returns. " +
            "For your own webhooks: your partner user id.",
        },
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
      "the UserCompany.id — this returns failures for all underlying provisioned users. " +
      "Each record includes user_id (which provisioned user the failure belongs to) and " +
      "user_requested_id (set when the filter was created via an API key, otherwise null).",
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        failure_ids: {
          type: "string",
          description: "Comma-separated failure IDs to retry (e.g. '123,456,789').",
        },
      },
      required: ["user_id", "failure_ids"],
    },
  },

  {
    name: "list_notification_filters",
    description:
      "Lists the webhook URLs that are set for a user. Use it before set_notification_filters,  " +
      "which replaces the whole list.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "user_api_key_id from create_user_session for a provisioned user, or your own partner user id." },
      },
      required: ["user_id"],
    },
  },

  // ── KYC Fulfillments ─────────────────────────────────────────────────────────
  {
    name: "set_address_main",
    description: "Sets the main (residential) address for a provisioned user during onboarding.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        document_number: { type: "string", description: "Number of the document." },
        document_expiry_date: { type: "string", description: "ISO 8601 expiry date of the document." },
      },
      required: ["user_id", "document_type", "document_country_of_issuance", "document_attachment_id"],
    },
  },

  {
    name: "get_user_person",
    description:
      "Gets the personal details, status, verification status and freeze status of a provisioned  " +
      "user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
      },
      required: ["user_id"],
    },
  },
  {
    name: "set_employment_status",
    description:
      "Sets the employment status of a provisioned user (an onboarding fulfilment).",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        type: { type: "string", enum: ["EMPLOYED", "UNEMPLOYED", "STUDENT", "SELF_EMPLOYED", "RETIRED"], description: "Employment status." },
      },
      required: ["user_id", "type"],
    },
  },
  {
    name: "list_employment_status",
    description:
      "Lists the employment status of a provisioned user. Use its id to update it.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
      },
      required: ["user_id"],
    },
  },
  {
    name: "update_employment_status",
    description:
      "Changes the employment status of a provisioned user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        employment_status_id: { type: "number", description: "ID from list_employment_status." },
        type: { type: "string", enum: ["EMPLOYED", "UNEMPLOYED", "STUDENT", "SELF_EMPLOYED", "RETIRED"], description: "Employment status." },
      },
      required: ["user_id", "employment_status_id", "type"],
    },
  },
  {
    name: "list_identity_verifications",
    description:
      "Lists the identity verification sessions of a provisioned user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
      },
      required: ["user_id"],
    },
  },
  {
    name: "list_user_onboardings",
    description:
      "Lists the onboarding of a provisioned user, including action_required and the waiting  " +
      "message. Use its id for update_user_onboarding.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
      },
      required: ["user_id"],
    },
  },
  {
    name: "get_user_onboarding",
    description:
      "Gets one onboarding of a provisioned user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        onboarding_id: { type: "number", description: "ID from list_user_onboardings." },
      },
      required: ["user_id", "onboarding_id"],
    },
  },
  {
    name: "create_user_onboarding",
    description:
      "Starts an onboarding for a provisioned user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        type: { type: "string", description: "Onboarding type, e.g. PARTNER_USER_PERSON." },
        user_status_desired: { type: "string", enum: ["ACTIVE"], description: "Desired user status." },
        user_verification_status_desired: { type: "string", enum: ["VERIFIED"], description: "Desired verification status." },
      },
      required: ["user_id", "type"],
    },
  },
  {
    name: "update_user_onboarding",
    description:
      "Asks bunq to move the onboarding on, e.g. to ACTIVE and VERIFIED after all fulfilments are  " +
      "done. A 467 error lists the fulfilments that are still missing.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        onboarding_id: { type: "number", description: "ID from list_user_onboardings." },
        user_status_desired: { type: "string", enum: ["ACTIVE"], description: "Desired user status." },
        user_verification_status_desired: { type: "string", enum: ["VERIFIED"], description: "Desired verification status." },
        type: { type: "string", description: "Onboarding type, e.g. PARTNER_USER_PERSON." },
      },
      required: ["user_id", "onboarding_id"],
    },
  },

  // ── Attachment ───────────────────────────────────────────────────────────────
  {
    name: "upload_attachment",
    description:
      "Uploads a file attachment for a provisioned user. The attachment ID can then be passed " +
      "to respond_to_inquiry_entry via all_attachment_id to submit documents for a compliance " +
      "inquiry. Supported types: image/png, image/jpeg, image/gif, application/pdf. " +
      "Pass the file bytes as base64 in base64_content (a data: URI also works). A file path " +
      "does not work: this server cannot read your files.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        currency: { type: "string", description: "ISO-4217 currency code.", default: "EUR" },
        description: { type: "string", description: "Account display name.", default: "Main Account" },
        daily_limit: { type: "object", description: "Daily limit, e.g. {value: \"1000.00\", currency: \"EUR\"}." },
        display_name: { type: "string", description: "Name shown on the account." },
        country_iban: { type: "string", description: "ISO 3166-1 alpha-2 country of the IBAN." },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        account_id: { type: "number", description: "Monetary account ID." },
      },
      required: ["user_id", "account_id"],
    },
  },
  {
    name: "update_bank_account",
    description:
      "Updates a bank account (MonetaryAccountBank): description, daily limit, or status. " +
      "To reopen a cancelled account set status='PENDING_REOPEN' and sub_status='NONE' — " +
      "this is permitted for partner-provisioned users without a paid subscription.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        account_id: { type: "number", description: "Monetary account ID." },
        description: { type: "string", description: "New account display name." },
        daily_limit: {
          type: "object",
          description: "Daily spending limit, e.g. { value: '2000.00', currency: 'EUR' }.",
        },
        status: {
          type: "string",
          enum: ["ACTIVE", "BLOCKED", "CANCELLED", "PENDING_REOPEN", "FROZEN"],
          description: "New account status. Use PENDING_REOPEN to reopen a cancelled account.",
        },
        sub_status: {
          type: "string",
          enum: ["NONE", "REDEMPTION_VOLUNTARY"],
          description: "Account sub-status. Set to NONE when reopening.",
        },
        reason: {
          type: "string",
          enum: ["OTHER"],
          description: "Reason when closing the account (status=CANCELLED).",
        },
        reason_description: { type: "string", description: "Free-text reason description." },
      },
      required: ["user_id", "account_id"],
    },
  },

  {
    name: "list_bank_accounts",
    description:
      "Lists the bank (MonetaryAccountBank) accounts of a user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
      },
      required: ["user_id"],
    },
  },
  {
    name: "get_bank_account",
    description:
      "Gets one bank (MonetaryAccountBank) account of a user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        account_id: { type: "number", description: "Monetary account ID." },
      },
      required: ["user_id", "account_id"],
    },
  },
  {
    name: "list_external_accounts",
    description:
      "Lists the external (e.g. Currency Cloud) accounts of a user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
      },
      required: ["user_id"],
    },
  },
  {
    name: "get_external_account",
    description:
      "Gets one external account of a user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        account_id: { type: "number", description: "Monetary account ID." },
      },
      required: ["user_id", "account_id"],
    },
  },
  {
    name: "update_external_account",
    description:
      "Updates an external account: description, daily limit, or status (cancel or reopen).",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        account_id: { type: "number", description: "Monetary account ID." },
        description: { type: "string", description: "New description." },
        daily_limit: { type: "object", description: "Daily limit, e.g. {value: \"1000.00\", currency: \"EUR\"}." },
        status: { type: "string", enum: ["ACTIVE", "CANCELLED", "PENDING_REOPEN"], description: "New status." },
        sub_status: { type: "string", enum: ["NONE", "REDEMPTION_VOLUNTARY"], description: "Sub-status; REDEMPTION_VOLUNTARY when cancelling." },
        reason: { type: "string", enum: ["OTHER"], description: "Reason when cancelling." },
        reason_description: { type: "string", description: "Free-text reason when cancelling." },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        account_id: { type: "number", description: "Monetary account ID." },
      },
      required: ["user_id", "account_id"],
    },
  },

  // ── bunq.me Tabs ────────────────────────────────────────────────────────────
  {
    name: "create_bunqme_tab",
    description:
      "Creates a bunq.me tab: a shareable payment request link for a user's monetary account. " +
      "The response's bunqme_tab_share_url can be opened by anyone to pay the inquired amount. " +
      "Optionally set payment_method (e.g. 'IDEAL') to restrict the link to a single top-up " +
      "method — the payer then sees only that method, which is cheaper. Omit it to offer all " +
      "methods. payment_method is set on creation only and cannot be changed later.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        account_id: { type: "number", description: "Monetary account the tab collects into." },
        amount: { type: "string", description: "Amount inquired as decimal string (e.g. '10.00')." },
        currency: { type: "string", description: "ISO-4217 currency code.", default: "EUR" },
        description: { type: "string", description: "Description shown to the payer." },
        redirect_url: {
          type: "string",
          description: "Optional URL the payer is redirected to after paying.",
        },
        payment_method: {
          type: "string",
          description:
            "Optional single top-up method the payer may use (e.g. 'IDEAL', 'BUNQ_TRANSFER'). " +
            "Omit to offer all available methods.",
        },
      },
      required: ["user_id", "account_id", "amount"],
    },
  },
  {
    name: "get_bunqme_tab",
    description: "Gets the details of a specific bunq.me tab, including its share URL and status.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        account_id: { type: "number", description: "Monetary account ID." },
        bunqme_tab_id: { type: "number", description: "bunq.me tab ID." },
      },
      required: ["user_id", "account_id", "bunqme_tab_id"],
    },
  },
  {
    name: "list_bunqme_tabs",
    description: "Lists all bunq.me tabs for a monetary account.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        account_id: { type: "number", description: "Monetary account ID." },
      },
      required: ["user_id", "account_id"],
    },
  },
  {
    name: "update_bunqme_tab",
    description:
      "Updates a bunq.me tab. Typically used to close an open tab by setting status to " +
      "'CANCELLED'. The payment_method cannot be changed after creation.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        account_id: { type: "number", description: "Monetary account ID." },
        bunqme_tab_id: { type: "number", description: "bunq.me tab ID." },
        status: {
          type: "string",
          enum: ["WAITING_FOR_PAYMENT", "CANCELLED"],
          description: "New status. Set to CANCELLED to close the tab.",
        },
      },
      required: ["user_id", "account_id", "bunqme_tab_id"],
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        card_id: { type: "number", description: "Card ID." },
      },
      required: ["user_id", "card_id"],
    },
  },
  {
    name: "create_card_pan",
    description:
      "Generates and retrieves the primary account number (PAN) for a card. " +
      "This is an encrypted endpoint — the request is end-to-end encrypted on top of TLS.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        card_id: { type: "number", description: "Card ID." },
      },
      required: ["user_id", "card_id"],
    },
  },

  {
    name: "list_challenge_requests",
    description:
      "Lists the Mastercard Identity Check (3DS) challenge requests of a provisioned user. A  " +
      "challenge appears when the user pays online with the card and must approve it.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        status: { type: "string", description: "Optional filter, e.g. PENDING." },
      },
      required: ["user_id"],
    },
  },
  {
    name: "get_challenge_request",
    description:
      "Gets one 3DS challenge request: amount, merchant, expiry and status.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        challenge_request_id: { type: "number", description: "Challenge request ID." },
      },
      required: ["user_id", "challenge_request_id"],
    },
  },
  {
    name: "update_challenge_request",
    description:
      "Accepts or rejects a 3DS challenge request for the user. When accepting,  " +
      "monetary_account_id picks the account that the payment is charged from; when omitted bunq  " +
      "picks it.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        challenge_request_id: { type: "number", description: "Challenge request ID." },
        status: { type: "string", enum: ["ACCEPTED_PENDING_RESPONSE", "REJECTED_PENDING_RESPONSE"], description: "Accept or reject." },
        monetary_account_id: { type: "number", description: "Optional account to charge when accepting." },
      },
      required: ["user_id", "challenge_request_id", "status"],
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
        status: {
          type: "string",
          enum: ["EXPECTING_REPLY_FROM_USER", "EXPECTING_REPLY_FROM_BUNQ", "FINALIZED"],
          description: "Filter by inquiry status.",
        },
        purpose: {
          type: "string",
          description: "Filter by purpose (e.g. ONBOARDING, COMPLIANCE_TRANSACTION_MONITORING).",
        },
        type: { type: "string", description: "Optional filter on the inquiry type." },
        fulfillment_type: { type: "string", description: "Optional filter on the fulfilment type." },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
        user_id: { type: "number", description: DESCRIPTION_USER_ID },
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
