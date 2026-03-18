import { NextRequest, NextResponse } from "next/server";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

const PROJECTS_FILE = join(homedir(), ".spec-intelligence", "projects.json");

interface StoredProject {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
  createdAt: string;
  description?: string;
}

function loadProjects(): StoredProject[] {
  try {
    if (existsSync(PROJECTS_FILE)) {
      const data = JSON.parse(readFileSync(PROJECTS_FILE, "utf-8"));
      return data.projects ?? [];
    }
  } catch {}
  return [];
}

function saveProjects(projects: StoredProject[]): void {
  const dir = join(homedir(), ".spec-intelligence");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(PROJECTS_FILE, JSON.stringify({ projects }, null, 2), "utf-8");
}

// GET /api/projects — list registered projects (filter out deleted paths)
export async function GET() {
  const projects = loadProjects().filter((p) => existsSync(p.path));
  return NextResponse.json({ projects });
}

// POST /api/projects — open or create a project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, name, action } = body as {
      path: string;
      name?: string;
      action: "open" | "create";
    };

    if (!path) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Path is required" } },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    if (action === "create") {
      // Create project structure
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
      const specsDir = join(path, "specs");
      if (!existsSync(specsDir)) {
        mkdirSync(specsDir, { recursive: true });
      }
      // Create a constitution.md template
      const constitutionPath = join(path, "constitution.md");
      if (!existsSync(constitutionPath)) {
        writeFileSync(
          constitutionPath,
          `# Project Constitution\n\n## Principles\n\n- Quality over speed\n- User-first design\n- Test everything\n`,
          "utf-8",
        );
      }

      // Register new project
      const projects = loadProjects();
      const existing = projects.find((p) => p.path === path);
      if (existing) {
        existing.lastOpened = now;
        saveProjects(projects);
        return NextResponse.json({ project: existing });
      }

      const project: StoredProject = {
        id: randomUUID(),
        name: name ?? basename(path),
        path,
        lastOpened: now,
        createdAt: now,
      };
      projects.unshift(project);
      saveProjects(projects);
      return NextResponse.json({ project });
    } else {
      // Open — validate path exists
      if (!existsSync(path)) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: `Path "${path}" does not exist`,
            },
          },
          { status: 404 },
        );
      }

      // Auto-create specs/ if folder exists but has no specs dir
      const specsDir = join(path, "specs");
      if (!existsSync(specsDir)) {
        mkdirSync(specsDir, { recursive: true });
      }

      // Register or update
      const projects = loadProjects();
      const existing = projects.find((p) => p.path === path);
      if (existing) {
        existing.lastOpened = now;
        if (name !== undefined) existing.name = name;
        saveProjects(projects);
        return NextResponse.json({ project: existing });
      }

      const project: StoredProject = {
        id: randomUUID(),
        name: name ?? basename(path),
        path,
        lastOpened: now,
        createdAt: now,
      };
      projects.unshift(project);
      saveProjects(projects);
      return NextResponse.json({ project });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
