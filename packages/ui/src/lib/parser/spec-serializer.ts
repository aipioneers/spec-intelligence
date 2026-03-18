// T011: Spec markdown serializer — convert Specification type back to valid spec.md markdown
// Maintains section order: header → User Scenarios → Edge Cases → Requirements → Success Criteria → Clarifications → Assumptions
// CRITICAL: roundtrip fidelity — parseSpec(serializeSpec(spec)) should equal spec

import type {
  Specification,
  UserStory,
  AcceptanceScenario,
  Requirement,
  SuccessCriterion,
  Clarification,
} from '../../types/index';

/**
 * Serialize a Specification object back to valid spec.md markdown.
 */
export function serializeSpec(spec: Specification): string {
  const lines: string[] = [];

  // ---------- Header ----------
  lines.push(`# Feature Specification: ${spec.title}`);
  lines.push('');
  if (spec.description) {
    lines.push(`**Input**: ${spec.description}`);
    lines.push('');
  }

  // ---------- User Scenarios ----------
  lines.push('## User Scenarios & Testing *(mandatory)*');
  lines.push('');

  for (let i = 0; i < spec.userStories.length; i++) {
    const story = spec.userStories[i];
    serializeUserStory(story, lines);

    // Add separator between stories (but not after the last one before edge cases)
    if (i < spec.userStories.length - 1) {
      lines.push('---');
      lines.push('');
    }
  }

  // ---------- Edge Cases ----------
  if (spec.edgeCases.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('### Edge Cases');
    lines.push('');
    for (const edgeCase of spec.edgeCases) {
      lines.push(`- ${edgeCase}`);
    }
    lines.push('');
  }

  // ---------- Requirements ----------
  lines.push('## Requirements *(mandatory)*');
  lines.push('');
  lines.push('### Functional Requirements');
  lines.push('');
  for (const req of spec.requirements) {
    serializeRequirement(req, lines);
  }
  lines.push('');

  // ---------- Key Entities ----------
  if (spec.entities.length > 0) {
    lines.push('### Key Entities');
    lines.push('');
    for (const entity of spec.entities) {
      if (entity.description) {
        lines.push(`- **${entity.name}**: ${entity.description}`);
      } else {
        lines.push(`- **${entity.name}**`);
      }
    }
    lines.push('');
  }

  // ---------- Success Criteria ----------
  lines.push('## Success Criteria *(mandatory)*');
  lines.push('');
  lines.push('### Measurable Outcomes');
  lines.push('');
  for (const sc of spec.successCriteria) {
    lines.push(`- **${sc.id}**: ${sc.description}`);
  }
  lines.push('');

  // ---------- Clarifications ----------
  if (spec.clarifications.length > 0) {
    lines.push('## Clarifications');
    lines.push('');

    // Group by session date
    const grouped = groupClarificationsByDate(spec.clarifications);
    for (const [date, items] of grouped) {
      lines.push(`### Session ${date}`);
      lines.push('');
      for (const c of items) {
        lines.push(`- Q: ${c.question} → A: ${c.answer}`);
      }
      lines.push('');
    }
  }

  // ---------- Assumptions ----------
  if (spec.assumptions.length > 0) {
    lines.push('## Assumptions');
    lines.push('');
    for (const assumption of spec.assumptions) {
      lines.push(`- ${assumption}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------- Internal Helpers ----------

function serializeUserStory(story: UserStory, lines: string[]): void {
  lines.push(
    `### User Story ${story.number} - ${story.title} (Priority: ${story.priority})`
  );
  lines.push('');

  if (story.description) {
    lines.push(story.description);
    lines.push('');
  }

  if (story.priorityReason) {
    lines.push(`**Why this priority**: ${story.priorityReason}`);
    lines.push('');
  }

  if (story.independentTest) {
    lines.push(`**Independent Test**: ${story.independentTest}`);
    lines.push('');
  }

  if (story.acceptanceScenarios.length > 0) {
    lines.push('**Acceptance Scenarios**:');
    lines.push('');
    for (let i = 0; i < story.acceptanceScenarios.length; i++) {
      const scenario = story.acceptanceScenarios[i];
      lines.push(
        `${i + 1}. **Given** ${scenario.given}, **When** ${scenario.when}, **Then** ${scenario.then}.`
      );
    }
    lines.push('');
  }
}

function serializeRequirement(req: Requirement, lines: string[]): void {
  let desc = req.description;
  // Ensure clarification marker is preserved
  if (req.hasClarificationMarker && req.clarificationQuestion && !desc.includes('[NEEDS CLARIFICATION')) {
    desc += ` [NEEDS CLARIFICATION: ${req.clarificationQuestion}]`;
  }
  lines.push(`- **${req.id}**: ${desc}`);
}

function groupClarificationsByDate(
  clarifications: Clarification[]
): Map<string, Clarification[]> {
  const grouped = new Map<string, Clarification[]>();
  for (const c of clarifications) {
    const existing = grouped.get(c.sessionDate);
    if (existing) {
      existing.push(c);
    } else {
      grouped.set(c.sessionDate, [c]);
    }
  }
  return grouped;
}
