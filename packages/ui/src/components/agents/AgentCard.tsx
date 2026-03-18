// T086: Agent configuration card component
"use client";

import type { AgentConfig, AgentType, SyncStatus } from '../../types/index';

// ── Agent icons (simple SVG placeholders by type) ──────────────────────

const AGENT_DISPLAY: Record<AgentType, { label: string; icon: string }> = {
  claude: { label: 'Claude', icon: 'C' },
  cursor: { label: 'Cursor', icon: 'Cu' },
  copilot: { label: 'Copilot', icon: 'Co' },
  gemini: { label: 'Gemini', icon: 'G' },
  windsurf: { label: 'Windsurf', icon: 'W' },
  qwen: { label: 'Qwen', icon: 'Q' },
};

const STATUS_STYLES: Record<SyncStatus, { label: string; className: string }> = {
  UpToDate: {
    label: 'Up to date',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  Stale: {
    label: 'Stale',
    className: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  NotInitialized: {
    label: 'Not initialized',
    className: 'bg-gray-3 text-gray-11 border-gray-7',
  },
};

interface AgentCardProps {
  agent: AgentConfig;
  onSync: (agentType: AgentType) => void;
  onRemove: (agentType: AgentType) => void;
}

export function AgentCard({ agent, onSync, onRemove }: AgentCardProps) {
  const display = AGENT_DISPLAY[agent.agentType];
  const statusStyle = STATUS_STYLES[agent.syncStatus];

  return (
    <div className="rounded-lg border border-gray-6 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-3 text-sm font-bold text-accent-11">
            {display.icon}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-12">
              {display.label}
            </h3>
            <p className="mt-0.5 text-xs text-gray-9 font-mono">
              {agent.directoryPath}
            </p>
          </div>
        </div>

        {/* Sync status badge */}
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyle.className}`}
        >
          {statusStyle.label}
        </span>
      </div>

      {/* Context file info */}
      <div className="mt-3 text-xs text-gray-9">
        <span className="font-medium text-gray-11">Context file: </span>
        <span className="font-mono">{agent.contextFilePath}</span>
      </div>

      {agent.commandsDir && (
        <div className="mt-1 text-xs text-gray-9">
          <span className="font-medium text-gray-11">Commands: </span>
          <span className="font-mono">{agent.commandsDir}</span>
        </div>
      )}

      {agent.lastSyncedAt && (
        <div className="mt-1 text-xs text-gray-9">
          <span className="font-medium text-gray-11">Last synced: </span>
          {new Date(agent.lastSyncedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSync(agent.agentType)}
          className="rounded-md bg-accent-3 px-3 py-1.5 text-xs font-medium text-accent-11 hover:bg-accent-4 transition-colors"
        >
          Sync
        </button>
        <button
          type="button"
          onClick={() => onRemove(agent.agentType)}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
