import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Route configuration
// ---------------------------------------------------------------------------

/** Paths that require authentication. */
const PROTECTED_PREFIXES = ["/(dashboard)", "/api/"];

/** Auth-related paths that should always be accessible. */
const AUTH_ALLOW_LIST = ["/api/auth", "/auth/login", "/auth/register"];

/** Read-only HTTP methods that viewers are allowed to use. */
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Methods that editors (but not viewers) can use in addition to read. */
const WRITE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isProtectedPath(pathname: string): boolean {
  // Normalize the (dashboard) group — Next.js strips route groups from URLs
  // so /features is actually within /(dashboard)/features
  const dashboardPaths = [
    "/features",
    "/analysis",
    "/settings",
    "/dashboard",
  ];

  if (dashboardPaths.some((p) => pathname.startsWith(p))) {
    return true;
  }

  return PROTECTED_PREFIXES.some((prefix) => {
    // Handle route-group prefix like /(dashboard)
    if (prefix.startsWith("/(")) {
      return false; // Checked above via dashboardPaths
    }
    return pathname.startsWith(prefix);
  });
}

function isAuthPath(pathname: string): boolean {
  return AUTH_ALLOW_LIST.some((p) => pathname.startsWith(p));
}

type UserRole = "viewer" | "editor" | "admin";

function isMethodAllowedForRole(role: UserRole, method: string): boolean {
  const upper = method.toUpperCase();
  switch (role) {
    case "admin":
      return true;
    case "editor":
      return WRITE_METHODS.has(upper);
    case "viewer":
      return READ_METHODS.has(upper);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Development mode: skip auth when SKIP_AUTH=1 or NODE_ENV=development
  if (
    process.env.SKIP_AUTH === "1" ||
    process.env.NODE_ENV === "development"
  ) {
    return NextResponse.next();
  }

  // Allow auth-related routes through without checks
  if (isAuthPath(pathname)) {
    return NextResponse.next();
  }

  // Allow public pages (home, etc.)
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // ----- Authentication check -----

  // Better Auth stores session in a cookie named "better-auth.session_token"
  // (configurable). We check for its presence as a lightweight gate.
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ??
    request.cookies.get("__session")?.value;

  if (!sessionToken) {
    // API routes: return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            details: null,
          },
        },
        { status: 401 },
      );
    }

    // Page routes: redirect to login
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ----- Role-based permission check -----

  // The role is typically stored in the session or a separate cookie after
  // Better Auth validates the session server-side.  For middleware (which
  // runs at the edge), we read a lightweight role cookie set during login.
  const role = (request.cookies.get("user-role")?.value ?? "editor") as UserRole;

  if (!isMethodAllowedForRole(role, request.method)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: `Role '${role}' is not allowed to ${request.method} this resource`,
            details: null,
          },
        },
        { status: 403 },
      );
    }

    // For page routes, redirect to a generic "access denied" or dashboard
    return NextResponse.redirect(new URL("/features", request.url));
  }

  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Config — which paths to run middleware on
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
