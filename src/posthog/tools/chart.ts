import type { MCPServer } from "mcp-use/server";
import { widget, text, error } from "mcp-use/server";
import { z } from "zod";
import { callPostHogTool, isPostHogError } from "../client.js";

export function registerChartTools(server: MCPServer) {
  server.tool(
    {
      name: "posthog-trend-chart",
      description:
        "Query PostHog for trend data and display it as an interactive line chart. Use this when the user asks for time-series visualizations like pageviews, signups, or events over time.",
      schema: z.object({
        question: z
          .string()
          .describe(
            "Natural language question about trends (e.g., 'Show me pageviews over the last 30 days')"
          ),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
      widget: {
        name: "trend-chart",
        invoking: "Generating chart...",
        invoked: "Chart ready",
      },
    },
    async ({ question }) => {
      try {
        const result = await callPostHogTool("insight-query", { question });
        if (isPostHogError(result)) return error(result.message);

        const series = parseTrendData(result);

        if (series.length === 0) {
          return error(
            "No trend data found in the response. Try rephrasing your question to request a trends insight."
          );
        }

        const title = (result as Record<string, unknown>).label as string
          ?? question;

        return widget({
          props: {
            title,
            series,
          },
          output: text(
            `Trend chart: "${title}" — ${series.length} series, ${series[0]?.data.length ?? 0} data points each.`
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

function parseTrendData(result: Record<string, unknown>): Series[] {
  const series: Series[] = [];

  // PostHog insight-query returns results in various shapes.
  // Try the most common structures.

  // Shape 1: { results: [{ data: number[], days/labels: string[], label: string }] }
  const results = (result.results ?? result.result) as unknown;
  if (Array.isArray(results)) {
    for (const r of results) {
      const rec = r as Record<string, unknown>;
      const data = rec.data as number[] | undefined;
      const days =
        (rec.days as string[]) ?? (rec.labels as string[]) ?? (rec.dates as string[]);
      const label = (rec.label as string) ?? (rec.name as string) ?? "Value";

      if (Array.isArray(data) && Array.isArray(days)) {
        series.push({
          name: label,
          data: days.map((d, i) => ({
            date: d,
            value: data[i] ?? 0,
          })),
        });
      }
    }
  }

  // Shape 2: { data: [{ date: string, value: number }], label: string }
  if (series.length === 0 && Array.isArray(result.data)) {
    const arr = result.data as Array<Record<string, unknown>>;
    if (arr.length > 0 && "date" in arr[0] && "value" in arr[0]) {
      series.push({
        name: (result.label as string) ?? "Value",
        data: arr.map((d) => ({
          date: String(d.date),
          value: Number(d.value),
        })),
      });
    }
  }

  return series;
}
