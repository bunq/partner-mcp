import { BunqClient } from "./bunq-client.ts";
import { OPERATIONS, isPresent, type Args, type Operation } from "./operations.ts";
import { TOOLS } from "./tools.ts";

const PATH_PLACEHOLDER = /\{([a-z_0-9]+)\}/g;
const BASE64_PATTERN = /^[A-Za-z0-9+/\s]*={0,2}$/;
const DATA_URI_PREFIX = /^data:[^;,]*;base64,/;
const HIDDEN_TOKEN = "[hidden: pass provision_id to create_user_session instead]";
const HIDDEN_SECRET = "[hidden]";
const PAN_DIGITS_VISIBLE = 4;
const PLACEHOLDER_PARTNER_USER_ID = "partner_user_id";

interface PropertySchema {
  type?: string;
  enum?: readonly string[];
}

export interface ToolDefinition {
  readonly name: string;
  readonly inputSchema: {
    readonly properties: Readonly<Record<string, PropertySchema>>;
    readonly required?: readonly string[];
  };
}

const TOOL_BY_NAME = new Map<string, ToolDefinition>(
  (TOOLS as readonly ToolDefinition[]).map((tool) => [tool.name, tool])
);

/** Tools that are not a single API call, so they have no entry in OPERATIONS. */
const TOOL_CUSTOM: Record<string, (args: Args, client: BunqClient) => Promise<unknown>> = {
  get_session_info: async (_args, client) => {
    await client.ensureSession();
    return {
      authenticated: client.isAuthenticated,
      environment: client.environment,
      user_id: client.currentUserId,
      user_ids_with_session: client.userIdsWithSession,
      message: `Connected to bunq ${client.environment} as user ${client.currentUserId}`,
    };
  },

  refresh_session: async (_args, client) => {
    await client.refreshSession();
    return {
      message: `Session refreshed. Authenticated as user ${client.currentUserId} on ${client.environment}`,
      user_id: client.currentUserId,
    };
  },

  create_user_session: async (args, client) => {
    let session;
    if (isPresent(args.provision_id)) {
      session = await client.createUserSessionByProvision(Number(args.provision_id));
    } else if (isPresent(args.credential_token)) {
      session = await client.createUserSession(String(args.credential_token));
    } else {
      throw new Error("create_user_session needs provision_id (preferred) or credential_token");
    }
    const { userId, userApiKeyId } = session;
    return {
      user_id: userId,
      user_api_key_id: userApiKeyId,
      message:
        `Session created for provisioned user ${userId}. Pass user_id ${userId} to the per-user tools. ` +
        `Only set_notification_filters for this user's webhooks takes user_api_key_id ${userApiKeyId}.`,
    };
  },

  upload_attachment: async (args, client) =>
    client.uploadAttachment(
      Number(args.user_id),
      String(args.description),
      isPresent(args.content_type) ? String(args.content_type) : "image/jpeg",
      determineBase64Content(String(args.base64_content))
    ),
};

