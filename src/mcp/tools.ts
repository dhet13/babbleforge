import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DataStore } from "./dataStore.js";
import { TAB_CONFIGS } from "../data/tabConfigs.js";
import type { TabName } from "../types/sheets.js";

const FIGMA_API_BASE = "https://api.figma.com/v1";

async function figmaFetch(path: string, token: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(`${FIGMA_API_BASE}${path}`, {
    ...options,
    headers: { "X-Figma-Token": token, "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API ${res.status}: ${text}`);
  }
  return res.json();
}

function resolveVariableValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && value !== null && "r" in value) {
    const c = value as { r: number; g: number; b: number; a: number };
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
    return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}${c.a < 1 ? toHex(c.a) : ""}`;
  }
  return JSON.stringify(value);
}

const TabNameEnum = z.enum([
  "meta", "rules", "dataModel", "features", "design", "screens", "errors",
]);

export function registerTools(server: McpServer, store: DataStore): void {
  server.tool(
    "get_sheet_data",
    "Get current data from a specific tab or all tabs in the Sindri Sheet. Returns rows as JSON.",
    {
      tab: z.enum([
        "meta", "rules", "dataModel", "features", "design", "screens", "errors", "all",
      ]).describe("The tab to read from, or 'all' for all tabs"),
    },
    async ({ tab }) => {
      if (tab === "all") {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(store.getAllData(), null, 2) }],
        };
      }
      const data = store.getTabData(tab as TabName);
      const tabConfig = TAB_CONFIGS.find((t) => t.key === tab);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            tab,
            label: tabConfig?.label,
            rowCount: data.length,
            columns: tabConfig?.columns.map((c) => c.key),
            rows: data,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "add_row",
    "Add a new row to a specific tab. Provide column key-value pairs. The 'id' is auto-generated.",
    {
      tab: TabNameEnum.describe("The tab to add the row to"),
      data: z.record(z.string(), z.string()).describe("Row data as key-value pairs matching the tab's column schema"),
    },
    async ({ tab, data }) => {
      const tabConfig = TAB_CONFIGS.find((t) => t.key === tab);
      if (!tabConfig) {
        return { content: [{ type: "text" as const, text: `Unknown tab: ${tab}` }], isError: true };
      }
      const newRow = store.addRow(tab, data);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ success: true, message: `Row added to ${tabConfig.label}`, row: newRow }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "update_row",
    'Update an existing row. Provide an identifier (e.g. {"Rule_ID": "POL-001"}) to find the row, and updates object.',
    {
      tab: TabNameEnum.describe("The tab containing the row"),
      identifier: z.record(z.string(), z.string()).describe('Key-value pairs to identify the row (e.g. {"Rule_ID": "POL-001"})'),
      updates: z.record(z.string(), z.string()).describe("Key-value pairs of fields to update"),
    },
    async ({ tab, identifier, updates }) => {
      const tabConfig = TAB_CONFIGS.find((t) => t.key === tab);
      if (!tabConfig) {
        return { content: [{ type: "text" as const, text: `Unknown tab: ${tab}` }], isError: true };
      }
      const row = store.findRow(tab, identifier);
      if (!row) {
        return {
          content: [{ type: "text" as const, text: `Row not found with identifier: ${JSON.stringify(identifier)}` }],
          isError: true,
        };
      }
      store.updateRow(tab, row.id, updates);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ success: true, message: `Row updated in ${tabConfig.label}`, rowId: row.id, updatedFields: Object.keys(updates) }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "delete_row",
    'Delete a row from a tab. Provide an identifier (e.g. {"Error_ID": "ERR-001"}) to find and remove it.',
    {
      tab: TabNameEnum.describe("The tab to delete from"),
      identifier: z.record(z.string(), z.string()).describe("Key-value pairs to identify the row to delete"),
    },
    async ({ tab, identifier }) => {
      const tabConfig = TAB_CONFIGS.find((t) => t.key === tab);
      if (!tabConfig) {
        return { content: [{ type: "text" as const, text: `Unknown tab: ${tab}` }], isError: true };
      }
      const row = store.findRow(tab, identifier);
      if (!row) {
        return {
          content: [{ type: "text" as const, text: `Row not found with identifier: ${JSON.stringify(identifier)}` }],
          isError: true,
        };
      }
      store.deleteRow(tab, row.id);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ success: true, message: `Row deleted from ${tabConfig.label}`, deletedRowId: row.id }, null, 2),
        }],
      };
    }
  );

  // ─── Figma Tools ────────────────────────────────────────────────────────

  const figmaToken = process.env.FIGMA_ACCESS_TOKEN;

  server.tool(
    "get_figma_file",
    "Get Figma file structure and metadata. Extract the file key from the URL (figma.com/design/<FILE_KEY>/...).",
    { file_key: z.string().describe("Figma file key from URL") },
    async ({ file_key }) => {
      if (!figmaToken) return { content: [{ type: "text" as const, text: "FIGMA_ACCESS_TOKEN 환경변수가 설정되지 않았습니다." }], isError: true };
      const file = await figmaFetch(`/files/${file_key}?depth=2`, figmaToken) as { name: string; lastModified: string; version: string; document: { children?: Array<{ id: string; name: string; type: string }> } };
      return { content: [{ type: "text" as const, text: JSON.stringify({ name: file.name, lastModified: file.lastModified, version: file.version, pages: file.document.children?.map((p) => ({ id: p.id, name: p.name, type: p.type })) }, null, 2) }] };
    }
  );

  server.tool(
    "get_figma_components",
    "Get all components from a Figma file",
    { file_key: z.string().describe("Figma file key") },
    async ({ file_key }) => {
      if (!figmaToken) return { content: [{ type: "text" as const, text: "FIGMA_ACCESS_TOKEN 환경변수가 설정되지 않았습니다." }], isError: true };
      const res = await figmaFetch(`/files/${file_key}/components`, figmaToken) as { meta: { components: unknown[] } };
      return { content: [{ type: "text" as const, text: JSON.stringify(res.meta.components, null, 2) }] };
    }
  );

  server.tool(
    "get_figma_styles",
    "Get all styles (colors, text, effects) from a Figma file",
    { file_key: z.string().describe("Figma file key") },
    async ({ file_key }) => {
      if (!figmaToken) return { content: [{ type: "text" as const, text: "FIGMA_ACCESS_TOKEN 환경변수가 설정되지 않았습니다." }], isError: true };
      const res = await figmaFetch(`/files/${file_key}/styles`, figmaToken) as { meta: { styles: unknown[] } };
      return { content: [{ type: "text" as const, text: JSON.stringify(res.meta.styles, null, 2) }] };
    }
  );

  server.tool(
    "get_figma_variables",
    "Get design variables (tokens) from a Figma file — colors, spacing, typography values",
    { file_key: z.string().describe("Figma file key") },
    async ({ file_key }) => {
      if (!figmaToken) return { content: [{ type: "text" as const, text: "FIGMA_ACCESS_TOKEN 환경변수가 설정되지 않았습니다." }], isError: true };
      const res = await figmaFetch(`/files/${file_key}/variables/local`, figmaToken) as {
        meta: {
          variables: Record<string, { id: string; name: string; resolvedType: string; valuesByMode: Record<string, unknown>; description: string }>;
          variableCollections: Record<string, { id: string; name: string; variableIds: string[] }>;
        };
      };
      const collections = Object.values(res.meta.variableCollections);
      const variables = Object.values(res.meta.variables).map((v) => ({
        id: v.id, name: v.name, type: v.resolvedType,
        value: resolveVariableValue(Object.values(v.valuesByMode)[0]),
        description: v.description,
      }));
      return { content: [{ type: "text" as const, text: JSON.stringify({ collections: collections.map((c) => ({ id: c.id, name: c.name, variableCount: c.variableIds.length })), variables }, null, 2) }] };
    }
  );

  server.tool(
    "sync_figma_tokens_to_sheet",
    "Import Figma design variables into the Design System tab as design tokens",
    { file_key: z.string().describe("Figma file key") },
    async ({ file_key }) => {
      if (!figmaToken) return { content: [{ type: "text" as const, text: "FIGMA_ACCESS_TOKEN 환경변수가 설정되지 않았습니다." }], isError: true };
      const res = await figmaFetch(`/files/${file_key}/variables/local`, figmaToken) as {
        meta: {
          variables: Record<string, { id: string; name: string; resolvedType: string; valuesByMode: Record<string, unknown>; description: string }>;
          variableCollections: Record<string, { id: string; name: string; variableIds: string[] }>;
        };
      };
      const collections = Object.values(res.meta.variableCollections);
      const collectionMap = Object.fromEntries(collections.map((c) => [c.id, c.name]));
      const variables = Object.values(res.meta.variables);
      let added = 0;
      for (const v of variables) {
        const collectionId = collections.find((c) => c.variableIds.includes(v.id))?.id;
        const category = collectionId ? collectionMap[collectionId] : "Uncategorized";
        store.addRow("design", {
          Category: category,
          Token_Name: v.name,
          Value: resolveVariableValue(Object.values(v.valuesByMode)[0]),
          Description: v.description || `Imported from Figma (${v.resolvedType})`,
        });
        added++;
      }
      return { content: [{ type: "text" as const, text: `Figma에서 ${added}개의 디자인 토큰을 Design System 탭에 가져왔습니다.` }] };
    }
  );

  server.tool(
    "post_figma_comment",
    "Add a comment to a Figma file, optionally on a specific node/frame",
    {
      file_key: z.string().describe("Figma file key"),
      message: z.string().describe("Comment text"),
      node_id: z.string().optional().describe("Optional: attach comment to a specific node"),
    },
    async ({ file_key, message, node_id }) => {
      if (!figmaToken) return { content: [{ type: "text" as const, text: "FIGMA_ACCESS_TOKEN 환경변수가 설정되지 않았습니다." }], isError: true };
      const body: Record<string, unknown> = { message };
      if (node_id) body.client_meta = { node_id };
      await figmaFetch(`/files/${file_key}/comments`, figmaToken, { method: "POST", body: JSON.stringify(body) });
      return { content: [{ type: "text" as const, text: `Figma에 댓글을 추가했습니다: "${message}"` }] };
    }
  );
}
