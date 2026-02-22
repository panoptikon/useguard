import type { MCPServer } from "mcp-use/server";
import { object, error } from "mcp-use/server";
import { z } from "zod";
import { callPostHogTool, isPostHogError } from "../client.js";

export function registerPersonsTools(server: MCPServer) {
  server.tool(
    {
      name: "posthog-search-entities",
      description:
        "Search across PostHog entities — events, persons, feature flags, insights, and more.",
      schema: z.object({
        query: z
          .string()
          .describe("Search query to find entities in PostHog"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ query }) => {
      try {
        const result = await callPostHogTool("entity-search", { query });
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-search-entities failed:", err);
        return error(
          `Failed to search: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );

  server.tool(
    {
      name: "posthog-list-properties",
      description:
        "List all event and person properties tracked in PostHog.",
      schema: z.object({
        search: z
          .string()
          .optional()
          .describe("Search properties by name"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ search }) => {
      try {
        const args: Record<string, unknown> = {};
        if (search) args.search = search;
        const result = await callPostHogTool("properties-list", args);
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-list-properties failed:", err);
        return error(
          `Failed to list properties: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );
}
