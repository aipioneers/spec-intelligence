import { useMemo } from 'react';
import type { Feature, Specification, Plan, Task, WorkflowStep } from '../../types';

export interface WorkflowStepInfo {
  id: WorkflowStep;
  label: string;
  description: string;
  status: 'complete' | 'active' | 'upcoming';
  href: string;
}

export function deriveWorkflowStep(
  feature: Feature,
  spec: Specification | null,
  plan: Plan | null,
  tasks: Task[] | null,
): WorkflowStep {
  if (!spec || (!spec.userStories.length && !spec.requirements.length)) {
    return 'specify';
  }
  if (spec.requirements.some((r) => r.hasClarificationMarker)) {
    return 'clarify';
  }
  if (!plan) {
    return 'plan';
  }
  if (!tasks || tasks.length === 0) {
    return 'tasks';
  }
  const allDone = tasks.every((t) => t.status === 'Done');
  if (allDone) {
    return 'complete';
  }
  return 'implement';
}

const STEPS: { id: WorkflowStep; label: string; description: string }[] = [
  { id: 'specify', label: 'Specify', description: 'Define user stories and requirements' },
  { id: 'clarify', label: 'Clarify', description: 'Resolve open questions' },
  { id: 'plan', label: 'Plan', description: 'Create implementation plan' },
  { id: 'tasks', label: 'Tasks', description: 'Break down into actionable tasks' },
  { id: 'implement', label: 'Implement', description: 'Execute tasks to completion' },
];

export function useWorkflowSteps(
  feature: Feature,
  spec: Specification | null,
  plan: Plan | null,
  tasks: Task[] | null,
): { steps: WorkflowStepInfo[]; currentStep: WorkflowStep } {
  return useMemo(() => {
    const current = deriveWorkflowStep(feature, spec, plan, tasks);
    const currentIdx = STEPS.findIndex((s) => s.id === current);

    const steps: WorkflowStepInfo[] = STEPS.map((step, idx) => ({
      ...step,
      status:
        current === 'complete'
          ? 'complete' as const
          : idx < currentIdx
            ? 'complete' as const
            : idx === currentIdx
              ? 'active' as const
              : 'upcoming' as const,
      href: `/features/${feature.slug}/${step.id === 'specify' ? 'spec' : step.id === 'implement' ? 'tasks' : step.id}`,
    }));

    return { steps, currentStep: current };
  }, [feature, spec, plan, tasks]);
}
