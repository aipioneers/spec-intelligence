import { betterAuth } from "better-auth";

// ---------------------------------------------------------------------------
// Role types
// ---------------------------------------------------------------------------

export type UserRole = "viewer" | "editor" | "admin";

// ---------------------------------------------------------------------------
// Better Auth instance
// ---------------------------------------------------------------------------

export const auth = betterAuth({
  /**
   * Email + password authentication provider.
   * In production you would typically configure a database adapter
   * (e.g. Prisma, Drizzle) here. For now we rely on Better Auth's
   * built-in in-memory store which is sufficient for development.
   */
  emailAndPassword: {
    enabled: true,
  },

  /**
   * Session configuration.
   */
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // refresh once per day
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Permission matrix: which HTTP methods each role is allowed to use.
 */
const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  viewer: new Set(["GET", "HEAD", "OPTIONS"]),
  editor: new Set(["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH"]),
  admin: new Set(["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]),
};

/**
 * Check whether a role is permitted to execute the given HTTP method.
 */
export function isMethodAllowed(role: UserRole, method: string): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed ? allowed.has(method.toUpperCase()) : false;
}

/**
 * Default role assigned to new users.
 */
export const DEFAULT_ROLE: UserRole = "editor";

/**
 * Type-safe session user with role.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
