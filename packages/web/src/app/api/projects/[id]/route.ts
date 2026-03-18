import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

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

// PATCH /api/projects/:id — update name/description
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const projects = loadProjects();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found" } },
        { status: 404 },
      );
    }
    if (body.name !== undefined) projects[idx].name = body.name;
    if (body.description !== undefined) projects[idx].description = body.description;
    saveProjects(projects);
    return NextResponse.json({ project: projects[idx] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

// DELETE /api/projects/:id — remove from registry
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const projects = loadProjects().filter((p) => p.id !== id);
    saveProjects(projects);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
