import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import type { IncomingMessage } from "node:http";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { mcpTokens } from "../db/schema.js";
import { sessionMiddleware } from "../auth/session.js";
import type { WsEvent } from "./events.js";

interface AuthenticatedWs extends WebSocket {
  userId: string;
  sheetId: string;
  isAlive: boolean;
}

// sheetId → Set<WebSocket>
const clients = new Map<string, Set<AuthenticatedWs>>();

async function authenticateWs(
  req: IncomingMessage,
): Promise<{ userId: string } | null> {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  // 1. Bearer 토큰 인증
  if (token) {
    const [record] = await db
      .select({ userId: mcpTokens.userId })
      .from(mcpTokens)
      .where(eq(mcpTokens.token, token))
      .limit(1);

    if (record) return { userId: record.userId };
  }

  // 2. 세션 쿠키 인증 (Express 세션 미들웨어를 통해)
  return new Promise((resolve) => {
    // express-session 미들웨어를 WS upgrade에서 수동 실행
    const fakeRes = {
      getHeader: () => undefined,
      setHeader: () => fakeRes,
      end: () => undefined,
      writeHead: () => fakeRes,
    } as unknown as import("express").Response;

    sessionMiddleware(
      req as unknown as import("express").Request,
      fakeRes,
      () => {
        const session = (req as unknown as { session?: { passport?: { user?: string } } }).session;
        if (session?.passport?.user) {
          resolve({ userId: session.passport.user });
        } else {
          resolve(null);
        }
      },
    );
  });
}

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const authWs = ws as AuthenticatedWs;
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const sheetId = url.searchParams.get("sheetId");

    const auth = await authenticateWs(req);

    if (!auth || !sheetId) {
      ws.close(4001, "Unauthorized");
      return;
    }

    authWs.userId = auth.userId;
    authWs.sheetId = sheetId;
    authWs.isAlive = true;

    // 클라이언트 등록
    if (!clients.has(sheetId)) {
      clients.set(sheetId, new Set());
    }
    clients.get(sheetId)!.add(authWs);

    // connected 이벤트 전송
    ws.send(
      JSON.stringify({
        type: "connected",
        sheetId,
        timestamp: Date.now(),
      }),
    );

    ws.on("pong", () => {
      authWs.isAlive = true;
    });

    ws.on("close", () => {
      clients.get(sheetId)?.delete(authWs);
      if (clients.get(sheetId)?.size === 0) {
        clients.delete(sheetId);
      }
    });
  });

  // Heartbeat: 30초 간격
  setInterval(() => {
    wss.clients.forEach((ws) => {
      const authWs = ws as AuthenticatedWs;
      if (!authWs.isAlive) {
        authWs.terminate();
        return;
      }
      authWs.isAlive = false;
      authWs.ping();
    });
  }, 30_000);
}

export function broadcastChange(event: WsEvent): void {
  const sheetClients = clients.get(event.sheetId);
  if (!sheetClients) return;

  const payload = JSON.stringify(event);
  for (const ws of sheetClients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}
