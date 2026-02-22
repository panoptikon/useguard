import { McpUseProvider, useWidget, useWidgetTheme, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const propsSchema = z.object({
  title: z.string(),
  series: z.array(
    z.object({
      name: z.string(),
      data: z.array(
        z.object({
          date: z.string(),
          value: z.number(),
        })
      ),
    })
  ),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Display trend data as an interactive line chart",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;

const LINE_COLORS = ["#4a9eff", "#ff6b6b", "#51cf66", "#fcc419", "#cc5de8", "#20c997"];

export default function TrendChart() {
  const { props, isPending } = useWidget<Props>();
  const theme = useWidgetTheme();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: theme === "dark" ? "#808080" : "#999",
          }}
        >
          Loading chart...
        </div>
      </McpUseProvider>
    );
  }

  const colors = {
    background: theme === "dark" ? "#1e1e1e" : "#ffffff",
    text: theme === "dark" ? "#e0e0e0" : "#1a1a1a",
    textSecondary: theme === "dark" ? "#b0b0b0" : "#666",
    grid: theme === "dark" ? "#333333" : "#e0e0e0",
    tooltipBg: theme === "dark" ? "#2a2a2a" : "#ffffff",
    tooltipBorder: theme === "dark" ? "#404040" : "#e0e0e0",
  };

  // Merge all series into a single dataset keyed by date
  const dateMap = new Map<string, Record<string, number | string>>();
  for (const s of props.series) {
    for (const point of s.data) {
      const existing = dateMap.get(point.date) || { date: point.date };
      existing[s.name] = point.value;
      dateMap.set(point.date, existing);
    }
  }
  const chartData = Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
  );

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: 20, backgroundColor: colors.background, color: colors.text }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 600 }}>
          {props.title}
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="date"
              tick={{ fill: colors.textSecondary, fontSize: 12 }}
              tickLine={{ stroke: colors.grid }}
              axisLine={{ stroke: colors.grid }}
              label={
                props.xAxisLabel
                  ? { value: props.xAxisLabel, position: "insideBottom", offset: -5, fill: colors.textSecondary }
                  : undefined
              }
            />
            <YAxis
              tick={{ fill: colors.textSecondary, fontSize: 12 }}
              tickLine={{ stroke: colors.grid }}
              axisLine={{ stroke: colors.grid }}
              label={
                props.yAxisLabel
                  ? { value: props.yAxisLabel, angle: -90, position: "insideLeft", fill: colors.textSecondary }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 6,
                color: colors.text,
              }}
            />
            {props.series.length > 1 && (
              <Legend wrapperStyle={{ color: colors.text }} />
            )}
            {props.series.map((s, i) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={chartData.length <= 31}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </McpUseProvider>
  );
}
