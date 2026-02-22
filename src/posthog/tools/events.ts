import type { MCPServer } from "mcp-use/server";
import { object, error } from "mcp-use/server";
import { z } from "zod";
import { callPostHogTool, isPostHogError } from "../client.js";

export function registerEventsTools(server: MCPServer) {
  server.tool(
    {
      name: "posthog-query-events",
      description:
        "Query recent events from PostHog using HogQL. Translates a natural-language question into a SQL query and runs it against your PostHog data.",
      schema: z.object({
        question: z
          .string()
          .describe(
            "Natural language question about events (e.g., 'What are the top 10 events in the last 7 days?')"
          ),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ question }) => {
      try {
        const result = await callPostHogTool(
          "query-generate-hogql-from-question",
          { question }
        );
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-query-events failed:", err);
        return error(
          `Failed to query events: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );

  server.tool(
    {
      name: "posthog-run-query",
      description:
        "Execute a raw HogQL SQL query against PostHog data. Use this for custom analytics queries.",
      schema: z.object({
        query: z
          .string()
          .describe(
            "HogQL SQL query (e.g., 'SELECT event, count() FROM events GROUP BY event ORDER BY count() DESC LIMIT 10')"
          ),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ query }) => {
      try {
        const result = await callPostHogTool("query-run", { query });
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-run-query failed:", err);
        return error(
          `Failed to run query: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );

  server.tool(
    {
      name: "posthog-event-definitions",
      description:
        "List all event definitions tracked in PostHog, including event names and metadata.",
      schema: z.object({
        search: z
          .string()
          .optional()
          .describe("Search event definitions by name"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ search }) => {
      try {
        const args: Record<string, unknown> = {};
        if (search) args.search = search;
        const result = await callPostHogTool("event-definitions-list", args);
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-event-definitions failed:", err);
        return error(
          `Failed to list event definitions: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );
}
