import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PostgresDataStore } from "./dataStore.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

export function createMcpServer(
  sheetId: string,
  userId: string,
): { mcpServer: McpServer; store: PostgresDataStore } {
  const store = new PostgresDataStore(sheetId, userId);

  const mcpServer = new McpServer({
    name: "sindri-sheet",
    version: "2.0.0",
  });

  registerTools(mcpServer, store);
  registerResources(mcpServer, store);
  registerPrompts(mcpServer, store);

  return { mcpServer, store };
}
