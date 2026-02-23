import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db/connection.js";
import { config } from "../config.js";

const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "session",
    createTableIfMissing: true,
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    sameSite: "lax",
  },
});
