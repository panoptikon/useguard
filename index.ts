import { MCPServer } from "mcp-use/server";
import { registerPostHogTools } from "./src/posthog/tools/index.js";

const server = new MCPServer({
  name: "useguard",
  title: "useguard",
  version: "1.0.0",
  description: "Product intelligence MCP server powered by PostHog analytics",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

registerPostHogTools(server);

server.listen().then(() => {
  console.log("useguard server running");
});
