// T081: Issue preview table — shows task-to-issue mapping with selection
"use client";

import { useCallback } from 'react';
import type { Task } from '../../types/index';
import { generateLabels, taskToIssuePayload } from '../../lib/github';

interface IssuePreviewProps {
  tasks: Task[];
  featureSlug: string;
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
}

export function IssuePreview({
  tasks,
  featureSlug,
  selected,
  onSelectionChange,
}: IssuePreviewProps) {
  const allSelected = tasks.length > 0 && selected.length === tasks.length;
  const someSelected = selected.length > 0 && selected.length < tasks.length;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(tasks.map((t) => t.id));
    }
  }, [allSelected, tasks, onSelectionChange]);

  const toggleTask = useCallback(
    (taskId: string) => {
      if (selected.includes(taskId)) {
        onSelectionChange(selected.filter((id) => id !== taskId));
      } else {
        onSelectionChange([...selected, taskId]);
      }
    },
    [selected, onSelectionChange],
  );

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-gray-6 bg-gray-2 p-6 text-center text-sm text-gray-9">
        No tasks available for export.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-6">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-6 bg-gray-2">
          <tr>
            <th className="w-10 px-3 py-2 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-gray-6"
                aria-label="Select all tasks"
              />
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-11">
              Task ID
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-11">
              Description
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-11">
              Issue Title
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-11">
              Labels
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-11">
              Body Preview
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-4">
          {tasks.map((task) => {
            const issue = taskToIssuePayload(task, featureSlug);
            const isSelected = selected.includes(task.id);

            return (
              <tr
                key={task.id}
                className={`transition-colors ${
                  isSelected ? 'bg-accent-3' : 'hover:bg-gray-2'
                }`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTask(task.id)}
                    className="h-4 w-4 rounded border-gray-6"
                    aria-label={`Select task ${task.id}`}
                  />
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-11">
                  {task.id}
                </td>
                <td className="max-w-[200px] truncate px-3 py-2 text-gray-12">
                  {task.description}
                </td>
                <td className="max-w-[200px] truncate px-3 py-2 text-gray-12">
                  {issue.title}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {issue.labels.map((label) => (
                      <span
                        key={label}
                        className="inline-flex rounded-full bg-gray-3 px-2 py-0.5 text-xs text-gray-11"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="max-w-[160px] truncate px-3 py-2 text-xs text-gray-9">
                  {issue.body.slice(0, 80)}...
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="border-t border-gray-6 bg-gray-2 px-3 py-2 text-xs text-gray-9">
        {selected.length} of {tasks.length} tasks selected
      </div>
    </div>
  );
}
