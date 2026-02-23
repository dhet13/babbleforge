import express from "express";
import cors from "cors";
import passport from "passport";
import { createServer } from "node:http";
import { config } from "./config.js";
import { sessionMiddleware } from "./auth/session.js";
import { setupPassport } from "./auth/passport.js";
import { authRouter } from "./auth/routes.js";
import { projectsRouter } from "./api/projects.js";
import { createSheetsRouter } from "./api/sheets.js";
import { createDesignsRouter } from "./api/designs.js";
import { tokensRouter } from "./api/tokens.js";
import { setupMcpTransport } from "./mcp/transport.js";
import { setupWebSocket, broadcastChange } from "./ws/index.js";

const app = express();
const httpServer = createServer(app);

// ─── 미들웨어 ────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json());

// ─── 세션 + Passport ─────────────────────────────────────────────────────────

app.use(sessionMiddleware);
setupPassport();
app.use(passport.initialize());
app.use(passport.session());

// ─── Auth 라우트 ─────────────────────────────────────────────────────────────

app.use("/auth", authRouter);

// ─── API 라우트 ──────────────────────────────────────────────────────────────

const sheetsRouter = createSheetsRouter(broadcastChange);
const designsRouter = createDesignsRouter();
app.use("/api/v1", projectsRouter);
app.use("/api/v1", sheetsRouter);
app.use("/api/v1", designsRouter);
app.use("/api/v1", tokensRouter);

// ─── MCP 트랜스포트 ──────────────────────────────────────────────────────────

setupMcpTransport(app, broadcastChange);

// ─── 헬스체크 ────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── WebSocket ───────────────────────────────────────────────────────────────

setupWebSocket(httpServer);

// ─── 서버 시작 ───────────────────────────────────────────────────────────────

httpServer.listen(config.port, () => {
  console.log(`[Sindri Server] Running on http://localhost:${config.port}`);
  console.log(`[Sindri Server] MCP endpoint: POST http://localhost:${config.port}/mcp`);
  console.log(`[Sindri Server] WebSocket: ws://localhost:${config.port}/ws`);
});
