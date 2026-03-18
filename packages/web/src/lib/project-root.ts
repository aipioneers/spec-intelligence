import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { headers } from "next/headers";

/**
 * Get the project root from the X-Project-Root request header,
 * falling back to auto-detection by walking up from cwd().
 */
export function getProjectRoot(request?: Request): string {
  // 1. Try request header
  if (request) {
    const headerRoot = request.headers.get("x-project-root");
    if (headerRoot && existsSync(join(headerRoot, "specs"))) {
      return headerRoot;
    }
    if (headerRoot && existsSync(headerRoot)) {
      return headerRoot;
    }
  }

  // 2. Try next/headers (for server components)
  try {
    const h = headers();
    const headerRoot = h.get("x-project-root");
    if (headerRoot && existsSync(headerRoot)) {
      return headerRoot;
    }
  } catch {
    // headers() throws outside of request context
  }

  // 3. Fallback: walk up from cwd
  let dir = resolve(process.cwd());
  while (dir !== "/") {
    if (existsSync(join(dir, "specs"))) return dir;
    dir = resolve(dir, "..");
  }
  return process.cwd();
}
