import type { MCPServer } from "mcp-use/server";
import { object, error } from "mcp-use/server";
import { z } from "zod";
import { callPostHogTool, isPostHogError } from "../client.js";

export function registerCohortsTools(server: MCPServer) {
  server.tool(
    {
      name: "posthog-list-dashboards",
      description:
        "List all dashboards in PostHog. Returns dashboard names, descriptions, and IDs.",
      schema: z.object({
        search: z
          .string()
          .optional()
          .describe("Search dashboards by name"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ search }) => {
      try {
        const args: Record<string, unknown> = {};
        if (search) args.search = search;
        const result = await callPostHogTool("dashboards-get-all", args);
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-list-dashboards failed:", err);
        return error(
          `Failed to list dashboards: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );

  server.tool(
    {
      name: "posthog-get-dashboard",
      description:
        "Get a specific PostHog dashboard by ID, including all its tiles and insights.",
      schema: z.object({
        id: z.number().describe("The dashboard ID"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        const result = await callPostHogTool("dashboard-get", { id });
        if (isPostHogError(result)) return error(result.message);
        return object(result);
      } catch (err) {
        console.error("posthog-get-dashboard failed:", err);
        return error(
          `Failed to get dashboard: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );
}
