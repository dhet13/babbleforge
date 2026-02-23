import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
import {
  initialMeta,
  initialRules,
  initialDataModel,
  initialFeatures,
  initialDesign,
  initialScreens,
  initialErrors,
} from "../../../src/data/initialData.js";
import type { TabName, SheetRow } from "../../../src/types/sheets.js";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://sindri:sindri@localhost:5432/sindri_sheet",
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log("[Seed] Starting...");

  // 1. 데모 사용자 생성
  const [demoUser] = await db
    .insert(schema.users)
    .values({
      email: "demo@sindri.dev",
      name: "Demo User",
      provider: "google",
      providerId: "demo-000",
    })
    .onConflictDoNothing()
    .returning();

  if (!demoUser) {
    console.log("[Seed] Demo user already exists, skipping...");
    await pool.end();
    return;
  }

  console.log(`[Seed] Created user: ${demoUser.email} (${demoUser.id})`);

  // 2. 데모 프로젝트 생성
  const [project] = await db
    .insert(schema.projects)
    .values({
      name: "Blueprint AI",
      description: "비개발자도 채팅만으로 MVP 모델을 설계할 수 있는 AI 기반 개발 플랫폼",
      ownerId: demoUser.id,
    })
    .returning();

  console.log(`[Seed] Created project: ${project.name} (${project.id})`);

  // 3. 시트 생성
  const [sheet] = await db
    .insert(schema.sheets)
    .values({
      projectId: project.id,
      version: 1,
    })
    .returning();

  console.log(`[Seed] Created sheet: ${sheet.id}`);

  // 4. 행 데이터 삽입
  const tabData: Record<TabName, SheetRow[]> = {
    meta: initialMeta,
    rules: initialRules,
    dataModel: initialDataModel,
    features: initialFeatures,
    design: initialDesign,
    screens: initialScreens,
    errors: initialErrors,
  };

  let totalRows = 0;

  for (const [tab, rows] of Object.entries(tabData)) {
    const rowValues = rows.map((row, idx) => {
      const { id, ...data } = row as unknown as Record<string, string>;
      return {
        id,
        sheetId: sheet.id,
        tab,
        data,
        sortOrder: idx,
      };
    });

    if (rowValues.length > 0) {
      await db.insert(schema.rows).values(rowValues);
      totalRows += rowValues.length;
      console.log(`[Seed]   ${tab}: ${rowValues.length} rows`);
    }
  }

  console.log(`[Seed] Total rows inserted: ${totalRows}`);

  // 5. 데모 MCP 토큰 생성
  const [token] = await db
    .insert(schema.mcpTokens)
    .values({
      userId: demoUser.id,
      projectId: project.id,
      token: "sindri_demo_token_for_development",
      name: "Development Token",
    })
    .returning();

  console.log(`[Seed] Created MCP token: ${token.token}`);
  console.log("[Seed] Done!");

  await pool.end();
}

seed().catch((err) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});
