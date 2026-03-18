// T012: Plan markdown parser/serializer — parse plan.md into Plan type and serialize back

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { toString } from 'mdast-util-to-string';
import type { Root, Content, Heading } from 'mdast';
import type { Plan, TechnicalContext, ConstitutionCheckResult } from '../../types/index';

/**
 * Parse a plan.md markdown string into a structured Plan object.
 */
export function parsePlan(markdown: string): Plan {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter)
    .parse(markdown);

  const plan: Plan = {
    summary: '',
    technicalContext: emptyTechnicalContext(),
    projectStructure: '',
    constitutionCheck: { passed: true, details: [] },
  };

  const sections = splitByH2(tree);

  for (const section of sections) {
    const heading = section.headingText.toLowerCase();

    if (heading.includes('summary')) {
      plan.summary = collectParagraphs(section.children);
    } else if (heading.includes('technical context')) {
      plan.technicalContext = parseTechnicalContext(section.children);
    } else if (heading.includes('project structure')) {
      plan.projectStructure = collectProjectStructure(section.children);
    } else if (heading.includes('constitution check')) {
      plan.constitutionCheck = parseConstitutionCheck(section.children);
    }
  }

  return plan;
}

/**
 * Serialize a Plan object back to valid plan.md markdown.
 */
export function serializePlan(plan: Plan): string {
  const lines: string[] = [];

  lines.push('# Implementation Plan');
  lines.push('');

  // ---------- Summary ----------
  lines.push('## Summary');
  lines.push('');
  if (plan.summary) {
    lines.push(plan.summary);
    lines.push('');
  }

  // ---------- Technical Context ----------
  lines.push('## Technical Context');
  lines.push('');
  serializeTechnicalContext(plan.technicalContext, lines);
  lines.push('');

  // ---------- Constitution Check ----------
  if (plan.constitutionCheck.details.length > 0 || plan.constitutionCheck.passed) {
    lines.push('## Constitution Check');
    lines.push('');
    const passStatus = plan.constitutionCheck.passed ? 'PASSED' : 'FAILED';
    lines.push(`*Status: ${passStatus}*`);
    lines.push('');
    for (const detail of plan.constitutionCheck.details) {
      lines.push(detail);
    }
    if (plan.constitutionCheck.details.length > 0) {
      lines.push('');
    }
  }

  // ---------- Project Structure ----------
  if (plan.projectStructure) {
    lines.push('## Project Structure');
    lines.push('');
    lines.push(plan.projectStructure);
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

function collectParagraphs(nodes: Content[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if (node.type === 'paragraph' || node.type === 'blockquote') {
      parts.push(toString(node).trim());
    } else if (node.type === 'heading') {
      // Stop at next heading
      break;
    }
  }
  return parts.join('\n\n');
}

function collectProjectStructure(nodes: Content[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if (node.type === 'code') {
      parts.push('```' + (node.lang || '') + '\n' + node.value + '\n```');
    } else if (node.type === 'paragraph') {
      parts.push(toString(node).trim());
    } else if (node.type === 'heading') {
      const depth = (node as Heading).depth;
      parts.push('#'.repeat(depth) + ' ' + toString(node));
    }
  }
  return parts.join('\n\n');
}

function parseTechnicalContext(nodes: Content[]): TechnicalContext {
  const ctx = emptyTechnicalContext();
  const text = nodes.map((n) => toString(n)).join('\n');

  ctx.language = extractField(text, 'Language/Version') || extractField(text, 'Language') || '';
  ctx.storage = extractField(text, 'Storage') || '';
  ctx.testing = extractField(text, 'Testing') || '';
  ctx.targetPlatform = extractField(text, 'Target Platform') || '';
  ctx.projectType = extractField(text, 'Project Type') || '';
  ctx.performanceGoals = extractField(text, 'Performance Goals') || '';
  ctx.constraints = extractField(text, 'Constraints') || '';
  ctx.scaleScope = extractField(text, 'Scale/Scope') || extractField(text, 'Scale') || '';

  // Dependencies can be a comma-separated list
  const depsRaw = extractField(text, 'Primary Dependencies') || extractField(text, 'Dependencies') || '';
  ctx.dependencies = depsRaw
    ? depsRaw.split(',').map((d) => d.trim()).filter(Boolean)
    : [];

  return ctx;
}

function extractField(text: string, fieldName: string): string | null {
  // Match **FieldName**: value or FieldName: value
  const regex = new RegExp(`\\*?\\*?${escapeRegex(fieldName)}\\*?\\*?:\\s*(.+?)(?:\\n|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseConstitutionCheck(nodes: Content[]): ConstitutionCheckResult {
  const text = nodes.map((n) => toString(n)).join('\n').toLowerCase();
  // Determine passed/failed: look for explicit failure markers
  // "No violations" means it passed; "violation found" means it failed
  const hasExplicitFail = /\bfail(ed|ure|s)?\b/.test(text) || /violation(s)?\s+(found|detected|reported)/.test(text);
  const hasExplicitPass = /\bpass(ed|es)?\b/.test(text) || /no\s+violation/.test(text) || /gate\s+passes/.test(text);
  const passed = hasExplicitPass || !hasExplicitFail;
  const details = nodes
    .filter((n) => n.type === 'paragraph' || n.type === 'blockquote')
    .map((n) => toString(n).trim())
    .filter(Boolean);
  return { passed, details };
}

function emptyTechnicalContext(): TechnicalContext {
  return {
    language: '',
    dependencies: [],
    storage: '',
    testing: '',
    targetPlatform: '',
    projectType: '',
    performanceGoals: '',
    constraints: '',
    scaleScope: '',
  };
}

function serializeTechnicalContext(ctx: TechnicalContext, lines: string[]): void {
  if (ctx.language) lines.push(`**Language/Version**: ${ctx.language}`);
  if (ctx.dependencies.length > 0) lines.push(`**Primary Dependencies**: ${ctx.dependencies.join(', ')}`);
  if (ctx.storage) lines.push(`**Storage**: ${ctx.storage}`);
  if (ctx.testing) lines.push(`**Testing**: ${ctx.testing}`);
  if (ctx.targetPlatform) lines.push(`**Target Platform**: ${ctx.targetPlatform}`);
  if (ctx.projectType) lines.push(`**Project Type**: ${ctx.projectType}`);
  if (ctx.performanceGoals) lines.push(`**Performance Goals**: ${ctx.performanceGoals}`);
  if (ctx.constraints) lines.push(`**Constraints**: ${ctx.constraints}`);
  if (ctx.scaleScope) lines.push(`**Scale/Scope**: ${ctx.scaleScope}`);
}
