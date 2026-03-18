// T084: GitHub export API route
// POST: create GitHub issues from task payloads
// GET: preview export (return mapped issue payloads without creating)

import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectRoot } from "../../../../../lib/project-root";

// ── GET /api/features/[slug]/github ────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(_request);
    const tasksPath = join(root, 'specs', slug, 'tasks.md');

    if (!existsSync(tasksPath)) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `No tasks found for feature "${slug}"`,
            details: null,
          },
        },
        { status: 404 },
      );
    }

    // Dynamic import of the UI parser — server-side only
    const tasksContent = readFileSync(tasksPath, 'utf-8');

    // Simple task extraction for preview
    const taskLines = tasksContent.match(
      /- \[[ xX]\]\s+T\d{3,4}.*/gm,
    );

    const preview =
      taskLines?.map((line) => {
        const idMatch = line.match(/\b(T\d{3,4})\b/);
        const id = idMatch?.[1] ?? 'T000';
        const description = line
          .replace(/^- \[[ xX]\]\s*/, '')
          .replace(/\bT\d{3,4}\b\s*/, '')
          .replace(/\[P\]\s*/, '')
          .replace(/\[US\d+\]\s*/, '')
          .trim();

        return {
          taskId: id,
          issueTitle: `[${id}] ${description}`,
          labels: ['spec-intelligence'],
          bodyPreview: `Task from feature ${slug}: ${description}`,
        };
      }) ?? [];

    return NextResponse.json({ preview }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message, details: null } },
      { status: 500 },
    );
  }
}

// ── POST /api/features/[slug]/github ───────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const body = await request.json();
    const { repository, issues } = body as {
      repository: string;
      issues: {
        taskId: string;
        payload: { title: string; body: string; labels: string[] };
      }[];
      slug: string;
    };

    if (!repository || !issues || !Array.isArray(issues)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'repository and issues are required',
            details: null,
          },
        },
        { status: 400 },
      );
    }

    // Dynamic import of server-side GitHub client
    const { createIssues } = await import('@/lib/github');

    const results = await createIssues(repository, issues);

    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message, details: null } },
      { status: 500 },
    );
  }
}
