import { Router } from "express";
import passport from "passport";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/connection.js";
import { users } from "../db/schema.js";

export const authRouter = Router();

// ─── Dev Login (개발 환경 전용) ──────────────────────────────────────────────

if (config.nodeEnv === "development") {
  authRouter.get("/dev-login", async (req, res) => {
    // 데모 유저 찾기 또는 생성
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, "dev@sindri.local"))
      .limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          email: "dev@sindri.local",
          name: "Dev User",
          avatarUrl: null,
          provider: "dev",
          providerId: "dev-001",
        })
        .returning();
    }

    req.login(user, (err) => {
      if (err) {
        res.status(500).json({ error: "Login failed" });
        return;
      }
      res.redirect(`${config.clientUrl}/dashboard`);
    });
  });
}

// ─── Google OAuth ────────────────────────────────────────────────────────────

authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${config.clientUrl}/login?error=google` }),
  (_req, res) => {
    res.redirect(`${config.clientUrl}/dashboard`);
  },
);

// ─── GitHub OAuth ────────────────────────────────────────────────────────────

authRouter.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] }),
);

authRouter.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: `${config.clientUrl}/login?error=github` }),
  (_req, res) => {
    res.redirect(`${config.clientUrl}/dashboard`);
  },
);

// ─── Auth Info ───────────────────────────────────────────────────────────────

authRouter.get("/me", (req, res) => {
  if (!req.isAuthenticated?.() || !req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = req.user;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
  });
});

authRouter.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
});
