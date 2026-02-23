import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PostgresDataStore } from "./dataStore.js";
import { TAB_CONFIGS } from "../../../src/data/tabConfigs.js";
import type { TabName } from "../../../src/types/sheets.js";

const TabNameEnum = z.enum([
  "meta",
  "rules",
  "dataModel",
  "features",
  "design",
  "screens",
  "errors",
]);

export function registerTools(
  server: McpServer,
  store: PostgresDataStore,
): void {
  server.tool(
    "get_sheet_data",
    "Get current data from a specific tab or all tabs in the Sindri Sheet. Returns rows as JSON.",
    {
      tab: z
        .enum([
          "meta",
          "rules",
          "dataModel",
          "features",
          "design",
          "screens",
          "errors",
          "all",
        ])
        .describe("The tab to read from, or 'all' for all tabs"),
    },
    async ({ tab }) => {
      if (tab === "all") {
        const allData = await store.getAllData();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(allData, null, 2),
            },
          ],
        };
      }
      const data = await store.getTabData(tab as TabName);
      const tabConfig = TAB_CONFIGS.find((t) => t.key === tab);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                tab,
                label: tabConfig?.label,
                rowCount: data.length,
                columns: tabConfig?.columns.map((c) => c.key),
                rows: data,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "add_row",
    "Add a new row to a specific tab. Provide column key-value pairs. The 'id' is auto-generated.",
    {
      tab: TabNameEnum.describe("The tab to add the row to"),
      data: z
        .record(z.string(), z.string())
        .describe(
          "Row data as key-value pairs matching the tab's column schema",
        ),
    },
    async ({ tab, data }) => {
      const tabConfig = TAB_CONFIGS.find((t) => t.key === tab);
      if (!tabConfig) {
        return {
          content: [
            { type: "text" as const, text: `Unknown tab: ${tab}` },
          ],
          isError: true,
        };
      }
      const newRow = await store.addRow(tab, data);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                message: `Row added to ${tabConfig.label}`,
                row: newRow,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "update_row",
    'Update an existing row. Provide an identifier (e.g. {"Rule_ID": "POL-001"}) to find the row, and updates object.',
    {
      tab: TabNameEnum.describe("The tab containing the row"),
      identifier: z
        .record(z.string(), z.string())
        .describe(
          'Key-value pairs to identify the row (e.g. {"Rule_ID": "POL-001"})',
        ),
      updates: z
        .record(z.string(), z.string())
        .describe("Key-value pairs of fields to update"),
    },
    async ({ tab, identifier, updates }) => {
      const tabConfig = TAB_CONFIGS.find((t) => t.key === tab);
      if (!tabConfig) {
        return {
          content: [
            { type: "text" as const, text: `Unknown tab: ${tab}` },
          ],
          isError: true,
        };
      }
      const row = await store.findRow(tab, identifier);
      if (!row) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Row not found with identifier: ${JSON.stringify(identifier)}`,
            },
          ],
          isError: true,
        };
      }
      await store.updateRow(tab, row.id, updates);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                message: `Row updated in ${tabConfig.label}`,
                rowId: row.id,
                updatedFields: Object.keys(updates),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "delete_row",
    'Delete a row from a tab. Provide an identifier (e.g. {"Error_ID": "ERR-001"}) to find and remove it.',
    {
      tab: TabNameEnum.describe("The tab to delete from"),
      identifier: z
        .record(z.string(), z.string())
        .describe("Key-value pairs to identify the row to delete"),
    },
    async ({ tab, identifier }) => {
      const tabConfig = TAB_CONFIGS.find((t) => t.key === tab);
      if (!tabConfig) {
        return {
          content: [
            { type: "text" as const, text: `Unknown tab: ${tab}` },
          ],
          isError: true,
        };
      }
      const row = await store.findRow(tab, identifier);
      if (!row) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Row not found with identifier: ${JSON.stringify(identifier)}`,
            },
          ],
          isError: true,
        };
      }
      await store.deleteRow(tab, row.id);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                message: `Row deleted from ${tabConfig.label}`,
                deletedRowId: row.id,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
