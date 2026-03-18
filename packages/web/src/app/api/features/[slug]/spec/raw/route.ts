import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Specification } from "@spec-intelligence/ui";
import { getProjectRoot } from "../../../../../../lib/project-root";

function parseSpec(content: string): Specification {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const descMatch =
    content.match(/\*\*Description\*\*:\s*(.+)/i) ??
    content.match(/\*\*Input\*\*:\s*(.+)/i);

  const userStories: Specification["userStories"] = [];
  const usRegex =
    /####\s+US(\d+)[:\s]+(.+?)(?:\n|$)(?:.*?\*\*Priority\*\*:\s*(\w+))?/gs;
  let usMatch;
  while ((usMatch = usRegex.exec(content))) {
    userStories.push({
      number: parseInt(usMatch[1], 10),
      title: usMatch[2].trim(),
      description: usMatch[2].trim(),
      priority: (["P1", "P2", "P3"].includes(usMatch[3])
        ? (usMatch[3] as "P1" | "P2" | "P3")
        : "P1") as "P1" | "P2" | "P3",
      priorityReason: "",
      independentTest: "",
      acceptanceScenarios: [],
    });
  }

  const requirements: Specification["requirements"] = [];
  const reqRegex = /- \*\*(REQ-\d+)\*\*:\s*(.+)/g;
  let reqMatch;
  while ((reqMatch = reqRegex.exec(content))) {
    requirements.push({
      id: reqMatch[1],
      description: reqMatch[2].trim(),
      hasClarificationMarker: reqMatch[2].includes("[NEEDS CLARIFICATION]"),
      clarificationQuestion: null,
    });
  }

  const successCriteria: Specification["successCriteria"] = [];
  const scRegex = /- \*\*(SC-\d+)\*\*:\s*(.+)/g;
  let scMatch;
  while ((scMatch = scRegex.exec(content))) {
    successCriteria.push({
      id: scMatch[1],
      description: scMatch[2].trim(),
    });
  }

  const edgeCases: string[] = [];
  const edgeCaseSection = content.match(
    /## Edge Cases\s*\n([\s\S]*?)(?=\n## |\n$|$)/,
  );
  if (edgeCaseSection) {
    const lines = edgeCaseSection[1].match(/- (.+)/g);
    if (lines) {
      for (const line of lines) {
        edgeCases.push(line.replace(/^- /, "").trim());
      }
    }
  }

  const assumptions: string[] = [];
  const assumptionSection = content.match(
    /## Assumptions\s*\n([\s\S]*?)(?=\n## |\n$|$)/,
  );
  if (assumptionSection) {
    const lines = assumptionSection[1].match(/- (.+)/g);
    if (lines) {
      for (const line of lines) {
        assumptions.push(line.replace(/^- /, "").trim());
      }
    }
  }

  return {
    title: titleMatch ? titleMatch[1].trim() : "Untitled",
    description: descMatch ? descMatch[1].trim() : "",
    userStories,
    requirements,
    successCriteria,
    edgeCases,
    assumptions,
    entities: [],
    clarifications: [],
  };
}

// PUT /api/features/:slug/spec/raw — save raw markdown
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(request);
    const featureDir = join(root, "specs", slug);
    const specPath = join(featureDir, "spec.md");

    if (!existsSync(featureDir)) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Feature "${slug}" not found`,
            details: null,
          },
        },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { markdown } = body as { markdown: string };

    if (typeof markdown !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "markdown field is required",
            details: null,
          },
        },
        { status: 400 },
      );
    }

    writeFileSync(specPath, markdown, "utf-8");
    const spec = parseSpec(markdown);

    return NextResponse.json({ spec }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}
