import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

let client: Client | null = null;
let connectPromise: Promise<Client> | null = null;

export interface PostHogError {
  type: "config_error" | "connection_error" | "tool_error";
  message: string;
}

export function isPostHogError(val: unknown): val is PostHogError {
  return (
    typeof val === "object" &&
    val !== null &&
    "type" in val &&
    "message" in val
  );
}

function getConfig():
  | { apiKey: string; mcpUrl: string }
  | PostHogError {
  const apiKey = process.env.POSTHOG_API_KEY;
  const mcpUrl =
    process.env.POSTHOG_MCP_URL || "https://mcp.posthog.com/sse";

  if (!apiKey) {
    return {
      type: "config_error",
      message:
        "POSTHOG_API_KEY environment variable is not set. Get your key from PostHog → Settings → Personal API Keys.",
    };
  }

  return { apiKey, mcpUrl };
}

async function connectClient(): Promise<Client | PostHogError> {
  const config = getConfig();
  if ("type" in config) return config;

  try {
    const transport = new SSEClientTransport(new URL(config.mcpUrl), {
      eventSourceInit: {
        fetch: (url, init) =>
          fetch(url, {
            ...init,
            headers: {
              ...(init?.headers as Record<string, string>),
              Authorization: `Bearer ${config.apiKey}`,
            },
          }),
      },
      requestInit: {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      },
    });

    const mcpClient = new Client({
      name: "useguard",
      version: "1.0.0",
    });

    await mcpClient.connect(transport);
    return mcpClient;
  } catch (err) {
    return {
      type: "connection_error",
      message: `Failed to connect to PostHog MCP server: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

export async function getPostHogClient(): Promise<Client | PostHogError> {
  if (client) return client;

  if (!connectPromise) {
    connectPromise = connectClient().then((result) => {
      if (isPostHogError(result)) {
        connectPromise = null;
        throw result;
      }
      client = result;
      return result;
    });
  }

  try {
    return await connectPromise;
  } catch (err) {
    connectPromise = null;
    if (isPostHogError(err)) return err;
    return {
      type: "connection_error",
      message: `Failed to connect: ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }
}

export async function callPostHogTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<Record<string, any> | PostHogError> {
  const mcpClient = await getPostHogClient();
  if (isPostHogError(mcpClient)) return mcpClient;

  try {
    const result = await mcpClient.callTool({ name: toolName, arguments: args });

    if (result.isError) {
      const contentArr = result.content as Array<{ type: string; text?: string }>;
      const errorText = contentArr
        ?.filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n") || "Unknown error from PostHog MCP";
      return { type: "tool_error", message: errorText };
    }

    // Extract text content from the MCP response
    const contentArr = result.content as Array<{ type: string; text?: string }>;
    const textParts = contentArr
      ?.filter((c) => c.type === "text")
      .map((c) => c.text ?? "");

    if (textParts?.length === 1) {
      try {
        return JSON.parse(textParts[0]) as Record<string, any>;
      } catch {
        return { text: textParts[0] };
      }
    }

    return { text: textParts?.join("\n") ?? JSON.stringify(result) };
  } catch (err) {
    return {
      type: "tool_error",
      message: `Error calling PostHog tool '${toolName}': ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }
}
