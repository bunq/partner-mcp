// One entry per API tool. The handler validates the arguments against the tool's
// inputSchema, fills the {placeholders} in the path from the arguments, picks the
// session from the scope, and sends the body that `body` builds.
//
// Scopes:
//   partner — the partner's own session (provisions, OAuth).
//   user    — the session of the user in {user_id}: the provisioned user's own session
//             from create_user_session, or the partner session for the partner's own id.

export type Args = Record<string, unknown>;
export type OperationScope = "partner" | "user";

export interface Operation {
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** API path below /v1. {name} is replaced by the argument `name`; {partner_user_id} by the partner's id. */
  path: string;
  scope: OperationScope;
  /** Arguments sent as query parameters (only when present). */
  query?: string[];
  body?: (args: Args) => Record<string, unknown>;
  encrypt?: boolean;
}

// ─── Argument readers ─────────────────────────────────────────────────────────

export function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value !== "" ? value : fallback;
}

/** Copies each present argument to the body under the same name. */
function pick(args: Args, allName: string[], body: Record<string, unknown> = {}): Record<string, unknown> {
  for (const name of allName) {
    if (isPresent(args[name])) body[name] = args[name];
  }
  return body;
}

function address(args: Args): Record<string, unknown> {
  return {
    street: str(args.street),
    house_number: str(args.house_number),
    postal_code: str(args.postal_code),
    city: str(args.city),
    country: str(args.country, "NL"),
  };
}

function card(args: Args): Record<string, unknown> {
  const body: Record<string, unknown> = {
    second_line: str(args.second_line),
    type: "MASTERCARD",
    product_type: str(args.product_type),
    order_status: str(args.order_status, "VIRTUAL_DELIVERY"),
  };
  return pick(args, ["name_on_card", "product_sub_type"], body);
}

// ─── Table ────────────────────────────────────────────────────────────────────

