import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DataStore } from "./dataStore.js";
import { TAB_CONFIGS } from "../data/tabConfigs.js";
import type { TabName } from "../types/sheets.js";

export function registerResources(server: McpServer, store: DataStore): void {
  for (const tab of TAB_CONFIGS) {
    const uri = `sindri://${tab.key}`;

    server.resource(
      tab.key,
      uri,
      {
        description: `Sindri Sheet: ${tab.label}. Columns: ${tab.columns.map((c) => c.key).join(", ")}`,
        mimeType: "application/json",
      },
      async () => {
        const data = store.getTabData(tab.key as TabName);
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              tab: tab.key,
              label: tab.label,
              columns: tab.columns.map((c) => ({ key: c.key, label: c.label })),
              rowCount: data.length,
              rows: data,
            }, null, 2),
          }],
        };
      }
    );
  }
}
