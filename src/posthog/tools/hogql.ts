import type { MCPServer } from "mcp-use/server";
import { object, error } from "mcp-use/server";
import { z } from "zod";
import { callPostHogTool, isPostHogError } from "../client.js";

export function registerHogQLTools(server: MCPServer) {
  server.tool(
    {
      name: "posthog-execute-sql",
      description:
        "Execute a raw SQL query directly against the PostHog database. Use for advanced analytics queries.",
      schema: z.object({
        query: z
          .string()
          .describe("The SQL query to execute"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ query }) => {
      try {
        const result = await callPostHogTool("execute-sql", { query });
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-execute-sql failed:", err);
        return error(
          `SQL query failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );

  server.tool(
    {
      name: "posthog-read-schema",
      description:
        "Read the PostHog data schema to understand available tables and columns. Useful before writing SQL queries.",
      schema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const result = await callPostHogTool("read-data-schema", {});
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-read-schema failed:", err);
        return error(
          `Failed to read schema: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );

  server.tool(
    {
      name: "posthog-list-errors",
      description:
        "List recent errors tracked by PostHog error tracking.",
      schema: z.object({
        search: z
          .string()
          .optional()
          .describe("Search errors by message"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ search }) => {
      try {
        const args: Record<string, unknown> = {};
        if (search) args.search = search;
        const result = await callPostHogTool("list-errors", args);
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-list-errors failed:", err);
        return error(
          `Failed to list errors: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );

  server.tool(
    {
      name: "posthog-list-experiments",
      description:
        "List all A/B test experiments in PostHog.",
      schema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const result = await callPostHogTool("experiment-get-all", {});
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-list-experiments failed:", err);
        return error(
          `Failed to list experiments: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );
}
