// T087: Agent configuration panel — grid of agent cards + management
"use client";

import { useState } from 'react';
import type { AgentConfig, AgentType } from '../../types/index';
import { AgentCard } from './AgentCard';

const ALL_AGENT_TYPES: { type: AgentType; label: string }[] = [
  { type: 'claude', label: 'Claude' },
  { type: 'cursor', label: 'Cursor' },
  { type: 'copilot', label: 'GitHub Copilot' },
  { type: 'gemini', label: 'Gemini' },
  { type: 'windsurf', label: 'Windsurf' },
  { type: 'qwen', label: 'Qwen' },
];

interface AgentConfigPanelProps {
  agents: AgentConfig[];
  onAdd: (agentType: AgentType) => void;
  onRemove: (agentType: AgentType) => void;
  onSync: (agentType: AgentType) => void;
  onSyncAll?: () => void;
  loading?: boolean;
}

export function AgentConfigPanel({
  agents,
  onAdd,
  onRemove,
  onSync,
  onSyncAll,
  loading,
}: AgentConfigPanelProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Agents not yet installed
  const installedTypes = new Set(agents.map((a) => a.agentType));
  const availableTypes = ALL_AGENT_TYPES.filter(
    (t) => !installedTypes.has(t.type),
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-12">
            Agent Configuration
          </h2>
          <p className="mt-1 text-sm text-gray-9">
            Configure AI agent integrations for your project.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync All */}
          {agents.length > 0 && onSyncAll && (
            <button
              type="button"
              onClick={onSyncAll}
              disabled={loading}
              className="rounded-md bg-gray-3 px-3 py-1.5 text-sm font-medium text-gray-11 hover:bg-gray-4 transition-colors disabled:opacity-50"
            >
              {loading ? 'Syncing...' : 'Sync All'}
            </button>
          )}

          {/* Add Agent dropdown */}
          {availableTypes.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="spec-button-primary"
              >
                + Add Agent
              </button>

              {dropdownOpen && (
                <>
                  {/* Click-away overlay */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-6 bg-white py-1 shadow-lg">
                    {availableTypes.map(({ type, label }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          onAdd(type);
                          setDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-11 hover:bg-gray-2"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Agent Grid */}
      {agents.length === 0 ? (
        <div className="mt-6 rounded-lg border border-gray-6 bg-gray-2 p-8 text-center">
          <p className="text-sm text-gray-9">
            No agents configured. Click &quot;Add Agent&quot; to get started.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.agentType}
              agent={agent}
              onSync={onSync}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
