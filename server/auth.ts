import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { users, type User, type SafeUser } from "@shared/models/auth";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface User extends SafeUser {}
  }
}

function sanitizeUser(user: User): SafeUser {
  const { password, ...safeUser } = user;
  return safeUser;
}

export function getSession() {
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (!sessionSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET environment variable is required in production. " +
        "Generate a secure random string (at least 32 characters) and set it as SESSION_SECRET."
      );
    }
    console.warn(
      "WARNING: SESSION_SECRET is not set. Using a temporary secret for development. " +
      "Set SESSION_SECRET environment variable for production use."
    );
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: sessionSecret || "dev-only-insecure-secret-do-not-use-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()));

          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.isActive) {
            return done(null, false, { message: "Account is disabled" });
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, sanitizeUser(user));
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (user) {
        done(null, sanitizeUser(user));
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName?: string
): Promise<SafeUser> {
  const hashedPassword = await bcrypt.hash(password, 12);
  
  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName: lastName || null,
    })
    .returning();

  return sanitizeUser(user);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  return user;
}

export async function getUser(id: string): Promise<SafeUser | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ? sanitizeUser(user) : undefined;
}
