import type { Express, Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { eq, and } from "drizzle-orm";
import { db } from "../db/connection.js";
import { mcpTokens, sheets } from "../db/schema.js";
import { createMcpServer } from "./server.js";
import type { broadcastChange as BroadcastFn } from "../ws/index.js";
import type { WsEvent } from "../../../src/types/ws.js";

interface McpSession {
  mcpServer: McpServer;
  transport: SSEServerTransport;
}

const sseSessions = new Map<string, McpSession>();

async function authenticateMcpToken(
  req: Request,
): Promise<{ userId: string; sheetId: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  const tokenRecord = await db
    .select({
      userId: mcpTokens.userId,
      projectId: mcpTokens.projectId,
    })
    .from(mcpTokens)
    .where(eq(mcpTokens.token, token))
    .limit(1);

  if (tokenRecord.length === 0) return null;

  // lastUsedAt 업데이트
  await db
    .update(mcpTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(mcpTokens.token, token));

  // project의 첫 번째 sheet 조회
  const sheetRecord = await db
    .select({ id: sheets.id })
    .from(sheets)
    .where(eq(sheets.projectId, tokenRecord[0].projectId))
    .limit(1);

  if (sheetRecord.length === 0) return null;

  return {
    userId: tokenRecord[0].userId,
    sheetId: sheetRecord[0].id,
  };
}

export function setupMcpTransport(
  app: Express,
  broadcast: typeof BroadcastFn,
): void {
  // ─── Streamable HTTP (새 프로토콜 2025-11-25) ─────────────────────────────

  app.post("/mcp", async (req: Request, res: Response) => {
    const auth = await authenticateMcpToken(req);
    if (!auth) {
      res.status(401).json({ error: "Invalid MCP token" });
      return;
    }

    const { mcpServer, store } = createMcpServer(auth.sheetId, auth.userId);

    store.on("change", (event: WsEvent) => broadcast(event));

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res);
  });

  // ─── SSE (레거시 프로토콜 2024-11-05) ──────────────────────────────────────

  app.get("/sse", async (req: Request, res: Response) => {
    const auth = await authenticateMcpToken(req);
    if (!auth) {
      res.status(401).json({ error: "Invalid MCP token" });
      return;
    }

    const { mcpServer, store } = createMcpServer(auth.sheetId, auth.userId);

    store.on("change", (event: WsEvent) => broadcast(event));

    const transport = new SSEServerTransport("/messages", res);
    sseSessions.set(transport.sessionId, {
      mcpServer,
      transport,
    });

    res.on("close", () => {
      sseSessions.delete(transport.sessionId);
    });

    await mcpServer.connect(transport);
  });

  app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const session = sseSessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await session.transport.handlePostMessage(req, res);
  });
}
