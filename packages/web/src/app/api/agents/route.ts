// T090: Agent management API routes
// GET: list configured agents
// POST: add agent (create directory structure)
// DELETE: remove agent
// PATCH: sync agent context

import { NextRequest, NextResponse } from 'next/server';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  statSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import type { AgentConfig, AgentType, SyncStatus } from '@spec-intelligence/ui';
import { getProjectRoot } from "../../../lib/project-root";

// ── Constants ──────────────────────────────────────────────────────────

const AGENT_DIRECTORIES: Record<
  AgentType,
  { directory: string; contextFile: string; commandsDir: string | null }
> = {
  claude: {
    directory: '.claude',
    contextFile: '.claude/CLAUDE.md',
    commandsDir: '.claude/commands',
  },
  cursor: {
    directory: '.cursor',
    contextFile: '.cursor/rules',
    commandsDir: null,
  },
  copilot: {
    directory: '.github/copilot',
    contextFile: '.github/copilot/instructions.md',
    commandsDir: null,
  },
  gemini: {
    directory: '.gemini',
    contextFile: '.gemini/settings.json',
    commandsDir: null,
  },
  windsurf: {
    directory: '.windsurf',
    contextFile: '.windsurf/rules',
    commandsDir: null,
  },
  qwen: {
    directory: '.qwen',
    contextFile: '.qwen/config.json',
    commandsDir: null,
  },
};

const ALL_AGENT_TYPES: AgentType[] = [
  'claude',
  'cursor',
  'copilot',
  'gemini',
  'windsurf',
  'qwen',
];

function detectSyncStatus(
  root: string,
  agentType: AgentType,
): { syncStatus: SyncStatus; lastSyncedAt: string | null } {
  const mapping = AGENT_DIRECTORIES[agentType];
  const contextPath = join(root, mapping.contextFile);

  if (!existsSync(contextPath)) {
    return { syncStatus: 'NotInitialized', lastSyncedAt: null };
  }

  try {
    const stat = statSync(contextPath);
    const lastModified = stat.mtime;
    const age = Date.now() - lastModified.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    return {
      syncStatus: age < oneDay ? 'UpToDate' : 'Stale',
      lastSyncedAt: lastModified.toISOString(),
    };
  } catch {
    return { syncStatus: 'NotInitialized', lastSyncedAt: null };
  }
}

function buildAgentConfig(root: string, agentType: AgentType): AgentConfig {
  const mapping = AGENT_DIRECTORIES[agentType];
  const { syncStatus, lastSyncedAt } = detectSyncStatus(root, agentType);

  return {
    agentType,
    directoryPath: join(root, mapping.directory),
    contextFilePath: join(root, mapping.contextFile),
    commandsDir: mapping.commandsDir
      ? join(root, mapping.commandsDir)
      : null,
    syncStatus,
    lastSyncedAt,
  };
}

// ── GET /api/agents ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const root = getProjectRoot(request);
    const agents: AgentConfig[] = [];

    for (const agentType of ALL_AGENT_TYPES) {
      const mapping = AGENT_DIRECTORIES[agentType];
      const dirPath = join(root, mapping.directory);

      if (existsSync(dirPath)) {
        agents.push(buildAgentConfig(root, agentType));
      }
    }

    return NextResponse.json({ agents }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message, details: null } },
      { status: 500 },
    );
  }
}

// ── POST /api/agents ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentType } = body as { agentType: AgentType };

    if (!agentType || !ALL_AGENT_TYPES.includes(agentType)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid agent type: ${agentType}`,
            details: null,
          },
        },
        { status: 400 },
      );
    }

    const root = getProjectRoot(request);
    const mapping = AGENT_DIRECTORIES[agentType];
    const dirPath = join(root, mapping.directory);

    // Create directory structure
    mkdirSync(dirPath, { recursive: true });

    if (mapping.commandsDir) {
      mkdirSync(join(root, mapping.commandsDir), { recursive: true });
    }

    // Create a default context file if it doesn't exist
    const contextPath = join(root, mapping.contextFile);
    if (!existsSync(contextPath)) {
      const defaultContent =
        agentType === 'gemini' || agentType === 'qwen'
          ? '{}'
          : `# ${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Context\n\nProject configuration for ${agentType}.\n`;

      // Ensure parent directory of context file exists
      const contextDir = contextPath.substring(
        0,
        contextPath.lastIndexOf('/'),
      );
      if (!existsSync(contextDir)) {
        mkdirSync(contextDir, { recursive: true });
      }

      writeFileSync(contextPath, defaultContent, 'utf-8');
    }

    const agent = buildAgentConfig(root, agentType);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message, details: null } },
      { status: 500 },
    );
  }
}

// ── DELETE /api/agents ─────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentType } = body as { agentType: AgentType };

    if (!agentType || !ALL_AGENT_TYPES.includes(agentType)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid agent type: ${agentType}`,
            details: null,
          },
        },
        { status: 400 },
      );
    }

    const root = getProjectRoot(request);
    const mapping = AGENT_DIRECTORIES[agentType];
    const dirPath = join(root, mapping.directory);

    if (existsSync(dirPath)) {
      rmSync(dirPath, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message, details: null } },
      { status: 500 },
    );
  }
}

// ── PATCH /api/agents ──────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentType } = body as { agentType: AgentType };

    if (!agentType || !ALL_AGENT_TYPES.includes(agentType)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid agent type: ${agentType}`,
            details: null,
          },
        },
        { status: 400 },
      );
    }

    const root = getProjectRoot(request);
    const mapping = AGENT_DIRECTORIES[agentType];
    const contextPath = join(root, mapping.contextFile);

    if (!existsSync(contextPath)) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Agent "${agentType}" is not configured`,
            details: null,
          },
        },
        { status: 404 },
      );
    }

    // "Sync" by touching the file (update mtime) to reflect a sync happened
    // In a real implementation, this would regenerate context from specs/
    const now = new Date();
    const { utimesSync } = await import('node:fs');
    utimesSync(contextPath, now, now);

    const agent = buildAgentConfig(root, agentType);
    // Override to UpToDate since we just synced
    agent.syncStatus = 'UpToDate';
    agent.lastSyncedAt = now.toISOString();

    return NextResponse.json({ agent }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message, details: null } },
      { status: 500 },
    );
  }
}
