# useguard

**Unlock Product Intelligence with AI-Powered Usage Metrics**

useguard is an MCP (Model Context Protocol) application built with [mcp-use](https://mcp-use.com) that empowers product managers and founders to identify, create, and monitor the metrics that matter most to their product's success.

## Overview

Understanding user behavior is crucial for product growth and decision-making. useguard integrates seamlessly with your product's data infrastructure to help you:

- **Identify** the key metrics driving your core business outcomes
- **Create** custom metrics and cohorts tailored to your unique product goals
- **Monitor** real-time usage patterns, trends, and anomalies
- **Analyze** user segments and behavioral cohorts
- **Report** on metrics that stakeholders care about

Whether you're a bootstrap startup tracking your first MAU or a scaling company analyzing complex funnels, useguard brings product analytics directly into your AI-assisted workflow.

## Key Features

### 🎯 Smart Metric Discovery
Get AI-powered recommendations for metrics based on your industry, product type, and business goals. Discover hidden insights in your data that correlate with growth and retention.

### 📊 Custom Dashboard Builder
Define custom metrics combining events, properties, and user attributes. Build cohorts and segments without writing SQL.

### 🔍 Real-Time Monitoring
Track usage metrics as they happen. Get alerts when metrics deviate from baseline or reach critical thresholds.

### 📈 Trend Analysis
Understand metric trends over time with automatic seasonality detection and comparative analysis against different time periods.

### 👥 Cohort Analysis
Segment users by behavior, properties, and lifecycle stage. Compare metrics across different user groups to identify patterns.

### 🤖 AI-Powered Insights
Leverage Claude AI integration to ask natural language questions about your metrics and get data-driven answers.

## Quick Start

### Installation & Development

First, install dependencies and start the development server:

```bash
npm install
npm run dev
```

The server will start on `http://localhost:3000`. Open the inspector to explore available tools:

```
http://localhost:3000/inspector
```

The server auto-reloads as you make changes to the code. Start by editing `index.ts` to add new tools, resources, and prompts.

### Basic Usage

useguard exposes powerful tools that you can integrate with Claude or other MCP clients:

```typescript
// Tools for metric management
- create_metric: Define a new usage metric
- get_metric_data: Retrieve metric values and history
- analyze_cohort: Analyze behavior patterns across user segments
- detect_anomalies: Find unusual patterns in metric data
- generate_report: Create actionable reports on key metrics
```

## Architecture

useguard is built on the mcp-use framework and follows this architecture:

- **MCP Server**: Provides tools and resources for metric management
- **Interactive Widgets**: React-based UI components for visualization and exploration
- **Data Integration**: Connectors for popular analytics and event platforms
- **AI Integration**: Claude AI integration for intelligent analysis and insights

## Tools

### Metric Management
- `create_metric` - Define a new metric based on events and user properties
- `update_metric` - Modify existing metric definitions
- `get_metric_data` - Fetch metric data for a specific time range
- `delete_metric` - Remove unused metrics

### Analysis & Insights
- `analyze_cohort` - Compare metrics across user segments
- `detect_anomalies` - Identify unusual patterns and deviations
- `forecast_metric` - Predict future metric trends
- `get_recommendations` - AI-powered metric recommendations

### Reporting
- `generate_report` - Create comprehensive metric reports
- `export_data` - Export metrics in CSV or JSON format
- `schedule_report` - Set up automated report delivery

## Resources

useguard provides resources for accessing:

- **Metric Definitions**: Schema and documentation for all tracked metrics
- **Event Catalog**: Complete list of tracked events and properties
- **Dashboards**: Pre-built dashboards for common use cases
- **Guides**: Best practices for metric design and analysis

## Examples

### Finding Your North Star Metric

Use useguard to identify and validate your product's most important metric:

```bash
Ask Claude: "What's a good north star metric for a SaaS productivity tool?"
↓
Claude leverages useguard's analysis tools to:
  - Review your current event tracking
  - Analyze user cohorts by feature usage
  - Compare metrics against industry benchmarks
  - Recommend and create tracking for your north star
```

### Monitoring Feature Adoption

Track how quickly users adopt a new feature:

```bash
Ask Claude: "How are users adopting the new collaboration feature?"
↓
useguard provides:
  - Daily adoption curve
  - Comparison with user demographics
  - Correlation with retention
  - Cohort-specific insights
```

### Debugging Churn

Investigate why users are leaving:

```bash
Ask Claude: "What behavior changes precede churn in the last 30 days?"
↓
useguard analyzes:
  - Feature usage trends before churn
  - Session frequency patterns
  - User segment differences
  - Anomalies in metric baselines
```

## Configuration

### Environment Variables

```bash
# Data Platform Integration
DATABASE_URL=your_analytics_database
ANALYTICS_API_KEY=your_api_key

# Claude Integration (optional)
CLAUDE_API_KEY=your_claude_api_key

# Server Configuration
MCP_URL=http://localhost:3000
PORT=3000
```

### Connecting Data Sources

useguard supports integration with:

- **Segment** - For event collection and warehousing
- **Mixpanel** - For product analytics
- **Amplitude** - For behavioral analytics
- **Custom SQL** - Direct database connections
- **PostgreSQL/BigQuery** - Data warehouse backends

## Deployment

### Local Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Deploy to Manufact Cloud

```bash
npm run deploy
```

This will automatically deploy your useguard server to the Manufact Cloud platform with zero-downtime updates.

### Self-Hosting with Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t useguard .
docker run -p 3000:3000 useguard
```

## Best Practices

### Metric Design
- **Define clear goals** before creating metrics
- **Use consistent naming** conventions across your metric library
- **Document assumptions** in metric definitions
- **Validate metrics** against known events before relying on them

### Data Quality
- **Monitor data freshness** to ensure timely insights
- **Set up anomaly detection** for early warning of data issues
- **Validate metric calculations** regularly
- **Track event schema changes** that affect metrics

### Analysis
- **Use cohorts** to control for user segments
- **Compare time periods** to account for seasonality
- **Look for correlations** but validate causation
- **Share insights** with cross-functional teams

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Support

- 📚 [mcp-use Documentation](https://mcp-use.com/docs)
- 💬 [Model Context Protocol Spec](https://spec.modelcontextprotocol.io)
- 🐛 [Report Issues](https://github.com/panoptikon/useguard/issues)

## License

MIT License - see LICENSE file for details

---

Built with ❤️ using [mcp-use](https://mcp-use.com)
