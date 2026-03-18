import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getProjectRoot } from "../../../../../lib/project-root";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Regex that matches [NEEDS CLARIFICATION: <question>] markers. */
const CLARIFICATION_REGEX = /\[NEEDS CLARIFICATION:\s*([^\]]+)\]/g;

interface ClarificationMarker {
  markerText: string;
  question: string;
  line: number;
  index: number;
}

/**
 * Extract all [NEEDS CLARIFICATION: ...] markers from spec content.
 */
function extractMarkers(content: string): ClarificationMarker[] {
  const markers: ClarificationMarker[] = [];
  const lines = content.split("\n");

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    let match: RegExpExecArray | null;

    // Reset lastIndex for each line
    const regex = /\[NEEDS CLARIFICATION:\s*([^\]]+)\]/g;
    while ((match = regex.exec(line)) !== null) {
      markers.push({
        markerText: match[0],
        question: match[1].trim(),
        line: lineIdx + 1,
        index: match.index,
      });
    }
  }

  return markers;
}

/**
 * Resolve a marker in the spec content:
 *  1. Replace the marker text with the answer
 *  2. Append to the Clarifications section (create section if not present)
 */
function resolveMarkerInContent(
  content: string,
  markerText: string,
  answer: string,
  question: string,
): string {
  // 1. Replace the marker with the answer text
  let updated = content.replace(markerText, answer);

  // 2. Append to Clarifications section
  const today = new Date().toISOString().split("T")[0];
  const clarificationEntry = `\n- **${today}** — Q: ${question} — A: ${answer}`;

  // Check if a Clarifications section already exists
  const clarificationsHeader = /^##\s+Clarifications?\s*$/m;
  if (clarificationsHeader.test(updated)) {
    // Append after the Clarifications heading
    updated = updated.replace(
      clarificationsHeader,
      (match) => `${match}\n${clarificationEntry}`,
    );
  } else {
    // Add a new Clarifications section at the end
    updated =
      updated.trimEnd() +
      `\n\n## Clarifications\n${clarificationEntry}\n`;
  }

  return updated;
}

// ---------------------------------------------------------------------------
// GET /api/features/:slug/clarifications
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(_request);
    const specPath = join(root, "specs", slug, "spec.md");

    if (!existsSync(specPath)) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Spec file not found for feature "${slug}"`,
            details: null,
          },
        },
        { status: 404 },
      );
    }

    const content = readFileSync(specPath, "utf-8");
    const markers = extractMarkers(content);

    return NextResponse.json({ markers }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/features/:slug/clarifications
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(request);
    const specPath = join(root, "specs", slug, "spec.md");

    if (!existsSync(specPath)) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Spec file not found for feature "${slug}"`,
            details: null,
          },
        },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { markerText, answer } = body as {
      markerText: string;
      answer: string;
    };

    if (!markerText || !answer) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "markerText and answer are required",
            details: null,
          },
        },
        { status: 400 },
      );
    }

    const content = readFileSync(specPath, "utf-8");

    // Verify the marker exists
    if (!content.includes(markerText)) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Marker text not found in spec.md",
            details: null,
          },
        },
        { status: 404 },
      );
    }

    // Extract the question from the marker
    const questionMatch = markerText.match(
      /\[NEEDS CLARIFICATION:\s*([^\]]+)\]/,
    );
    const question = questionMatch ? questionMatch[1].trim() : markerText;

    // Resolve the marker
    const updatedContent = resolveMarkerInContent(
      content,
      markerText,
      answer,
      question,
    );

    // Write back
    writeFileSync(specPath, updatedContent, "utf-8");

    // Return remaining markers
    const remainingMarkers = extractMarkers(updatedContent);

    return NextResponse.json(
      {
        resolved: true,
        question,
        answer,
        remainingMarkers,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}
