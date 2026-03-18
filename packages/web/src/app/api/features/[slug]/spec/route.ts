import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Specification } from "@spec-intelligence/ui";
import { getProjectRoot } from "../../../../../lib/project-root";

function parseSpec(content: string): Specification {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const descMatch =
    content.match(/\*\*Description\*\*:\s*(.+)/i) ??
    content.match(/\*\*Input\*\*:\s*(.+)/i);

  // Parse user stories
  const userStories: Specification["userStories"] = [];
  const usRegex =
    /####\s+US(\d+)[:\s]+(.+?)(?:\n|$)(?:.*?\*\*Priority\*\*:\s*(\w+))?/gs;
  let usMatch;
  while ((usMatch = usRegex.exec(content))) {
    userStories.push({
      number: parseInt(usMatch[1], 10),
      title: usMatch[2].trim(),
      description: usMatch[2].trim(),
      priority: (["P1", "P2", "P3"].includes(usMatch[3]) ? usMatch[3] as "P1" | "P2" | "P3" : "P1") as "P1" | "P2" | "P3",
      priorityReason: "",
      independentTest: "",
      acceptanceScenarios: [],
    });
  }

  // Parse requirements
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

  // Parse success criteria
  const successCriteria: Specification["successCriteria"] = [];
  const scRegex = /- \*\*(SC-\d+)\*\*:\s*(.+)/g;
  let scMatch;
  while ((scMatch = scRegex.exec(content))) {
    successCriteria.push({
      id: scMatch[1],
      description: scMatch[2].trim(),
    });
  }

  // Parse edge cases
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

  // Parse assumptions
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

// GET /api/features/:slug/spec
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
            message: `Specification for "${slug}" not found`,
            details: null,
          },
        },
        { status: 404 },
      );
    }

    const content = readFileSync(specPath, "utf-8");
    const spec = parseSpec(content);

    return NextResponse.json(spec, {
      status: 200,
      headers: { "X-Raw-Content": "true" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}

// PUT /api/features/:slug/spec — save structured spec
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    const root = getProjectRoot(request);
    const specPath = join(root, "specs", slug, "spec.md");

    if (!existsSync(join(root, "specs", slug))) {
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

    const spec = (await request.json()) as Specification;

    // Serialize spec to markdown
    const lines: string[] = [];
    lines.push(`# ${spec.title}\n`);
    if (spec.description) {
      lines.push(`**Description**: ${spec.description}\n`);
    }

    if (spec.userStories.length > 0) {
      lines.push(`## User Stories\n`);
      for (const us of spec.userStories) {
        lines.push(`#### US${us.number}: ${us.title}`);
        lines.push(`**Priority**: ${us.priority}\n`);
        if (us.description !== us.title) {
          lines.push(`${us.description}\n`);
        }
      }
    }

    if (spec.requirements.length > 0) {
      lines.push(`## Requirements\n`);
      for (const req of spec.requirements) {
        lines.push(`- **${req.id}**: ${req.description}`);
      }
      lines.push("");
    }

    if (spec.successCriteria.length > 0) {
      lines.push(`## Success Criteria\n`);
      for (const sc of spec.successCriteria) {
        lines.push(`- **${sc.id}**: ${sc.description}`);
      }
      lines.push("");
    }

    if (spec.edgeCases.length > 0) {
      lines.push(`## Edge Cases\n`);
      for (const ec of spec.edgeCases) {
        lines.push(`- ${ec}`);
      }
      lines.push("");
    }

    if (spec.assumptions.length > 0) {
      lines.push(`## Assumptions\n`);
      for (const a of spec.assumptions) {
        lines.push(`- ${a}`);
      }
      lines.push("");
    }

    const raw = lines.join("\n");
    writeFileSync(specPath, raw, "utf-8");

    return NextResponse.json({ spec, raw }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}
