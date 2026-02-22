import type { MCPServer } from "mcp-use/server";
import { object, error } from "mcp-use/server";
import { z } from "zod";
import { callPostHogTool, isPostHogError } from "../client.js";

export function registerFeatureFlagsTools(server: MCPServer) {
  server.tool(
    {
      name: "posthog-list-feature-flags",
      description:
        "List all feature flags in PostHog. Returns flag keys, names, active status, and rollout details.",
      schema: z.object({
        search: z
          .string()
          .optional()
          .describe("Search flags by key or name"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ search }) => {
      try {
        const args: Record<string, unknown> = { limit: 100 };
        if (search) args.search = search;
        const result = await callPostHogTool("feature-flag-get-all", args);
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-list-feature-flags failed:", err);
        return error(
          `Failed to list feature flags: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );

  server.tool(
    {
      name: "posthog-get-feature-flag",
      description:
        "Get detailed information about a specific feature flag, including targeting rules and rollout configuration.",
      schema: z.object({
        id: z.number().describe("The feature flag ID"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        const result = await callPostHogTool("feature-flag-get-definition", {
          id,
        });
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-get-feature-flag failed:", err);
        return error(
          `Failed to get feature flag: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );
}
