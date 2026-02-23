import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/connection.js";
import { designs, sheets, projects } from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";

export function createDesignsRouter(): Router {
  const router = Router();

  // 시트 접근 권한 확인 헬퍼
  async function verifySheetAccess(
    sheetId: string,
    userId: string,
  ): Promise<boolean> {
    const [sheet] = await db
      .select({
        id: sheets.id,
        ownerId: projects.ownerId,
      })
      .from(sheets)
      .innerJoin(projects, eq(sheets.projectId, projects.id))
      .where(eq(sheets.id, sheetId))
      .limit(1);

    return !!sheet && sheet.ownerId === userId;
  }

  // GET /api/v1/sheets/:sid/designs — 시트의 디자인 목록
  router.get("/sheets/:sid/designs", requireAuth, async (req, res) => {
    const sid = req.params.sid as string;
    const userId = req.user!.id;

    if (!(await verifySheetAccess(sid, userId))) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }

    const list = await db
      .select({
        id: designs.id,
        sheetId: designs.sheetId,
        screenId: designs.screenId,
        name: designs.name,
        version: designs.version,
        createdAt: designs.createdAt,
        updatedAt: designs.updatedAt,
      })
      .from(designs)
      .where(eq(designs.sheetId, sid))
      .orderBy(desc(designs.updatedAt));

    res.json(list);
  });

  // GET /api/v1/sheets/:sid/designs/latest — 최신 디자인 (Figma 플러그인용)
  router.get("/sheets/:sid/designs/latest", requireAuth, async (req, res) => {
    const sid = req.params.sid as string;
    const userId = req.user!.id;

    if (!(await verifySheetAccess(sid, userId))) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }

    const [latest] = await db
      .select()
      .from(designs)
      .where(eq(designs.sheetId, sid))
      .orderBy(desc(designs.updatedAt))
      .limit(1);

    if (!latest) {
      res.status(404).json({ error: "No designs found" });
      return;
    }

    res.json(latest);
  });

  // GET /api/v1/sheets/:sid/designs/:did — 단일 디자인
  router.get("/sheets/:sid/designs/:did", requireAuth, async (req, res) => {
    const sid = req.params.sid as string;
    const did = req.params.did as string;
    const userId = req.user!.id;

    if (!(await verifySheetAccess(sid, userId))) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }

    const [design] = await db
      .select()
      .from(designs)
      .where(and(eq(designs.id, did), eq(designs.sheetId, sid)))
      .limit(1);

    if (!design) {
      res.status(404).json({ error: "Design not found" });
      return;
    }

    res.json(design);
  });

  // POST /api/v1/sheets/:sid/designs — 새 디자인 생성
  router.post("/sheets/:sid/designs", requireAuth, async (req, res) => {
    const sid = req.params.sid as string;
    const userId = req.user!.id;
    const { name, screenId, data } = req.body;

    if (!name || !data) {
      res.status(400).json({ error: "name and data are required" });
      return;
    }

    if (!(await verifySheetAccess(sid, userId))) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }

    const [created] = await db
      .insert(designs)
      .values({
        sheetId: sid,
        screenId: screenId || null,
        name,
        version: 1,
        data,
        createdBy: userId,
      })
      .returning();

    res.status(201).json(created);
  });

  // PUT /api/v1/sheets/:sid/designs/:did — 전체 업데이트
  router.put("/sheets/:sid/designs/:did", requireAuth, async (req, res) => {
    const sid = req.params.sid as string;
    const did = req.params.did as string;
    const userId = req.user!.id;
    const { name, screenId, data } = req.body;

    if (!data) {
      res.status(400).json({ error: "data is required" });
      return;
    }

    if (!(await verifySheetAccess(sid, userId))) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }

    const [existing] = await db
      .select({ id: designs.id, version: designs.version })
      .from(designs)
      .where(and(eq(designs.id, did), eq(designs.sheetId, sid)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Design not found" });
      return;
    }

    const [updated] = await db
      .update(designs)
      .set({
        name: name || undefined,
        screenId: screenId ?? undefined,
        data,
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(designs.id, did))
      .returning({
        id: designs.id,
        version: designs.version,
        updatedAt: designs.updatedAt,
      });

    res.json(updated);
  });

  // DELETE /api/v1/sheets/:sid/designs/:did — 삭제
  router.delete("/sheets/:sid/designs/:did", requireAuth, async (req, res) => {
    const sid = req.params.sid as string;
    const did = req.params.did as string;
    const userId = req.user!.id;

    if (!(await verifySheetAccess(sid, userId))) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }

    const [deleted] = await db
      .delete(designs)
      .where(and(eq(designs.id, did), eq(designs.sheetId, sid)))
      .returning({ id: designs.id });

    if (!deleted) {
      res.status(404).json({ error: "Design not found" });
      return;
    }

    res.json({ success: true, deletedId: deleted.id });
  });

  return router;
}
