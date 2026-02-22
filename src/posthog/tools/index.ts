import type { MCPServer } from "mcp-use/server";
import { registerEventsTools } from "./events.js";
import { registerInsightsTools } from "./insights.js";
import { registerPersonsTools } from "./persons.js";
import { registerCohortsTools } from "./cohorts.js";
import { registerFeatureFlagsTools } from "./feature-flags.js";
import { registerHogQLTools } from "./hogql.js";

export function registerPostHogTools(server: MCPServer) {
  registerEventsTools(server);
  registerInsightsTools(server);
  registerPersonsTools(server);
  registerCohortsTools(server);
  registerFeatureFlagsTools(server);
  registerHogQLTools(server);
}
