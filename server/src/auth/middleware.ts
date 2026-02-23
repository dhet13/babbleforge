import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { mcpTokens, users } from "../db/schema.js";

// Express.User 확장
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      avatarUrl: string | null;
      provider: string;
      providerId: string;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // 1. 세션 인증 (웹 앱)
  if (req.isAuthenticated?.() && req.user) {
    next();
    return;
  }

  // 2. Bearer 토큰 인증 (MCP / 크롬 확장앱)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    const tokenRecord = await db
      .select({
        tokenId: mcpTokens.id,
        userId: mcpTokens.userId,
        projectId: mcpTokens.projectId,
      })
      .from(mcpTokens)
      .where(eq(mcpTokens.token, token))
      .limit(1);

    if (tokenRecord.length > 0) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, tokenRecord[0].userId))
        .limit(1);

      if (user) {
        // lastUsedAt 업데이트
        await db
          .update(mcpTokens)
          .set({ lastUsedAt: new Date() })
          .where(eq(mcpTokens.id, tokenRecord[0].tokenId));

        req.user = user;
        // projectId를 req에 부착 (토큰 인증 시에만)
        (req as Request & { tokenProjectId?: string }).tokenProjectId =
          tokenRecord[0].projectId;
        next();
        return;
      }
    }
  }

  res.status(401).json({ error: "Unauthorized" });
}
