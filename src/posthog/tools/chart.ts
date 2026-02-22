import type { MCPServer } from "mcp-use/server";
import { widget, text, error } from "mcp-use/server";
import { z } from "zod";
import { callPostHogTool, isPostHogError } from "../client.js";

export function registerChartTools(server: MCPServer) {
  server.tool(
    {
      name: "posthog-trend-chart",
      description:
        "Query PostHog for trend data and display it as an interactive line chart. " +
        "Executes a TrendsQuery via PostHog's query-run tool. " +
        "Provide one or more event names to chart over time.",
      schema: z.object({
        events: z
          .array(
            z.object({
              event: z.string().describe("Event name (e.g. '$pageview', 'user signed up')"),
              label: z.string().optional().describe("Display label for this series"),
              math: z
                .enum(["total", "dau", "weekly_active", "monthly_active", "unique_session"])
                .optional()
                .describe("Aggregation method (default: total)"),
            })
          )
          .describe("Events to chart"),
        date_from: z
          .string()
          .optional()
          .describe("Start date (e.g. '-30d', '-7d', '2024-01-01'). Default: -7d"),
        date_to: z
          .string()
          .optional()
          .describe("End date (e.g. '-1d', '2024-12-31'). Default: now"),
        interval: z
          .enum(["hour", "day", "week", "month"])
          .optional()
          .describe("Time bucket interval (default: day)"),
        title: z
          .string()
          .optional()
          .describe("Chart title"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
      widget: {
        name: "trend-chart",
        invoking: "Generating chart...",
        invoked: "Chart ready",
      },
    },
    async ({ events, date_from, date_to, interval, title }) => {
      try {
        const query = {
          kind: "InsightVizNode" as const,
          source: {
            kind: "TrendsQuery" as const,
            dateRange: {
              date_from: date_from ?? "-7d",
              ...(date_to ? { date_to } : {}),
            },
            interval: interval ?? "day",
            series: events.map((e) => ({
              kind: "EventsNode" as const,
              event: e.event,
              custom_name: e.label ?? e.event,
              math: e.math ?? "total",
            })),
          },
        };

        const result = await callPostHogTool("query-run", { query });
        if (isPostHogError(result)) return error(result.message);

        // The response comes as { text: "..." } with a YAML-like format
        const responseText =
          typeof result.text === "string" ? result.text : JSON.stringify(result);

        const series = parseTrendResponse(responseText);

        if (series.length === 0) {
          return error(
            `No chartable data found. Response preview: ${responseText.slice(0, 300)}`
          );
        }

        const chartTitle =
          title ?? events.map((e) => e.label ?? e.event).join(", ");

        return widget({
          props: {
            title: chartTitle,
            series,
          },
          output: text(
            `Trend chart: "${chartTitle}" — ${series.length} series, ${series[0]?.data.length ?? 0} data points each.`
          ),
        });
      } catch (err) {
        console.error("posthog-trend-chart failed:", err);
        return error(
          `Failed to generate chart: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  );
}

interface SeriesPoint {
  date: string;
  value: number;
}

interface Series {
  name: string;
  data: SeriesPoint[];
}

/**
 * Parse the YAML-like text response from PostHog query-run TrendsQuery.
 *
 * The response contains blocks like:
 *   - data[8]: 0,0,177,178,63,274,308,71
 *     days[8]: 2026-02-14,2026-02-15,...
 *     label: $pageview
 */
function parseTrendResponse(text: string): Series[] {
  const series: Series[] = [];

  // Split into result blocks — each starts with "- data["
  const blocks = text.split(/\n\s*- data\[/);

  for (let i = 1; i < blocks.length; i++) {
    const block = "data[" + blocks[i];

    // Extract data values
    const dataMatch = block.match(/data\[\d+\]:\s*([^\n]+)/);
    const daysMatch = block.match(/days\[\d+\]:\s*([^\n]+)/);
    const labelMatch = block.match(/label:\s*([^\n]+)/);
    const customNameMatch = block.match(/custom_name:\s*([^\n]+)/);

    if (dataMatch && daysMatch) {
      const values = dataMatch[1].split(",").map((v) => Number(v.trim()));
      const days = daysMatch[1].split(",").map((d) => d.trim());
      const name = customNameMatch?.[1]?.trim() ?? labelMatch?.[1]?.trim() ?? "Value";

      if (values.length === days.length && values.length > 0) {
        series.push({
          name,
          data: days.map((date, idx) => ({
            date,
            value: values[idx] ?? 0,
          })),
        });
      }
    }
  }

  return series;
}