export const OPERATIONS: Record<string, Operation> = {
  // OAuth (the partner's own user)
  create_oauth_client: { method: "POST", path: "/user/{partner_user_id}/oauth-client", scope: "partner", body: () => ({}) },
  list_oauth_clients: { method: "GET", path: "/user/{partner_user_id}/oauth-client", scope: "partner" },
  get_oauth_client: { method: "GET", path: "/user/{partner_user_id}/oauth-client/{oauth_client_id}", scope: "partner" },
  register_oauth_callback_url: {
    method: "POST",
    path: "/user/{partner_user_id}/oauth-client/{oauth_client_id}/callback-url",
    scope: "partner",
    body: (a) => ({ url: str(a.url) }),
  },

  // Provisions
  create_provision: {
    method: "POST",
    path: "/partner-user-provision",
    scope: "partner",
    body: (a) => ({
      external_uuid: str(a.external_uuid),
      user_verified_type: str(a.user_verified_type, "PARTNER_USER_PERSON"),
      email: str(a.email),
      phone_number: str(a.phone_number),
      products: Array.isArray(a.products) ? a.products : ["USER_VERIFIED"],
    }),
  },
  get_provision: { method: "GET", path: "/partner-user-provision/{provision_id}", scope: "partner" },
  list_provisions: { method: "GET", path: "/partner-user-provision", scope: "partner", query: ["status", "external_uuid"] },
  close_provision: {
    method: "PUT",
    path: "/partner-user-provision/{provision_id}",
    scope: "partner",
    body: () => ({ status: "CANCELLED" }),
  },
  reset_provision_token: {
    method: "PUT",
    path: "/partner-user-provision/{provision_id}",
    scope: "partner",
    body: () => ({ status: "TOKEN_RESET_REQUESTED" }),
  },

  // User freeze
  freeze_user: { method: "POST", path: "/user/{user_id}/freeze", scope: "user", body: () => ({}) },
  unfreeze_user: { method: "POST", path: "/user/{user_id}/unfreeze", scope: "user", body: () => ({}) },

  // Webhooks
  set_notification_filters: {
    method: "POST",
    path: "/user/{user_id}/notification-filter-url",
    scope: "user",
    body: (a) => ({ notification_filters: Array.isArray(a.filters) ? a.filters : [] }),
  },
  list_notification_failures: { method: "GET", path: "/user/{user_id}/notification-filter-failure", scope: "user" },
  retry_notification_failures: {
    method: "POST",
    path: "/user/{user_id}/notification-filter-failure",
    scope: "user",
    body: (a) => ({ notification_filter_failed_ids: str(a.failure_ids) }),
  },

  // KYC fulfilments
  set_address_main: {
    method: "POST",
    path: "/user/{user_id}/address-main",
    scope: "user",
    body: (a) => ({ address_main: address(a) }),
  },
  set_address_postal: {
    method: "POST",
    path: "/user/{user_id}/address-postal",
    scope: "user",
    body: (a) => ({ address_postal: address(a) }),
  },
  update_user_person: {
    method: "PUT",
    path: "/user-person/{user_id}",
    scope: "user",
    body: (a) => pick(a, ["first_name", "middle_name", "last_name", "date_of_birth"]),
  },
  set_tax_resident: {
    method: "POST",
    path: "/user/{user_id}/tax-resident",
    scope: "user",
    body: (a) => ({ tax_resident: Array.isArray(a.tax_residents) ? a.tax_residents : [] }),
  },
  set_nationality: {
    method: "POST",
    path: "/user/{user_id}/nationality",
    scope: "user",
    body: (a) => ({ all_nationality: Array.isArray(a.nationalities) ? a.nationalities : [] }),
  },
  start_identity_verification: {
    method: "POST",
    path: "/user/{user_id}/identity-verification-session",
    scope: "user",
    body: (a) => ({ purpose: str(a.purpose, "VERIFICATION"), provider: str(a.provider, "INCODE") }),
  },
  get_identity_verification: {
    method: "GET",
    path: "/user/{user_id}/identity-verification-session/{session_id}",
    scope: "user",
  },
  submit_identity_verification: {
    method: "PUT",
    path: "/user/{user_id}/identity-verification-session/{session_id}",
    scope: "user",
    body: () => ({ status: "SUBMITTED" }),
  },
  link_document_identification: {
    method: "POST",
    path: "/user/{user_id}/document-identification",
    scope: "user",
    body: (a) =>
      pick(a, [
        "document_type",
        "document_country_of_issuance",
        "document_attachment_id",
        "document_back_attachment_id",
      ]),
  },

  // Attachments (upload_attachment is a custom tool: it sends a binary body)
  get_attachment: { method: "GET", path: "/user/{user_id}/attachment/{attachment_id}", scope: "user" },

  // Monetary accounts
  create_bank_account: {
    method: "POST",
    path: "/user/{user_id}/monetary-account-bank",
    scope: "user",
    body: (a) => ({ currency: str(a.currency, "EUR"), description: str(a.description, "Main Account") }),
  },
  create_external_account: {
    method: "POST",
    path: "/user/{user_id}/monetary-account-external",
    scope: "user",
    body: (a) =>
      pick(a, ["display_name"], {
        currency: str(a.currency),
        service: str(a.service, "CURRENCY_CLOUD"),
        description: str(a.description, "External Account"),
      }),
  },
  list_monetary_accounts: { method: "GET", path: "/user/{user_id}/monetary-account", scope: "user" },
  get_monetary_account: { method: "GET", path: "/user/{user_id}/monetary-account/{account_id}", scope: "user" },
  update_bank_account: {
    method: "PUT",
    path: "/user/{user_id}/monetary-account-bank/{account_id}",
    scope: "user",
    body: (a) => pick(a, ["description", "daily_limit", "status", "sub_status", "reason", "reason_description"]),
  },

  // Payments
  create_payment: {
    method: "POST",
    path: "/user/{user_id}/monetary-account/{account_id}/payment",
    scope: "user",
    body: (a) =>
      pick(a, ["merchant_reference"], {
        amount: { value: str(a.amount), currency: str(a.currency, "EUR") },
        counterparty_alias: { type: "IBAN", value: str(a.counterparty_iban), name: str(a.counterparty_name) },
        description: str(a.description),
      }),
  },
  get_payment: {
    method: "GET",
    path: "/user/{user_id}/monetary-account/{account_id}/payment/{payment_id}",
    scope: "user",
  },
  list_payments: { method: "GET", path: "/user/{user_id}/monetary-account/{account_id}/payment", scope: "user" },

  // bunq.me tabs
  create_bunqme_tab: {
    method: "POST",
    path: "/user/{user_id}/monetary-account/{account_id}/bunqme-tab",
    scope: "user",
    body: (a) =>
      pick(a, ["payment_method"], {
        bunqme_tab_entry: pick(a, ["description", "redirect_url"], {
          amount_inquired: { value: str(a.amount), currency: str(a.currency, "EUR") },
        }),
      }),
  },
  get_bunqme_tab: {
    method: "GET",
    path: "/user/{user_id}/monetary-account/{account_id}/bunqme-tab/{bunqme_tab_id}",
    scope: "user",
  },
  list_bunqme_tabs: { method: "GET", path: "/user/{user_id}/monetary-account/{account_id}/bunqme-tab", scope: "user" },
  update_bunqme_tab: {
    method: "PUT",
    path: "/user/{user_id}/monetary-account/{account_id}/bunqme-tab/{bunqme_tab_id}",
    scope: "user",
    body: (a) => pick(a, ["status"]),
  },

  // Cards
  create_credit_card: { method: "POST", path: "/user/{user_id}/card-credit", scope: "user", body: card },
  create_debit_card: {
    method: "POST",
    path: "/user/{user_id}/card-debit",
    scope: "user",
    body: (a) => pick(a, ["monetary_account_id_fallback"], card(a)),
  },
  get_card: { method: "GET", path: "/user/{user_id}/card/{card_id}", scope: "user" },
  list_cards: { method: "GET", path: "/user/{user_id}/card", scope: "user" },
  update_card: {
    method: "PUT",
    path: "/user/{user_id}/card/{card_id}",
    scope: "user",
    body: (a) => pick(a, ["status", "card_limit", "card_limit_atm", "cancellation_reason"]),
  },

  // Card details (application-layer encrypted)
  create_card_pan: {
    method: "POST",
    path: "/user/{user_id}/card/{card_id}/primary-account-number",
    scope: "user",
    encrypt: true,
  },
  create_card_cvc2: {
    method: "POST",
    path: "/user/{user_id}/card/{card_id}/generated-cvc2",
    scope: "user",
    body: (a) => pick(a, ["type"]),
    encrypt: true,
  },
  list_card_cvc2: { method: "GET", path: "/user/{user_id}/card/{card_id}/generated-cvc2", scope: "user", encrypt: true },
  get_card_cvc2: {
    method: "GET",
    path: "/user/{user_id}/card/{card_id}/generated-cvc2/{generated_cvc2_id}",
    scope: "user",
    encrypt: true,
  },

  // Compliance: user information inquiry
  list_user_inquiries: {
    method: "GET",
    path: "/user/{user_id}/user-information-inquiry",
    scope: "user",
    query: ["status", "purpose"],
  },
  get_user_inquiry: { method: "GET", path: "/user/{user_id}/user-information-inquiry/{inquiry_id}", scope: "user" },
  respond_to_inquiry_entry: {
    method: "PUT",
    path: "/user/{user_id}/user-information-inquiry/{inquiry_id}/partner-user-information-inquiry-entry/{entry_id}",
    scope: "user",
    body: (a) => pick(a, ["all_attachment_id", "answer"]),
  },
};
