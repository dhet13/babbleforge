import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DataStore } from "./dataStore.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

async function main(): Promise<void> {
  console.error("[Sindri MCP] Starting server...");

  const store = new DataStore();

  const server = new McpServer({
    name: "sindri-sheet",
    version: "1.0.0",
  });

  registerTools(server, store);
  registerResources(server, store);
  registerPrompts(server, store);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[Sindri MCP] Server running on stdio");
}

main().catch((error) => {
  console.error("[Sindri MCP] Fatal error:", error);
  process.exit(1);
});
