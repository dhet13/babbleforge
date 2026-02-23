import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { sheets, projects } from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";
import { PostgresDataStore } from "../mcp/dataStore.js";
import type { TabName } from "../../../src/types/sheets.js";
import type { WsEvent } from "../../../src/types/ws.js";
import type { broadcastChange as BroadcastFn } from "../ws/index.js";

const VALID_TABS: TabName[] = [
  "meta",
  "rules",
  "dataModel",
  "features",
  "design",
  "screens",
  "errors",
];

export function createSheetsRouter(broadcast: typeof BroadcastFn): Router {
  const router = Router();

  // 시트 접근 권한 확인 헬퍼
  async function verifySheetAccess(
    sheetId: string,
    userId: string,
  ): Promise<boolean> {
    const [sheet] = await db
      .select({
        id: sheets.id,
        projectId: sheets.projectId,
        ownerId: projects.ownerId,
      })
      .from(sheets)
      .innerJoin(projects, eq(sheets.projectId, projects.id))
      .where(eq(sheets.id, sheetId))
      .limit(1);

    return !!sheet && sheet.ownerId === userId;
  }

  // GET /api/v1/sheets/:sid — 전체 시트 데이터
  router.get("/sheets/:sid", requireAuth, async (req, res) => {
    const sid = req.params.sid as string;
    const userId = req.user!.id;

    if (!(await verifySheetAccess(sid, userId))) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }

    const store = new PostgresDataStore(sid, userId);
    const data = await store.getAllData();

    res.json({ sheetId: sid, data });
  });

  // GET /api/v1/sheets/:sid/tabs/:tab — 특정 탭 데이터
  router.get("/sheets/:sid/tabs/:tab", requireAuth, async (req, res) => {
    const sid = req.params.sid as string;
    const tab = req.params.tab as string;
    const userId = req.user!.id;

    if (!VALID_TABS.includes(tab as TabName)) {
      res.status(400).json({ error: `Invalid tab: ${tab}` });
      return;
    }

    if (!(await verifySheetAccess(sid, userId))) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }

    const store = new PostgresDataStore(sid, userId);
    const data = await store.getTabData(tab as TabName);

    res.json(data);
  });

  // POST /api/v1/sheets/:sid/tabs/:tab/rows — 행 추가
  router.post(
    "/sheets/:sid/tabs/:tab/rows",
    requireAuth,
    async (req, res) => {
      const sid = req.params.sid as string;
      const tab = req.params.tab as string;
      const { data } = req.body;
      const userId = req.user!.id;

      if (!VALID_TABS.includes(tab as TabName)) {
        res.status(400).json({ error: `Invalid tab: ${tab}` });
        return;
      }

      if (!data || typeof data !== "object") {
        res.status(400).json({ error: "data is required" });
        return;
      }

      if (!(await verifySheetAccess(sid, userId))) {
        res.status(404).json({ error: "Sheet not found" });
        return;
      }

      const store = new PostgresDataStore(sid, userId);
      store.on("change", (event: WsEvent) => broadcast(event));

      const newRow = await store.addRow(tab as TabName, data);
      res.status(201).json({ success: true, row: newRow });
    },
  );

  // PATCH /api/v1/sheets/:sid/tabs/:tab/rows/:rid — 행 수정
  router.patch(
    "/sheets/:sid/tabs/:tab/rows/:rid",
    requireAuth,
    async (req, res) => {
      const sid = req.params.sid as string;
      const tab = req.params.tab as string;
      const rid = req.params.rid as string;
      const { updates } = req.body;
      const userId = req.user!.id;

      if (!VALID_TABS.includes(tab as TabName)) {
        res.status(400).json({ error: `Invalid tab: ${tab}` });
        return;
      }

      if (!updates || typeof updates !== "object") {
        res.status(400).json({ error: "updates is required" });
        return;
      }

      if (!(await verifySheetAccess(sid, userId))) {
        res.status(404).json({ error: "Sheet not found" });
        return;
      }

      const store = new PostgresDataStore(sid, userId);
      store.on("change", (event: WsEvent) => broadcast(event));

      const success = await store.updateRow(tab as TabName, rid, updates);
      if (!success) {
        res.status(404).json({ error: "Row not found" });
        return;
      }

      res.json({ success: true });
    },
  );

  // DELETE /api/v1/sheets/:sid/tabs/:tab/rows/:rid — 행 삭제
  router.delete(
    "/sheets/:sid/tabs/:tab/rows/:rid",
    requireAuth,
    async (req, res) => {
      const sid = req.params.sid as string;
      const tab = req.params.tab as string;
      const rid = req.params.rid as string;
      const userId = req.user!.id;

      if (!VALID_TABS.includes(tab as TabName)) {
        res.status(400).json({ error: `Invalid tab: ${tab}` });
        return;
      }

      if (!(await verifySheetAccess(sid, userId))) {
        res.status(404).json({ error: "Sheet not found" });
        return;
      }

      const store = new PostgresDataStore(sid, userId);
      store.on("change", (event: WsEvent) => broadcast(event));

      const success = await store.deleteRow(tab as TabName, rid);
      if (!success) {
        res.status(404).json({ error: "Row not found" });
        return;
      }

      res.json({ success: true, deletedId: rid });
    },
  );

  return router;
}
