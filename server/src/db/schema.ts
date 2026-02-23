import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  avatarUrl: text("avatar_url"),
  provider: varchar("provider", { length: 20 }).notNull(), // 'google' | 'github'
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("users_provider_provider_id_idx").on(t.provider, t.providerId),
]);

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  mcpTokens: many(mcpTokens),
}));

// ─── Projects ────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  sheets: many(sheets),
  mcpTokens: many(mcpTokens),
}));

// ─── Sheets ──────────────────────────────────────────────────────────────────

export const sheets = pgTable("sheets", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sheetsRelations = relations(sheets, ({ one, many }) => ({
  project: one(projects, {
    fields: [sheets.projectId],
    references: [projects.id],
  }),
  rows: many(rows),
}));

// ─── Rows ────────────────────────────────────────────────────────────────────

export const rows = pgTable("rows", {
  id: varchar("id", { length: 50 }).primaryKey(), // 'row-XXXX' 패턴 유지
  sheetId: uuid("sheet_id")
    .notNull()
    .references(() => sheets.id, { onDelete: "cascade" }),
  tab: varchar("tab", { length: 20 }).notNull(), // TabName
  data: jsonb("data").notNull().$type<Record<string, string>>(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("rows_sheet_tab_idx").on(t.sheetId, t.tab),
  index("rows_sort_order_idx").on(t.sheetId, t.tab, t.sortOrder),
]);

export const rowsRelations = relations(rows, ({ one }) => ({
  sheet: one(sheets, { fields: [rows.sheetId], references: [sheets.id] }),
}));

// ─── Designs ─────────────────────────────────────────────────────────────────

export const designs = pgTable("designs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sheetId: uuid("sheet_id")
    .notNull()
    .references(() => sheets.id, { onDelete: "cascade" }),
  screenId: varchar("screen_id", { length: 50 }),
  name: varchar("name", { length: 200 }).notNull(),
  version: integer("version").default(1).notNull(),
  data: jsonb("data").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("designs_sheet_id_idx").on(t.sheetId),
]);

export const designsRelations = relations(designs, ({ one }) => ({
  sheet: one(sheets, { fields: [designs.sheetId], references: [sheets.id] }),
  creator: one(users, { fields: [designs.createdBy], references: [users.id] }),
}));

// ─── MCP Tokens ──────────────────────────────────────────────────────────────

export const mcpTokens = pgTable("mcp_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("mcp_tokens_token_idx").on(t.token),
]);

export const mcpTokensRelations = relations(mcpTokens, ({ one }) => ({
  user: one(users, { fields: [mcpTokens.userId], references: [users.id] }),
  project: one(projects, {
    fields: [mcpTokens.projectId],
    references: [projects.id],
  }),
}));
