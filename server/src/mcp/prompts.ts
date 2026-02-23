import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PostgresDataStore } from "./dataStore.js";
import { TAB_CONFIGS } from "../../../src/data/tabConfigs.js";

export function registerPrompts(
  server: McpServer,
  store: PostgresDataStore,
): void {
  server.prompt(
    "add_feature",
    "Guide for adding a new feature to the features tab with proper schema and context",
    {
      feature_description: z
        .string()
        .describe("Brief description of the feature to add"),
    },
    async ({ feature_description }) => {
      const featuresTab = TAB_CONFIGS.find((t) => t.key === "features")!;
      const existingFeatures = await store.getTabData("features");
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `I want to add a new feature to the Sindri Sheet.\n\n` +
                `Feature description: ${feature_description}\n\n` +
                `The features tab has these columns: ${featuresTab.columns.map((c) => c.key).join(", ")}\n\n` +
                `Existing features (for context and to avoid duplicate IDs):\n` +
                `${JSON.stringify(existingFeatures, null, 2)}\n\n` +
                `Please use the add_row tool to add this feature with appropriate values for all columns. ` +
                `Generate the next Feat_ID in sequence.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "design_data_model",
    "Guide for designing a new data model entity with fields",
    {
      model_name: z
        .string()
        .describe(
          "Name of the data model entity (e.g., 'Order', 'Payment')",
        ),
      description: z
        .string()
        .optional()
        .describe("Brief description of what this model represents"),
    },
    async ({ model_name, description }) => {
      const dataModelTab = TAB_CONFIGS.find((t) => t.key === "dataModel")!;
      const existingModels = await store.getTabData("dataModel");
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `I want to design a new data model entity called "${model_name}".\n` +
                `${description ? `Description: ${description}\n` : ""}` +
                `\nThe dataModel tab has these columns: ${dataModelTab.columns.map((c) => c.key).join(", ")}\n\n` +
                `Existing data models (for reference and relationships):\n` +
                `${JSON.stringify(existingModels, null, 2)}\n\n` +
                `Please design appropriate fields for "${model_name}" and use add_row for each field. Consider:\n` +
                `- A primary key field (UUID)\n` +
                `- Relevant business fields\n` +
                `- Foreign key relationships to existing models\n` +
                `- Proper data types, nullability, indexing, and defaults`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "review_sheet",
    "Review all Sindri Sheet data for consistency, completeness, and potential issues",
    {
      focus_area: z
        .string()
        .optional()
        .describe(
          "Optional area to focus on (e.g., 'data model relationships', 'error coverage')",
        ),
    },
    async ({ focus_area }) => {
      const allData = await store.getAllData();
      const summary = Object.entries(allData)
        .map(([key, rows]) => {
          const tab = TAB_CONFIGS.find((t) => t.key === key);
          return `${tab?.emoji} ${tab?.label}: ${(rows as unknown[]).length} rows`;
        })
        .join("\n");

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `Please review the entire Sindri Sheet for consistency and completeness.\n\n` +
                `${focus_area ? `Focus area: ${focus_area}\n\n` : ""}` +
                `Summary:\n${summary}\n\n` +
                `Full data:\n${JSON.stringify(allData, null, 2)}\n\n` +
                `Please check for:\n` +
                `1. Referential integrity (Feat_IDs in screens/errors actually exist)\n` +
                `2. Missing or incomplete data\n` +
                `3. Consistency in naming conventions\n` +
                `4. Coverage gaps (features without error handling, screens without features)\n` +
                `5. Any other issues\n\n` +
                `Provide a structured report and suggest fixes using update_row or add_row tools.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "add_screen",
    "Guide for adding a new screen to the Screen Map with proper relationships",
    {
      screen_name: z.string().describe("Name of the screen to add"),
      parent_screen: z
        .string()
        .optional()
        .describe("Parent screen ID (e.g., 'SCR-002')"),
    },
    async ({ screen_name, parent_screen }) => {
      const screensTab = TAB_CONFIGS.find((t) => t.key === "screens")!;
      const existingScreens = await store.getTabData("screens");
      const existingFeatures = await store.getTabData("features");
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `I want to add a new screen called "${screen_name}" to the Screen Map.\n` +
                `${parent_screen ? `Parent screen: ${parent_screen}\n` : ""}` +
                `\nThe screens tab has these columns: ${screensTab.columns.map((c) => c.key).join(", ")}\n\n` +
                `Existing screens:\n${JSON.stringify(existingScreens, null, 2)}\n\n` +
                `Existing features (for Related_Feat_ID):\n${JSON.stringify(existingFeatures, null, 2)}\n\n` +
                `Please use add_row to add this screen with:\n` +
                `- Next Screen_ID in sequence\n` +
                `- Appropriate description\n` +
                `- Figma_Frame_Name derived from the screen name\n` +
                `- Relevant Related_Feat_ID if applicable\n` +
                `- Correct Parent_Screen and Access_Level\n` +
                `- Status set to "Planned"`,
            },
          },
        ],
      };
    },
  );
}
