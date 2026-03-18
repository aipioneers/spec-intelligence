// T010: Spec markdown parser — parse spec.md into Specification type
// Uses unified + remark-parse + remark-gfm + remark-frontmatter

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { toString } from 'mdast-util-to-string';
import type { Root, Content, List } from 'mdast';
import type {
  Specification,
  UserStory,
  AcceptanceScenario,
  Requirement,
  SuccessCriterion,
  Clarification,
  Entity,
  Priority,
} from '../../types/index';

/**
 * Parse a spec.md markdown string into a structured Specification object.
 */
export function parseSpec(markdown: string): Specification {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter)
    .parse(markdown);

  const spec: Specification = {
    title: '',
    description: '',
    userStories: [],
    edgeCases: [],
    requirements: [],
    entities: [],
    successCriteria: [],
    clarifications: [],
    assumptions: [],
  };

  // Extract H1 title
  spec.title = extractTitle(tree);

  // Extract header metadata
  spec.description = extractDescription(tree);

  // Split at H2 level only — H3+ headings are included as children
  const sections = splitByH2(tree);

  for (const section of sections) {
    const heading = section.headingText.toLowerCase();

    if (heading.includes('user scenario') || heading.includes('user stories')) {
      spec.userStories = parseUserStories(section.children);
      // Edge cases are inside the same H2 section as an H3
      spec.edgeCases = parseEdgeCasesFromStories(section.children);
    } else if (heading.includes('requirement')) {
      spec.requirements = parseRequirements(section.children);
      spec.entities = parseEntities(section.children);
    } else if (heading.includes('success criteria')) {
      spec.successCriteria = parseSuccessCriteria(section.children);
    } else if (heading.includes('clarification')) {
      spec.clarifications = parseClarifications(section.children);
    } else if (heading.includes('assumption')) {
      spec.assumptions = parseAssumptions(section.children);
    }
  }

  return spec;
}

// ---------- Internal Helpers ----------

interface Section {
  headingText: string;
  children: Content[];
}

function extractTitle(tree: Root): string {
  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth === 1) {
      const text = toString(node);
      const prefix = 'Feature Specification:';
      if (text.startsWith(prefix)) {
        return text.slice(prefix.length).trim();
      }
      return text.trim();
    }
  }
  return '';
}

function extractDescription(tree: Root): string {
  for (const node of tree.children) {
    if (node.type === 'paragraph') {
      const text = toString(node);
      // Look for **Input**: or Input: line
      const inputMatch = text.match(/Input:\s*(.+)/);
      if (inputMatch) {
        return inputMatch[1].trim();
      }
    }
  }
  return '';
}

/**
 * Split tree at H2 boundaries only. H3+ headings become children of their parent H2.
 */
function splitByH2(tree: Root): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth === 2) {
      if (current) sections.push(current);
      current = {
        headingText: toString(node),
        children: [],
      };
    } else if (current) {
      current.children.push(node);
    }
  }

  if (current) sections.push(current);
  return sections;
}

// ---------- User Story Parsing ----------

