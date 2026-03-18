// T089: Agent settings page — load agents from API and manage them
"use client";

import { useEffect, useState, useCallback } from 'react';
import { AgentConfigPanel } from '@spec-intelligence/ui';
import type { AgentConfig, AgentType } from '@spec-intelligence/ui';

export default function AgentsSettingsPage() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load agents on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/agents');
        if (!res.ok) throw new Error('Failed to load agents');
        const data = await res.json();
        setAgents(data.agents ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleAdd = useCallback(async (agentType: AgentType) => {
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType }),
      });
      if (!res.ok) throw new Error('Failed to add agent');
      const data = await res.json();
      setAgents((prev) => [...prev, data.agent]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add agent');
    }
  }, []);

  const handleRemove = useCallback(async (agentType: AgentType) => {
    try {
      const res = await fetch('/api/agents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType }),
      });
      if (!res.ok) throw new Error('Failed to remove agent');
      setAgents((prev) => prev.filter((a) => a.agentType !== agentType));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove agent');
    }
  }, []);

  const handleSync = useCallback(async (agentType: AgentType) => {
    try {
      const res = await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType }),
      });
      if (!res.ok) throw new Error('Failed to sync agent');
      const data = await res.json();
      setAgents((prev) =>
        prev.map((a) =>
          a.agentType === agentType ? data.agent : a,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync agent');
    }
  }, []);

  const handleSyncAll = useCallback(async () => {
    setSyncing(true);
    try {
      for (const agent of agents) {
        await handleSync(agent.agentType);
      }
    } finally {
      setSyncing(false);
    }
  }, [agents, handleSync]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-3 border-t-accent-9" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <AgentConfigPanel
        agents={agents}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onSync={handleSync}
        onSyncAll={handleSyncAll}
        loading={syncing}
      />
    </div>
  );
}
