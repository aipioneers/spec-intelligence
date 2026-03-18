// T088: Agent directory mappings and management functions
// Client-side helpers for agent configuration.

import type { AgentConfig, AgentType, SyncStatus } from '../types/index';

// ── Agent Directory Mappings ───────────────────────────────────────────

export const AGENT_DIRECTORIES: Record<
  AgentType,
  {
    directory: string;
    contextFile: string;
    commandsDir: string | null;
  }
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

/**
 * Build an AgentConfig from an agent type and project root.
 */
export function buildAgentConfig(
  agentType: AgentType,
  projectRoot: string,
  syncStatus: SyncStatus = 'NotInitialized',
  lastSyncedAt: string | null = null,
): AgentConfig {
  const mapping = AGENT_DIRECTORIES[agentType];
  return {
    agentType,
    directoryPath: `${projectRoot}/${mapping.directory}`,
    contextFilePath: `${projectRoot}/${mapping.contextFile}`,
    commandsDir: mapping.commandsDir
      ? `${projectRoot}/${mapping.commandsDir}`
      : null,
    syncStatus,
    lastSyncedAt,
  };
}

/**
 * Get the list of all known agent types.
 */
export function getAllAgentTypes(): AgentType[] {
  return ['claude', 'cursor', 'copilot', 'gemini', 'windsurf', 'qwen'];
}

/**
 * Determine the display name for an agent type.
 */
export function getAgentDisplayName(agentType: AgentType): string {
  const names: Record<AgentType, string> = {
    claude: 'Claude',
    cursor: 'Cursor',
    copilot: 'GitHub Copilot',
    gemini: 'Gemini',
    windsurf: 'Windsurf',
    qwen: 'Qwen',
  };
  return names[agentType];
}
