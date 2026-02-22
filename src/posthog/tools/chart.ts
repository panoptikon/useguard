import type { MCPServer } from "mcp-use/server";
import { widget, text, error } from "mcp-use/server";
import { z } from "zod";
import { callPostHogTool, isPostHogError } from "../client.js";

export function registerChartTools(server: MCPServer) {
  server.tool(
    {
      name: "posthog-trend-chart",
      description:
        "Execute a HogQL SQL query against PostHog and display the results as an interactive line chart. " +
        "The query MUST return a date/time column and one or more numeric columns. " +
        "Example: SELECT toDate(timestamp) AS date, count() AS pageviews FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL 30 DAY GROUP BY date ORDER BY date",
      schema: z.object({
        query: z
          .string()
          .describe(
            "HogQL SQL query that returns a date column and numeric value columns for charting"
          ),
        title: z
          .string()
          .optional()
          .describe("Chart title (defaults to the query)"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
      widget: {
        name: "trend-chart",
        invoking: "Generating chart...",
        invoked: "Chart ready",
      },
    },
    async ({ query, title }) => {
      try {
        const result = await callPostHogTool("execute-sql", { query });
        if (isPostHogError(result)) return error(result.message);

        const series = parseColumnarResult(result);

        if (series.length === 0) {
          const preview = JSON.stringify(result).slice(0, 300);
          return error(
            `Could not parse chart data. The query must return a date column and at least one numeric column. Response: ${preview}`
          );
        }

        const chartTitle = title ?? query.slice(0, 80);

        return widget({
          props: {
            title: chartTitle,
            series,
          },
          output: text(
            `Trend chart: "${chartTitle}" — ${series.length} series, ${series[0]?.data.length ?? 0} data points.\nSQL: ${query}`
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

function parseColumnarResult(result: Record<string, unknown>): Series[] {
  const columns = result.columns as string[] | undefined;
  const rows = (result.results ?? result.rows) as unknown[][] | undefined;

  if (!Array.isArray(columns) || !Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const dateColIdx = findDateColumnIndex(columns, rows);
  if (dateColIdx === -1) return [];

  return buildSeries(columns, rows, dateColIdx);
}

function findDateColumnIndex(columns: string[], rows: unknown[][]): number {
  const idx = columns.findIndex((c) =>
    /^(date|day|week|month|time|timestamp|created_at|interval_start|hour)$/i.test(c)
  );
  if (idx !== -1) return idx;

  if (rows.length > 0 && looksLikeDate(String(rows[0][0]))) {
    return 0;
  }

  return -1;
}

function buildSeries(
  columns: string[],
  rows: unknown[][],
  dateColIdx: number
): Series[] {
  const series: Series[] = [];

  for (let i = 0; i < columns.length; i++) {
    if (i === dateColIdx) continue;
    const firstVal = rows[0]?.[i];
    if (
      typeof firstVal === "number" ||
      (typeof firstVal === "string" && !isNaN(Number(firstVal)))
    ) {
      series.push({
        name: columns[i],
        data: rows.map((row) => ({
          date: String(row[dateColIdx]),
          value: Number(row[i]) || 0,
        })),
      });
    }
  }

  return series;
}

function looksLikeDate(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(val) || !isNaN(Date.parse(val));
}