function parseUserStories(nodes: Content[]): UserStory[] {
  const stories: UserStory[] = [];
  let currentStory: Partial<UserStory> | null = null;
  let collectingAcceptance = false;

  for (const node of nodes) {
    if (node.type === 'heading' && node.depth === 3) {
      // Save previous story
      if (currentStory && currentStory.number !== undefined) {
        stories.push(finalizeStory(currentStory));
      }

      const text = toString(node);
      // Match "User Story N - Title (Priority: PX)"
      const match = text.match(
        /User Story (\d+)\s*[-\u2013\u2014]\s*(.+?)\s*\(Priority:\s*(P[123])\)/i
      );
      if (match) {
        currentStory = {
          number: parseInt(match[1], 10),
          title: match[2].trim(),
          priority: match[3] as Priority,
          description: '',
          priorityReason: '',
          independentTest: '',
          acceptanceScenarios: [],
        };
        collectingAcceptance = false;
      } else {
        // Non-story H3 (e.g., "Edge Cases") — stop collecting current story
        if (currentStory && currentStory.number !== undefined) {
          stories.push(finalizeStory(currentStory));
        }
        currentStory = null;
        collectingAcceptance = false;
      }
    } else if (currentStory) {
      if (node.type === 'paragraph') {
        const text = toString(node);

        if (text.startsWith('Why this priority')) {
          currentStory.priorityReason = text.replace(/^Why this priority:?\s*/i, '').trim();
        } else if (text.startsWith('Independent Test')) {
          currentStory.independentTest = text.replace(/^Independent Test:?\s*/i, '').trim();
        } else if (text.startsWith('Acceptance Scenario')) {
          collectingAcceptance = true;
        } else if (!collectingAcceptance && !currentStory.description) {
          currentStory.description = text.trim();
        }
      } else if (node.type === 'list' && collectingAcceptance) {
        currentStory.acceptanceScenarios = parseAcceptanceScenarios(node);
        collectingAcceptance = false;
      } else if (node.type === 'thematicBreak') {
        if (currentStory.number !== undefined) {
          stories.push(finalizeStory(currentStory));
        }
        currentStory = null;
        collectingAcceptance = false;
      }
    }
  }

  if (currentStory && currentStory.number !== undefined) {
    stories.push(finalizeStory(currentStory));
  }

  return stories;
}

function finalizeStory(partial: Partial<UserStory>): UserStory {
  return {
    number: partial.number ?? 0,
    title: partial.title ?? '',
    priority: partial.priority ?? 'P3',
    description: partial.description ?? '',
    priorityReason: partial.priorityReason ?? '',
    independentTest: partial.independentTest ?? '',
    acceptanceScenarios: partial.acceptanceScenarios ?? [],
  };
}

function parseAcceptanceScenarios(list: List): AcceptanceScenario[] {
  const scenarios: AcceptanceScenario[] = [];
  for (const item of list.children) {
    if (item.type === 'listItem') {
      const text = toString(item);
      const scenario = parseGivenWhenThen(text);
      if (scenario) {
        scenarios.push(scenario);
      }
    }
  }
  return scenarios;
}

function parseGivenWhenThen(text: string): AcceptanceScenario | null {
  // Match Given/When/Then markers (bold markers stripped by toString)
  const match = text.match(
    /Given\s+(.+?),?\s+When\s+(.+?),?\s+Then\s+(.+)/is
  );
  if (match) {
    return {
      given: match[1].trim().replace(/,\s*$/, ''),
      when: match[2].trim().replace(/,\s*$/, ''),
      then: match[3].trim().replace(/\.\s*$/, ''),
    };
  }
  return null;
}

// ---------- Edge Cases ----------

function parseEdgeCasesFromStories(nodes: Content[]): string[] {
  // Edge cases appear as an H3 "Edge Cases" section within the User Scenarios H2
  const edgeCases: string[] = [];
  let inEdgeCases = false;

  for (const node of nodes) {
    if (node.type === 'heading' && node.depth === 3) {
      const text = toString(node).toLowerCase();
      inEdgeCases = text.includes('edge case');
    } else if (inEdgeCases && node.type === 'list') {
      for (const item of node.children) {
        if (item.type === 'listItem') {
          edgeCases.push(toString(item).trim());
        }
      }
    } else if (inEdgeCases && node.type === 'heading') {
      inEdgeCases = false;
    }
  }
  return edgeCases;
}

// ---------- Requirements ----------

