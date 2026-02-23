import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/connection.js";
import { mcpTokens, projects, sheets } from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";

export const tokensRouter = Router();

// GET /api/v1/mcp-tokens — 내 토큰 목록
tokensRouter.get("/mcp-tokens", requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const result = await db
    .select({
      id: mcpTokens.id,
      name: mcpTokens.name,
      token: mcpTokens.token,
      projectId: mcpTokens.projectId,
      lastUsedAt: mcpTokens.lastUsedAt,
      createdAt: mcpTokens.createdAt,
    })
    .from(mcpTokens)
    .where(eq(mcpTokens.userId, userId))
    .orderBy(mcpTokens.createdAt);

  res.json(result);
});

// POST /api/v1/mcp-tokens — 토큰 생성
tokensRouter.post("/mcp-tokens", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const { name, projectId } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  if (!projectId || typeof projectId !== "string") {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  // 프로젝트 소유권 확인
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
    .limit(1);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const token = `sindri_${nanoid(32)}`;

  const [created] = await db
    .insert(mcpTokens)
    .values({ userId, projectId, token, name })
    .returning();

  res.status(201).json({
    id: created.id,
    name: created.name,
    token: created.token,
    projectId: created.projectId,
    createdAt: created.createdAt,
  });
});

// GET /api/v1/mcp-tokens/validate — 토큰 유효성 검증 (확장앱용)
tokensRouter.get("/mcp-tokens/validate", requireAuth, async (req, res) => {
  const projectId = (req as typeof req & { tokenProjectId?: string }).tokenProjectId;
  if (!projectId) {
    res.status(400).json({ error: "Token authentication required" });
    return;
  }

  const sheet = await db
    .select({ id: sheets.id })
    .from(sheets)
    .where(eq(sheets.projectId, projectId))
    .limit(1);

  if (sheet.length === 0) {
    res.status(404).json({ error: "No sheet found for this project" });
    return;
  }

  res.json({ valid: true, projectId, sheetId: sheet[0].id });
});

// DELETE /api/v1/mcp-tokens/:tid — 토큰 삭제
tokensRouter.delete("/mcp-tokens/:tid", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const tid = req.params.tid as string;

  const result = await db
    .delete(mcpTokens)
    .where(and(eq(mcpTokens.id, tid), eq(mcpTokens.userId, userId)))
    .returning({ id: mcpTokens.id });

  if (result.length === 0) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  res.json({ success: true });
});
