import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { eq, and } from "drizzle-orm";
import { db } from "../db/connection.js";
import { users } from "../db/schema.js";
import { config } from "../config.js";

interface OAuthProfile {
  provider: string;
  id: string;
  displayName: string;
  emails?: { value: string }[];
  photos?: { value: string }[];
}

async function findOrCreateUser(profile: OAuthProfile) {
  const provider = profile.provider;
  const providerId = profile.id;
  const email = profile.emails?.[0]?.value || `${providerId}@${provider}.local`;
  const name = profile.displayName || email.split("@")[0];
  const avatarUrl = profile.photos?.[0]?.value || null;

  const existing = await db
    .select()
    .from(users)
    .where(and(eq(users.provider, provider), eq(users.providerId, providerId)))
    .limit(1);

  if (existing.length > 0) {
    // 기존 유저 정보 업데이트
    await db
      .update(users)
      .set({ name, avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, existing[0].id));
    return existing[0];
  }

  const [newUser] = await db
    .insert(users)
    .values({ email, name, avatarUrl, provider, providerId })
    .returning();

  return newUser;
}

export function setupPassport(): void {
  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as { id: string }).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user || null);
    } catch (err) {
      done(err, null);
    }
  });

  // Google OAuth
  if (config.google.clientId) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientId,
          clientSecret: config.google.clientSecret,
          callbackURL: config.google.callbackUrl,
          scope: ["profile", "email"],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const user = await findOrCreateUser(profile as OAuthProfile);
            done(null, user);
          } catch (err) {
            done(err as Error, undefined);
          }
        },
      ),
    );
  }

  // GitHub OAuth
  if (config.github.clientId) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: config.github.clientId,
          clientSecret: config.github.clientSecret,
          callbackURL: config.github.callbackUrl,
          scope: ["user:email"],
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: OAuthProfile,
          done: (err: Error | null, user?: Express.User) => void,
        ) => {
          try {
            const user = await findOrCreateUser(profile);
            done(null, user);
          } catch (err) {
            done(err as Error, undefined);
          }
        },
      ),
    );
  }
}
