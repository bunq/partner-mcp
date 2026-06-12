import { BunqClient } from "./bunq-client.js";

type Args = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v);
}
function arr<T>(v: unknown, fallback: T[]): T[] {
  return Array.isArray(v) ? (v as T[]) : fallback;
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function handleTool(
  name: string,
  args: Args,
  client: BunqClient
): Promise<unknown> {
  switch (name) {

    // ── Session ───────────────────────────────────────────────────────────────
    case "get_session_info": {
      await client.ensureSession();
      return {
        authenticated: client.isAuthenticated,
        environment: client.environment,
        user_id: client.currentUserId,
        message: `Connected to bunq ${client.environment} as user ${client.currentUserId}`,
      };
    }

    case "refresh_session": {
      await client.refreshSession();
      return {
        message: `Session refreshed. Authenticated as user ${client.currentUserId} on ${client.environment}`,
        user_id: client.currentUserId,
      };
    }

    // ── OAuth ─────────────────────────────────────────────────────────────────
    case "create_oauth_client": {
      return await client.call("POST", `/user/${client.currentUserId}/oauth-client`, {});
    }

    case "list_oauth_clients": {
      return await client.call("GET", `/user/${client.currentUserId}/oauth-client`, null);
    }

    case "get_oauth_client": {
      const clientId = num(args.oauth_client_id);
      return await client.call("GET", `/user/${client.currentUserId}/oauth-client/${clientId}`, null);
    }

    case "register_oauth_callback_url": {
      const clientId = num(args.oauth_client_id);
      return await client.call(
        "POST",
        `/user/${client.currentUserId}/oauth-client/${clientId}/callback-url`,
        { url: str(args.url) }
      );
    }

    // ── Provisions ────────────────────────────────────────────────────────────
    case "create_provision": {
      // Correct request body per docs (not the old pointer:{type,value} format)
      const body: Record<string, unknown> = {
        external_uuid: str(args.external_uuid),
        user_verified_type: str(args.user_verified_type, "PARTNER_USER_PERSON"),
        email: str(args.email),
        phone_number: str(args.phone_number),
        products: arr(args.products, ["USER_VERIFIED"]),
      };
      return await client.call("POST", "/partner-user-provision", body);
    }

    case "get_provision": {
      const id = num(args.provision_id);
      return await client.call("GET", `/partner-user-provision/${id}`, null);
    }

    case "list_provisions": {
      const params = new URLSearchParams();
      if (args.status) params.set("status", str(args.status));
      if (args.external_uuid) params.set("external_uuid", str(args.external_uuid));
      const qs = params.toString() ? `?${params.toString()}` : "";
      return await client.call("GET", `/partner-user-provision${qs}`, null);
    }

    case "close_provision": {
      // Correct status value per docs: CANCELLED (not PENDING_PROCESS_CLOSURE)
      const id = num(args.provision_id);
      return await client.call("PUT", `/partner-user-provision/${id}`, { status: "CANCELLED" });
    }

    case "reset_provision_token": {
      const id = num(args.provision_id);
      return await client.call("PUT", `/partner-user-provision/${id}`, {
        status: "TOKEN_RESET_REQUESTED",
      });
    }

    // ── User Session (on behalf of provisioned user) ──────────────────────────
    case "create_user_session": {
      // Creates a session using the provisioned user's credential.token_value
      return await client.callWithKey(str(args.credential_token), "POST", "/session-server", {
        secret: str(args.credential_token),
      });
    }

    // ── Webhooks ──────────────────────────────────────────────────────────────
    case "set_notification_filters": {
      // ⚠️ Replaces ALL existing filters — caller must include the full desired list
      const userId = num(args.user_id);
      const filters = arr<{ category: string; notification_target: string }>(args.filters, []);
      return await client.call("POST", `/user/${userId}/notification-filter-url`, {
        notification_filters: filters,
      });
    }

    case "list_notification_failures": {
      const userId = num(args.user_id);
      return await client.call("GET", `/user/${userId}/notification-filter-failure`, null);
    }

    case "retry_notification_failures": {
      const userId = num(args.user_id);
      return await client.call("POST", `/user/${userId}/notification-filter-failure`, {
        notification_filter_failed_ids: str(args.failure_ids),
      });
    }

    // ── KYC Fulfillments ──────────────────────────────────────────────────────
    case "set_address_main": {
      const userId = num(args.user_id);
      return await client.call("POST", `/user/${userId}/address-main`, {
        address_main: {
          street: str(args.street),
          house_number: str(args.house_number),
          postal_code: str(args.postal_code),
          city: str(args.city),
          country: str(args.country, "NL"),
        },
      });
    }

    case "set_address_postal": {
      const userId = num(args.user_id);
      return await client.call("POST", `/user/${userId}/address-postal`, {
        address_postal: {
          street: str(args.street),
          house_number: str(args.house_number),
          postal_code: str(args.postal_code),
          city: str(args.city),
          country: str(args.country, "NL"),
        },
      });
    }

    case "update_user_person": {
      const userId = num(args.user_id);
      const body: Record<string, unknown> = {
        first_name: str(args.first_name),
        last_name: str(args.last_name),
        date_of_birth: str(args.date_of_birth),
      };
      if (args.middle_name) body.middle_name = str(args.middle_name);
      return await client.call("PUT", `/user-person/${userId}`, body);
    }

    case "set_tax_resident": {
      const userId = num(args.user_id);
      return await client.call("POST", `/user/${userId}/tax-resident`, {
        tax_resident: arr(args.tax_residents, []),
      });
    }

    case "set_nationality": {
      const userId = num(args.user_id);
      return await client.call("POST", `/user/${userId}/nationality`, {
        all_nationality: arr(args.nationalities, []),
      });
    }

    case "start_identity_verification": {
      const userId = num(args.user_id);
      return await client.call("POST", `/user/${userId}/identity-verification-session`, {
        purpose: str(args.purpose, "VERIFICATION"),
        provider: str(args.provider, "INCODE"),
      });
    }

    case "get_identity_verification": {
      const userId = num(args.user_id);
      const sessionId = num(args.session_id);
      return await client.call(
        "GET",
        `/user/${userId}/identity-verification-session/${sessionId}`,
        null
      );
    }

    case "submit_identity_verification": {
      // user_id here is UserApiKey.id per the docs
      const userId = num(args.user_id);
      const sessionId = num(args.session_id);
      return await client.call(
        "PUT",
        `/user/${userId}/identity-verification-session/${sessionId}`,
        { status: "SUBMITTED" }
      );
    }

    case "link_document_identification": {
      const userId = num(args.user_id);
      const body: Record<string, unknown> = {
        document_type: str(args.document_type),
        document_country_of_issuance: str(args.document_country_of_issuance),
        document_attachment_id: num(args.document_attachment_id),
      };
      if (args.document_back_attachment_id) {
        body.document_back_attachment_id = num(args.document_back_attachment_id);
      }
      return await client.call("POST", `/user/${userId}/document-identification`, body);
    }

    // ── Attachments ───────────────────────────────────────────────────────────
    case "upload_attachment": {
      // Attachments use raw binary — we pass base64 here and note the limitation
      // In a real integration the client should send raw bytes with Content-Type header
      const userId = num(args.user_id);
      return await client.callAttachment(
        userId,
        str(args.description),
        str(args.content_type, "image/jpeg"),
        str(args.base64_content)
      );
    }

    case "get_attachment": {
      const userId = num(args.user_id);
      const attachmentId = num(args.attachment_id);
      return await client.call("GET", `/user/${userId}/attachment/${attachmentId}`, null);
    }

    // ── Monetary Accounts ─────────────────────────────────────────────────────
    case "create_bank_account": {
      const userId = num(args.user_id);
      return await client.call("POST", `/user/${userId}/monetary-account-bank`, {
        currency: str(args.currency, "EUR"),
        description: str(args.description, "Main Account"),
      });
    }

    case "create_external_account": {
      const userId = num(args.user_id);
      const body: Record<string, unknown> = {
        currency: str(args.currency),
        service: str(args.service, "CURRENCY_CLOUD"),
        description: str(args.description, "External Account"),
      };
      if (args.display_name) body.display_name = str(args.display_name);
      return await client.call("POST", `/user/${userId}/monetary-account-external`, body);
    }

    case "list_monetary_accounts": {
      const userId = num(args.user_id);
      return await client.call("GET", `/user/${userId}/monetary-account`, null);
    }

    case "get_monetary_account": {
      const userId = num(args.user_id);
      const accountId = num(args.account_id);
      return await client.call("GET", `/user/${userId}/monetary-account/${accountId}`, null);
    }

    // ── Payments ──────────────────────────────────────────────────────────────
    case "create_payment": {
      const userId = num(args.user_id);
      const accountId = num(args.account_id);
      const body: Record<string, unknown> = {
        amount: {
          value: str(args.amount),
          currency: str(args.currency, "EUR"),
        },
        counterparty_alias: {
          type: "IBAN",
          value: str(args.counterparty_iban),
          name: str(args.counterparty_name),
        },
        description: str(args.description),
      };
      if (args.merchant_reference) body.merchant_reference = str(args.merchant_reference);
      return await client.call(
        "POST",
        `/user/${userId}/monetary-account/${accountId}/payment`,
        body
      );
    }

    case "get_payment": {
      const userId = num(args.user_id);
      const accountId = num(args.account_id);
      const paymentId = num(args.payment_id);
      return await client.call(
        "GET",
        `/user/${userId}/monetary-account/${accountId}/payment/${paymentId}`,
        null
      );
    }

    case "list_payments": {
      const userId = num(args.user_id);
      const accountId = num(args.account_id);
      return await client.call(
        "GET",
        `/user/${userId}/monetary-account/${accountId}/payment`,
        null
      );
    }

    // ── Cards ─────────────────────────────────────────────────────────────────
    case "create_credit_card": {
      const userId = num(args.user_id);
      const body: Record<string, unknown> = {
        second_line: str(args.second_line),
        type: "MASTERCARD",
        product_type: str(args.product_type),
        order_status: str(args.order_status, "VIRTUAL_DELIVERY"),
      };
      if (args.name_on_card) body.name_on_card = str(args.name_on_card);
      if (args.product_sub_type) body.product_sub_type = str(args.product_sub_type);
      return await client.call("POST", `/user/${userId}/card-credit`, body);
    }

    case "create_debit_card": {
      const userId = num(args.user_id);
      const body: Record<string, unknown> = {
        second_line: str(args.second_line),
        type: "MASTERCARD",
        product_type: str(args.product_type),
        order_status: str(args.order_status, "VIRTUAL_DELIVERY"),
      };
      if (args.name_on_card) body.name_on_card = str(args.name_on_card);
      if (args.product_sub_type) body.product_sub_type = str(args.product_sub_type);
      if (args.monetary_account_id_fallback) {
        body.monetary_account_id_fallback = num(args.monetary_account_id_fallback);
      }
      return await client.call("POST", `/user/${userId}/card-debit`, body);
    }

    case "get_card": {
      const userId = num(args.user_id);
      const cardId = num(args.card_id);
      return await client.call("GET", `/user/${userId}/card/${cardId}`, null);
    }

    case "list_cards": {
      const userId = num(args.user_id);
      return await client.call("GET", `/user/${userId}/card`, null);
    }

    case "update_card": {
      const userId = num(args.user_id);
      const cardId = num(args.card_id);
      const body: Record<string, unknown> = {};
      if (args.status) body.status = str(args.status);
      if (args.card_limit) body.card_limit = obj(args.card_limit);
      if (args.card_limit_atm) body.card_limit_atm = obj(args.card_limit_atm);
      if (args.cancellation_reason) body.cancellation_reason = str(args.cancellation_reason);
      return await client.call("PUT", `/user/${userId}/card/${cardId}`, body);
    }

    // ── Compliance: User Information Inquiry ──────────────────────────────────
    case "list_user_inquiries": {
      const userId = num(args.user_id);
      const params = new URLSearchParams();
      if (args.status) params.set("status", str(args.status));
      if (args.purpose) params.set("purpose", str(args.purpose));
      const qs = params.toString() ? `?${params.toString()}` : "";
      return await client.call("GET", `/user/${userId}/user-information-inquiry${qs}`, null);
    }

    case "get_user_inquiry": {
      const userId = num(args.user_id);
      const inquiryId = num(args.inquiry_id);
      return await client.call(
        "GET",
        `/user/${userId}/user-information-inquiry/${inquiryId}`,
        null
      );
    }

    case "respond_to_inquiry_entry": {
      const userId = num(args.user_id);
      const inquiryId = num(args.inquiry_id);
      const entryId = num(args.entry_id);
      const body: Record<string, unknown> = {};
      if (args.all_attachment_id) body.all_attachment_id = arr(args.all_attachment_id, []);
      if (args.answer) body.answer = str(args.answer);
      return await client.call(
        "PUT",
        `/user/${userId}/user-information-inquiry/${inquiryId}/partner-user-information-inquiry-entry/${entryId}`,
        body
      );
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