function parseRequirements(nodes: Content[]): Requirement[] {
  const requirements: Requirement[] = [];
  let inFunctionalReqs = false;

  for (const node of nodes) {
    if (node.type === 'heading' && node.depth === 3) {
      const text = toString(node).toLowerCase();
      inFunctionalReqs = text.includes('functional requirement');
      if (text.includes('key entit')) {
        inFunctionalReqs = false;
      }
    } else if (inFunctionalReqs && node.type === 'list') {
      for (const item of node.children) {
        if (item.type === 'listItem') {
          const text = toString(item);
          const req = parseRequirement(text);
          if (req) {
            requirements.push(req);
          }
        }
      }
    }
  }

  // Fallback: if no H3 was found, scan all lists
  if (requirements.length === 0) {
    for (const node of nodes) {
      if (node.type === 'list') {
        for (const item of node.children) {
          if (item.type === 'listItem') {
            const text = toString(item);
            const req = parseRequirement(text);
            if (req) requirements.push(req);
          }
        }
      }
    }
  }

  return requirements;
}

function parseRequirement(text: string): Requirement | null {
  const match = text.match(/(FR-\d+):\s*(.+)/s);
  if (!match) return null;

  const id = match[1];
  const description = match[2].trim();

  const clarificationMatch = description.match(
    /\[NEEDS CLARIFICATION:\s*(.+?)\]/i
  );

  return {
    id,
    description,
    hasClarificationMarker: !!clarificationMatch,
    clarificationQuestion: clarificationMatch?.[1]?.trim() ?? null,
  };
}

// ---------- Entities ----------

function parseEntities(nodes: Content[]): Entity[] {
  const entities: Entity[] = [];
  let inEntities = false;

  for (const node of nodes) {
    if (node.type === 'heading' && node.depth === 3) {
      const text = toString(node).toLowerCase();
      inEntities = text.includes('key entit');
    } else if (inEntities && node.type === 'list') {
      for (const item of node.children) {
        if (item.type === 'listItem') {
          const text = toString(item);
          const match = text.match(/([^:]+):\s*(.*)/s);
          if (match) {
            entities.push({
              name: match[1].trim(),
              description: match[2]?.trim() ?? '',
            });
          }
        }
      }
    } else if (inEntities && node.type === 'heading') {
      inEntities = false;
    }
  }
  return entities;
}

// ---------- Success Criteria ----------

function parseSuccessCriteria(nodes: Content[]): SuccessCriterion[] {
  const criteria: SuccessCriterion[] = [];

  for (const node of nodes) {
    if (node.type === 'list') {
      for (const item of node.children) {
        if (item.type === 'listItem') {
          const text = toString(item);
          const match = text.match(/(SC-\d+):\s*(.+)/s);
          if (match) {
            criteria.push({
              id: match[1],
              description: match[2].trim(),
            });
          }
        }
      }
    }
  }

  return criteria;
}

// ---------- Clarifications ----------

function parseClarifications(nodes: Content[]): Clarification[] {
  const clarifications: Clarification[] = [];
  let currentDate = '';

  for (const node of nodes) {
    if (node.type === 'heading' && node.depth === 3) {
      const text = toString(node);
      const match = text.match(/Session\s+(\d{4}-\d{2}-\d{2})/i);
      if (match) {
        currentDate = match[1];
      }
    } else if (node.type === 'list' && currentDate) {
      for (const item of node.children) {
        if (item.type === 'listItem') {
          const text = toString(item);
          // Match "Q: question → A: answer" pattern
          // toString strips markdown but keeps the arrow character
          const match = text.match(/Q:\s*(.+?)\s*\u2192\s*A:\s*(.+)/s);
          if (match) {
            clarifications.push({
              sessionDate: currentDate,
              question: match[1].trim(),
              answer: match[2].trim(),
            });
          }
        }
      }
    }
  }

  return clarifications;
}

// ---------- Assumptions ----------

function parseAssumptions(nodes: Content[]): string[] {
  const assumptions: string[] = [];
  for (const node of nodes) {
    if (node.type === 'list') {
      for (const item of node.children) {
        if (item.type === 'listItem') {
          assumptions.push(toString(item).trim());
        }
      }
    }
  }
  return assumptions;
}
