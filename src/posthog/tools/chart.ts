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
        // Call query-generate-hogql-from-question which generates AND executes the query
        const result = await callPostHogTool(
          "query-generate-hogql-from-question",
          { question }
        );
        if (isPostHogError(result)) return error(result.message);

        // Log the response shape for debugging
        console.log(
          "posthog-trend-chart response keys:",
          Object.keys(result)
        );

        // Try to parse chart data from the response
        const series = parseResponse(result);

        if (series.length === 0) {
          // Include truncated raw response so we can debug the shape
          const preview = JSON.stringify(result).slice(0, 500);
          return error(
            `No chartable time-series data found. Response preview: ${preview}`
          );
        }

        return widget({
          props: {
            title: question,
            series,
          },
          output: text(
            `Trend chart: "${question}" — ${series.length} series, ${series[0]?.data.length ?? 0} data points each.`
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
 * Try multiple response shapes to extract chart-friendly series data.
 */
function parseResponse(result: Record<string, unknown>): Series[] {
  let series: Series[];

  // Shape 1: HogQL result with { columns: string[], results: any[][] }
  series = parseColumnarResult(result);
  if (series.length > 0) return series;

  // Shape 2: Insight-style { results: [{ data: number[], days: string[], label: string }] }
  series = parseInsightResult(result);
  if (series.length > 0) return series;

  // Shape 3: Flat array { data: [{ date, value }] }
  series = parseFlatData(result);
  if (series.length > 0) return series;

  // Shape 4: Text response containing JSON — try to parse
  if (typeof result.text === "string") {
    try {
      const parsed = JSON.parse(result.text) as Record<string, unknown>;
      series = parseColumnarResult(parsed);
      if (series.length > 0) return series;
      series = parseInsightResult(parsed);
      if (series.length > 0) return series;
      series = parseFlatData(parsed);
      if (series.length > 0) return series;
    } catch {
      // not JSON, skip
    }
  }

  return [];
}

/**
 * Parse { columns: string[], results: any[][] } (HogQL query-run shape)
 */
function parseColumnarResult(result: Record<string, unknown>): Series[] {
  const columns = result.columns as string[] | undefined;
  const rows = (result.results ?? result.rows) as unknown[][] | undefined;

  if (!Array.isArray(columns) || !Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  // Find date column
  const dateColIdx = findDateColumnIndex(columns, rows);
  if (dateColIdx === -1) return [];

  return buildSeries(columns, rows, dateColIdx);
}

/**
 * Parse { results: [{ data: number[], days/labels: string[], label: string }] }
 */
function parseInsightResult(result: Record<string, unknown>): Series[] {
  const series: Series[] = [];
  const results = (result.results ?? result.result) as unknown;

  if (!Array.isArray(results)) return series;

  for (const r of results) {
    const rec = r as Record<string, unknown>;
    const data = rec.data as number[] | undefined;
    const days =
      (rec.days as string[]) ??
      (rec.labels as string[]) ??
      (rec.dates as string[]);
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

  return series;
}

/**
 * Parse { data: [{ date: string, value: number }] }
 */
function parseFlatData(result: Record<string, unknown>): Series[] {
  if (!Array.isArray(result.data)) return [];

  const arr = result.data as Array<Record<string, unknown>>;
  if (arr.length === 0) return [];

  // Check if items have date + value
  const first = arr[0];
  if ("date" in first && ("value" in first || "count" in first)) {
    return [
      {
        name: (result.label as string) ?? "Value",
        data: arr.map((d) => ({
          date: String(d.date),
          value: Number(d.value ?? d.count) || 0,
        })),
      },
    ];
  }

  return [];
}

function findDateColumnIndex(columns: string[], rows: unknown[][]): number {
  // First try by column name
  const idx = columns.findIndex((c) =>
    /^(date|day|week|month|time|timestamp|created_at|interval_start|hour)$/i.test(c)
  );
  if (idx !== -1) return idx;

  // Fall back: check if first column values look like dates
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

  // Each numeric column becomes a series
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
