import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3100", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  sessionSecret: process.env.SESSION_SECRET || "dev-secret",

  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://sindri:sindri@localhost:5432/sindri_sheet",

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:3100/auth/google/callback",
  },

  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    callbackUrl:
      process.env.GITHUB_CALLBACK_URL ||
      "http://localhost:3100/auth/github/callback",
  },

  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:5173,https://www.figma.com").split(","),
} as const;
