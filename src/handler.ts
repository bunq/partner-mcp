import { BunqClient } from "./bunq-client.ts";
import { OPERATIONS, isPresent, type Args, type Operation } from "./operations.ts";
import { TOOLS } from "./tools.ts";

const PATH_PLACEHOLDER = /\{([a-z_0-9]+)\}/g;
const PLACEHOLDER_PARTNER_USER_ID = "partner_user_id";

interface PropertySchema {
  type?: string;
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
    const { userId, userApiKeyId } = await client.createUserSession(String(args.credential_token));
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
      String(args.base64_content)
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
      return custom(argsValid, client);
    } else if (operation) {
      return executeOperation(operation, argsValid, client);
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
    if (schema.type === "number" && isPresent(args[name])) {
      const value = Number(args[name]);
      if (Number.isFinite(value)) {
        argsValid[name] = value;
      } else {
        throw new Error(`Argument ${name} of ${tool.name} must be a number, got ${JSON.stringify(args[name])}`);
      }
    } else {
      // Not a number argument, or absent.
    }
  }

  return argsValid;
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
