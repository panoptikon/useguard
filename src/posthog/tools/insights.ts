import type { MCPServer } from "mcp-use/server";
import { object, error } from "mcp-use/server";
import { z } from "zod";
import { callPostHogTool, isPostHogError } from "../client.js";

export function registerInsightsTools(server: MCPServer) {
  server.tool(
    {
      name: "posthog-list-insights",
      description:
        "List all saved insights (trends, funnels, retention, etc.) from PostHog.",
      schema: z.object({
        search: z
          .string()
          .optional()
          .describe("Search insights by name"),
        limit: z
          .number()
          .optional()
          .describe("Max results to return"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ search, limit }) => {
      try {
        const args: Record<string, unknown> = {};
        if (search) args.search = search;
        if (limit) args.limit = limit;
        const result = await callPostHogTool("insights-get-all", args);
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-list-insights failed:", err);
        return error(
          `Failed to list insights: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );

  server.tool(
    {
      name: "posthog-get-insight",
      description:
        "Get a specific PostHog insight by its short ID, including its computed results.",
      schema: z.object({
        short_id: z
          .string()
          .describe("The short ID of the insight to retrieve"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ short_id }) => {
      try {
        const result = await callPostHogTool("insight-get", { short_id });
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-get-insight failed:", err);
        return error(
          `Failed to get insight: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );

  server.tool(
    {
      name: "posthog-insight-query",
      description:
        "Run an insight query in PostHog with natural language. Generates and executes the appropriate insight type (trends, funnels, retention, etc.).",
      schema: z.object({
        question: z
          .string()
          .describe(
            "Natural language question about your data (e.g., 'Show me a trend of pageviews over the last 30 days')"
          ),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ question }) => {
      try {
        const result = await callPostHogTool("insight-query", { question });
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-insight-query failed:", err);
        return error(
          `Failed to query insight: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );
}