export function determineAllToolNameCustom(): string[] {
  return Object.keys(TOOL_CUSTOM);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function handleTool(name: string, args: Args, client: BunqClient): Promise<unknown> {
  const tool = TOOL_BY_NAME.get(name);

  if (tool === undefined) {
    throw new Error(`Unknown tool: ${name}`);
  } else {
    const argsValid = validateArgs(tool, args);
    const custom = TOOL_CUSTOM[name];
    const operation = OPERATIONS[name];

    if (custom) {
      return hideSecret(await custom(argsValid, client));
    } else if (operation) {
      return hideSecret(await executeOperation(operation, argsValid, client));
    } else {
      throw new Error(`Tool ${name} has no implementation`);
    }
  }
}

/** Rejects missing required arguments and turns numeric strings into numbers. */
export function validateArgs(tool: ToolDefinition, args: Args): Args {
  const argsValid: Args = { ...args };

  for (const name of tool.inputSchema.required ?? []) {
    if (isPresent(args[name])) {
      // Required argument is present.
    } else {
      throw new Error(`Missing required argument for ${tool.name}: ${name}`);
    }
  }

  for (const [name, schema] of Object.entries(tool.inputSchema.properties)) {
    if (isPresent(args[name])) {
      argsValid[name] = determineArgValid(tool.name, name, schema, args[name]);
    } else {
      // Absent optional argument.
    }
  }

  return argsValid;
}

/** Turns a value into the schema type, or refuses it. A silent default could send a wrong request. */
function determineArgValid(toolName: string, name: string, schema: PropertySchema, value: unknown): unknown {
  const fail = (expected: string): never => {
    throw new Error(`Argument ${name} of ${toolName} must be ${expected}, got ${JSON.stringify(value)}`);
  };
  let valueValid: unknown;

  if (schema.type === "number") {
    valueValid = Number(value);
    if (typeof value === "boolean" || Number.isFinite(valueValid) === false) fail("a number");
  } else if (schema.type === "string") {
    valueValid = typeof value === "number" ? String(value) : value;
    if (typeof valueValid !== "string") fail("a string");
  } else if (schema.type === "array") {
    valueValid = typeof value === "string" ? parseJsonOrNull(value) : value;
    if (Array.isArray(valueValid) === false) fail("an array");
  } else if (schema.type === "object") {
    valueValid = typeof value === "string" ? parseJsonOrNull(value) : value;
    if (valueValid === null || typeof valueValid !== "object" || Array.isArray(valueValid)) fail("an object");
  } else {
    valueValid = value;
  }

  if (schema.enum && schema.enum.includes(String(valueValid)) === false) {
    fail(`one of ${schema.enum.join(", ")}`);
  } else {
    // No enum, or a listed value.
  }

  return valueValid;
}

function parseJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function determineBase64Content(content: string): string {
  const contentBase64 = content.replace(DATA_URI_PREFIX, "");

  if (contentBase64.length > 0 && BASE64_PATTERN.test(contentBase64)) {
    return contentBase64;
  } else {
    throw new Error("base64_content must be the file bytes as base64 (a data: URI also works), not a file path");
  }
}

/**
 * Keeps secrets out of the model context: credential tokens (use provision_id instead), card
 * numbers (last 4 digits stay) and CVC codes.
 */
export function hideSecret(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(hideSecret);
  } else if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (key === "token_value" && typeof item === "string") {
        result[key] = HIDDEN_TOKEN;
      } else if (key === "primary_account_number" && typeof item === "string") {
        result[key] = `•••• ${item.slice(-PAN_DIGITS_VISIBLE)}`;
      } else if (/^cvc2?$/.test(key) && typeof item === "string") {
        result[key] = HIDDEN_SECRET;
      } else {
        result[key] = hideSecret(item);
      }
    }
    return result;
  } else {
    return value;
  }
}

export async function executeOperation(operation: Operation, args: Args, client: BunqClient): Promise<unknown> {
  if (operation.path.includes(`{${PLACEHOLDER_PARTNER_USER_ID}}`)) {
    await client.ensureSession();
  } else {
    // The path does not need the partner's own id.
  }

  const path = buildPath(operation, args, client.currentUserId);
  const body = operation.body ? operation.body(args) : null;
  const encrypt = operation.encrypt ?? false;

  if (operation.scope === "user") {
    return client.callForUser(Number(args.user_id), operation.method, path, body, encrypt);
  } else {
    return client.call(operation.method, path, body, encrypt);
  }
}

export function buildPath(operation: Operation, args: Args, partnerUserId: number): string {
  const pathFilled = operation.path.replace(PATH_PLACEHOLDER, (_match, name: string) => {
    if (name === PLACEHOLDER_PARTNER_USER_ID) {
      return String(partnerUserId);
    } else if (isPresent(args[name])) {
      return encodeURIComponent(String(args[name]));
    } else {
      throw new Error(`Missing path argument: ${name}`);
    }
  });

  const params = new URLSearchParams();
  for (const name of operation.query ?? []) {
    if (isPresent(args[name])) params.set(name, String(args[name]));
  }
  const queryString = params.toString();

  return queryString ? `${pathFilled}?${queryString}` : pathFilled;
}
