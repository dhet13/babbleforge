import { Router } from "express";
import passport from "passport";
import { config } from "../config.js";

export const authRouter = Router();

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
