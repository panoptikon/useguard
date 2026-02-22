import type { MCPServer } from "mcp-use/server";
import { widget, text, error } from "mcp-use/server";
import { z } from "zod";
import { callPostHogTool, isPostHogError } from "../client.js";

export function registerChartTools(server: MCPServer) {
  server.tool(
    {
      name: "posthog-trend-chart",
      description:
        "Query PostHog for trend data and display it as an interactive line chart. Use this when the user asks for time-series visualizations like pageviews, signups, or events over time. Generates a HogQL query from the question and renders the results as a chart.",
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
        // Step 1: Generate HogQL from natural language
        const hogqlResult = await callPostHogTool(
          "query-generate-hogql-from-question",
          { question }
        );
        if (isPostHogError(hogqlResult)) return error(hogqlResult.message);

        // Extract the generated SQL query
        const sql = extractSQL(hogqlResult);
        if (!sql) {
          return error(
            "Could not generate a SQL query from the question. Try being more specific, e.g. 'Show me daily $pageview events over the last 30 days'."
          );
        }

        // Step 2: Execute the query
        const queryResult = await callPostHogTool("query-run", { query: sql });
        if (isPostHogError(queryResult)) return error(queryResult.message);

        // Step 3: Parse into chart series
        const series = parseQueryResult(queryResult);

        if (series.length === 0) {
          return error(
            "The query returned data but it could not be parsed into a time-series chart. The result may not contain date and numeric columns."
          );
        }

        const title = question;

        return widget({
          props: {
            title,
            series,
          },
          output: text(
            `Trend chart: "${title}" — ${series.length} series, ${series[0]?.data.length ?? 0} data points each.\nSQL: ${sql}`
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

function extractSQL(result: Record<string, unknown>): string | null {
  // The tool may return { query: "SELECT ..." } or { sql: "..." } or { text: "..." }
  if (typeof result.query === "string") return result.query;
  if (typeof result.sql === "string") return result.sql;
  if (typeof result.hogql === "string") return result.hogql;
  // Sometimes it's nested inside a text response
  if (typeof result.text === "string") {
    // Try to extract SQL from text that might contain explanation + query
    const sqlMatch = result.text.match(/```sql\s*([\s\S]*?)```/i);
    if (sqlMatch) return sqlMatch[1].trim();
    // If the whole text looks like SQL
    if (result.text.trim().toUpperCase().startsWith("SELECT")) return result.text.trim();
  }
  return null;
}

function parseQueryResult(result: Record<string, unknown>): Series[] {
  const series: Series[] = [];

  // HogQL query-run returns { columns: string[], results: any[][] }
  const columns = result.columns as string[] | undefined;
  const rows = result.results as unknown[][] | undefined;

  if (!Array.isArray(columns) || !Array.isArray(rows) || rows.length === 0) {
    return series;
  }

  // Find date column and value columns
  const dateColIdx = columns.findIndex((c) =>
    /^(date|day|week|month|time|timestamp|created_at|interval_start)$/i.test(c)
  );

  if (dateColIdx === -1) {
    // No obvious date column — try first column if it looks like dates
    if (rows.length > 0 && looksLikeDate(String(rows[0][0]))) {
      return buildSeries(columns, rows, 0);
    }
    return series;
  }

  return buildSeries(columns, rows, dateColIdx);
}

function buildSeries(
  columns: string[],
  rows: unknown[][],
  dateColIdx: number
): Series[] {
  const series: Series[] = [];

  // Each numeric column becomes a series
  const numericColIdxs: number[] = [];
  for (let i = 0; i < columns.length; i++) {
    if (i === dateColIdx) continue;
    // Check if the column has numeric values
    const firstVal = rows[0]?.[i];
    if (typeof firstVal === "number" || (typeof firstVal === "string" && !isNaN(Number(firstVal)))) {
      numericColIdxs.push(i);
    }
  }

  if (numericColIdxs.length === 0) return series;

  for (const colIdx of numericColIdxs) {
    series.push({
      name: columns[colIdx],
      data: rows.map((row) => ({
        date: String(row[dateColIdx]),
        value: Number(row[colIdx]) || 0,
      })),
    });
  }

  return series;
}

function looksLikeDate(val: string): boolean {
  // Check common date patterns: 2024-01-15, 2024-01-15T..., Jan 15, etc.
  return /^\d{4}-\d{2}-\d{2}/.test(val) || !isNaN(Date.parse(val));
}
