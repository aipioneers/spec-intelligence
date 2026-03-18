// T014: Constitution markdown parser/serializer — parse constitution.md into Constitution type

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import type { Root, Content } from 'mdast';
import type { Constitution, Principle } from '../../types/index';

/**
 * Parse a constitution.md markdown string into a structured Constitution object.
 */
export function parseConstitution(markdown: string): Constitution {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(markdown);

  const constitution: Constitution = {
    principles: [],
    constraints: [],
    developmentGuidelines: [],
    version: '',
    lastAmended: '',
  };

  const sections = splitByH2(tree);

  for (const section of sections) {
    const heading = section.headingText.toLowerCase();

    if (heading.includes('principle') || heading.includes('core principles')) {
      constitution.principles = parsePrinciples(section.children);
    } else if (heading.includes('constraint')) {
      constitution.constraints = parseBulletList(section.children);
    } else if (heading.includes('development guideline') || heading.includes('guidelines')) {
      constitution.developmentGuidelines = parseBulletList(section.children);
    } else if (heading.includes('version') || heading.includes('metadata')) {
      parseMetadata(section.children, constitution);
    }
  }

  // Try to extract version/lastAmended from header if not found in a section
  if (!constitution.version || !constitution.lastAmended) {
    extractHeaderMetadata(tree, constitution);
  }

  return constitution;
}

/**
 * Serialize a Constitution object back to valid constitution.md markdown.
 */
export function serializeConstitution(constitution: Constitution): string {
  const lines: string[] = [];

  lines.push('# Project Constitution');
  lines.push('');

  if (constitution.version || constitution.lastAmended) {
    if (constitution.version) {
      lines.push(`**Version**: ${constitution.version}`);
    }
    if (constitution.lastAmended) {
      lines.push(`**Last Amended**: ${constitution.lastAmended}`);
    }
    lines.push('');
  }

  // ---------- Core Principles ----------
  if (constitution.principles.length > 0) {
    lines.push('## Core Principles');
    lines.push('');

    for (const principle of constitution.principles) {
      lines.push(`### ${principle.name}`);
      lines.push('');
      if (principle.description) {
        lines.push(principle.description);
        lines.push('');
      }
      if (principle.rationale) {
        lines.push(`**Rationale**: ${principle.rationale}`);
        lines.push('');
      }
    }
  }

  // ---------- Constraints ----------
  if (constitution.constraints.length > 0) {
    lines.push('## Constraints');
    lines.push('');
    for (const constraint of constitution.constraints) {
      lines.push(`- ${constraint}`);
    }
    lines.push('');
  }

  // ---------- Development Guidelines ----------
  if (constitution.developmentGuidelines.length > 0) {
    lines.push('## Development Guidelines');
    lines.push('');
    for (const guideline of constitution.developmentGuidelines) {
      lines.push(`- ${guideline}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------- Internal Helpers ----------

interface Section {
  headingText: string;
  children: Content[];
}

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

function parsePrinciples(nodes: Content[]): Principle[] {
  const principles: Principle[] = [];
  let current: Partial<Principle> | null = null;

  for (const node of nodes) {
    if (node.type === 'heading' && node.depth === 3) {
      if (current && current.name) {
        principles.push(finalizePrinciple(current));
      }
      current = {
        name: toString(node).trim(),
        description: '',
        rationale: '',
      };
    } else if (current) {
      if (node.type === 'paragraph') {
        const text = toString(node);
        // Check for **Rationale**: marker
        const rationaleMatch = text.match(/\*?\*?Rationale\*?\*?:\s*(.+)/s);
        if (rationaleMatch) {
          current.rationale = rationaleMatch[1].trim();
        } else if (!current.description) {
          current.description = text.trim();
        } else {
          // Append to description
          current.description += '\n\n' + text.trim();
        }
      }
    } else {
      // No H3 yet — try parsing from bullet list format
      if (node.type === 'list') {
        for (const item of node.children) {
          if (item.type === 'listItem') {
            const text = toString(item);
            // Match "**Name**: description" format
            const match = text.match(/\*?\*?([^*:]+)\*?\*?:\s*(.+)/s);
            if (match) {
              principles.push({
                name: match[1].trim(),
                description: match[2].trim(),
                rationale: '',
              });
            }
          }
        }
      }
    }
  }

  if (current && current.name) {
    principles.push(finalizePrinciple(current));
  }

  return principles;
}

function finalizePrinciple(partial: Partial<Principle>): Principle {
  return {
    name: partial.name ?? '',
    description: partial.description ?? '',
    rationale: partial.rationale ?? '',
  };
}

function parseBulletList(nodes: Content[]): string[] {
  const items: string[] = [];
  for (const node of nodes) {
    if (node.type === 'list') {
      for (const item of node.children) {
        if (item.type === 'listItem') {
          items.push(toString(item).trim());
        }
      }
    }
  }
  return items;
}

function parseMetadata(nodes: Content[], constitution: Constitution): void {
  for (const node of nodes) {
    if (node.type === 'paragraph') {
      const text = toString(node);
      const versionMatch = text.match(/\*?\*?Version\*?\*?:\s*(.+)/i);
      if (versionMatch) constitution.version = versionMatch[1].trim();
      const dateMatch = text.match(/\*?\*?Last Amended\*?\*?:\s*(.+)/i);
      if (dateMatch) constitution.lastAmended = dateMatch[1].trim();
    }
  }
}

function extractHeaderMetadata(tree: Root, constitution: Constitution): void {
  for (const node of tree.children) {
    if (node.type === 'paragraph') {
      const text = toString(node);
      if (!constitution.version) {
        const versionMatch = text.match(/\*?\*?Version\*?\*?:\s*(.+?)(?:\n|$)/i);
        if (versionMatch) constitution.version = versionMatch[1].trim();
      }
      if (!constitution.lastAmended) {
        const dateMatch = text.match(/\*?\*?Last Amended\*?\*?:\s*(.+?)(?:\n|$)/i);
        if (dateMatch) constitution.lastAmended = dateMatch[1].trim();
      }
    }
  }
}
