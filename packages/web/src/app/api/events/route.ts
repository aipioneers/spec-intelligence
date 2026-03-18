import { NextRequest } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { FileChangeEvent } from "@spec-intelligence/ui";
import { getProjectRoot } from "../../../lib/project-root";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive the artifact type from a filename.
 */
function artifactType(
  filePath: string,
): FileChangeEvent["artifact"] {
  const segments = filePath.split("/");
  const fileName = segments[segments.length - 1];

  if (fileName === "spec.md") return "spec";
  if (fileName === "plan.md") return "plan";
  if (fileName === "tasks.md") return "tasks";

  // Check if the file is inside a checklists/ directory
  if (
    segments.length >= 2 &&
    segments[segments.length - 2] === "checklists" &&
    fileName.endsWith(".md")
  ) {
    return "checklist";
  }

  return "unknown";
}

/**
 * Extract the feature slug from a relative path like
 * "001-my-feature/spec.md".
 */
function extractFeatureSlug(relativePath: string): string | null {
  const firstSegment = relativePath.split("/")[0];
  if (!firstSegment) return null;
  const match = firstSegment.match(/^(\d{3})-(.+)$/);
  return match ? firstSegment : null;
}

/**
 * Map chokidar event names to our change type.
 */
function mapEventType(
  event: string,
): FileChangeEvent["type"] | null {
  switch (event) {
    case "add":
      return "created";
    case "change":
      return "modified";
    case "unlink":
      return "deleted";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// GET /api/events — Server-Sent Events
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const root = getProjectRoot(_request);
  const specsDir = join(root, "specs");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send an initial heartbeat so the client knows the connection is alive
      controller.enqueue(encoder.encode(": heartbeat\n\n"));

      // Dynamically import chokidar so it is only loaded server-side
      let watcher: import("chokidar").FSWatcher | null = null;

      try {
        const chokidar = await import("chokidar");

        if (!existsSync(specsDir)) {
          // If specs/ doesn't exist yet, still keep the connection open
          // and send periodic heartbeats
          const heartbeat = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(": heartbeat\n\n"));
            } catch {
              clearInterval(heartbeat);
            }
          }, 30_000);

          // Store cleanup on the controller (will be called on cancel)
          (controller as unknown as Record<string, unknown>).__cleanup = () => {
            clearInterval(heartbeat);
          };
          return;
        }

        watcher = chokidar.watch(specsDir, {
          ignoreInitial: true,
          ignored: [
            /(^|[/\\])\../, // dotfiles
            /\.swp$/,
            /\.swo$/,
            /\.tmp$/,
            /~$/,
            /\.bak$/,
          ],
          awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100,
          },
        });

        const handleEvent = (eventName: string, filePath: string) => {
          const changeType = mapEventType(eventName);
          if (!changeType) return;

          // Compute relative path from specs dir
          const relative = filePath.startsWith(specsDir)
            ? filePath.slice(specsDir.length + 1)
            : filePath;

          const event: FileChangeEvent = {
            type: changeType,
            path: relative,
            featureSlug: extractFeatureSlug(relative),
            artifact: artifactType(relative),
            timestamp: Date.now(),
          };

          const data = `data: ${JSON.stringify(event)}\n\n`;

          try {
            controller.enqueue(encoder.encode(data));
          } catch {
            // Controller closed — clean up
            watcher?.close();
          }
        };

        watcher.on("add", (path) => handleEvent("add", path));
        watcher.on("change", (path) => handleEvent("change", path));
        watcher.on("unlink", (path) => handleEvent("unlink", path));

        // Periodic heartbeat to keep the connection alive
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            clearInterval(heartbeat);
            watcher?.close();
          }
        }, 30_000);

        // Store references for cleanup
        (controller as unknown as Record<string, unknown>).__cleanup = () => {
          clearInterval(heartbeat);
          watcher?.close();
        };
      } catch (err) {
        // If chokidar is not available, send an error event and close
        const errorMsg = `data: ${JSON.stringify({ error: "File watching not available" })}\n\n`;
        controller.enqueue(encoder.encode(errorMsg));
        controller.close();
      }
    },

    cancel() {
      // Called when the client disconnects
      const cleanup = (this as unknown as Record<string, unknown>).__cleanup;
      if (typeof cleanup === "function") {
        cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
