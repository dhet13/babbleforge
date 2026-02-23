import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { projects, sheets } from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";

export const projectsRouter = Router();

// GET /api/v1/projects — 내 프로젝트 목록
projectsRouter.get("/projects", requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .orderBy(projects.updatedAt);

  res.json(result);
});

// POST /api/v1/projects — 프로젝트 생성 (시트도 자동 생성)
projectsRouter.post("/projects", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const { name, description } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [project] = await db
    .insert(projects)
    .values({ name, description: description || null, ownerId: userId })
    .returning();

  // 시트 자동 생성
  const [sheet] = await db
    .insert(sheets)
    .values({ projectId: project.id, version: 1 })
    .returning();

  res.status(201).json({ ...project, defaultSheetId: sheet.id });
});

// GET /api/v1/projects/:pid — 프로젝트 상세
projectsRouter.get("/projects/:pid", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const pid = req.params.pid as string;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, pid))
    .limit(1);

  if (!project || project.ownerId !== userId) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const projectSheets = await db
    .select()
    .from(sheets)
    .where(eq(sheets.projectId, pid));

  res.json({ ...project, sheets: projectSheets });
});

// DELETE /api/v1/projects/:pid — 프로젝트 삭제
projectsRouter.delete("/projects/:pid", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const pid = req.params.pid as string;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, pid))
    .limit(1);

  if (!project || project.ownerId !== userId) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db.delete(projects).where(eq(projects.id, pid));
  res.json({ success: true });
});

// GET /api/v1/projects/:pid/sheets — 프로젝트의 시트 목록
projectsRouter.get("/projects/:pid/sheets", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const pid = req.params.pid as string;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, pid))
    .limit(1);

  if (!project || project.ownerId !== userId) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const result = await db
    .select()
    .from(sheets)
    .where(eq(sheets.projectId, pid));

  res.json(result);
});
