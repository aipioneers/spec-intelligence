import type { WorkflowStepInfo } from './useWorkflowStep';

interface WorkflowStepperProps {
  steps: WorkflowStepInfo[];
  onStepClick?: (step: WorkflowStepInfo) => void;
}

export function WorkflowStepper({ steps, onStepClick }: WorkflowStepperProps) {
  return (
    <nav className="flex items-center gap-1" aria-label="Workflow progress">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <button
            onClick={() => step.status !== 'upcoming' && onStepClick?.(step)}
            disabled={step.status === 'upcoming'}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              step.status === 'active'
                ? 'bg-accent-3 text-accent-11'
                : step.status === 'complete'
                  ? 'text-green-600 hover:bg-gray-3 cursor-pointer'
                  : 'text-gray-8 cursor-default'
            }`}
            title={step.description}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.status === 'active'
                  ? 'bg-accent-9 text-white'
                  : step.status === 'complete'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-3 text-gray-8'
              }`}
            >
              {step.status === 'complete' ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                idx + 1
              )}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
          {idx < steps.length - 1 && (
            <div
              className={`mx-1 h-px w-6 ${
                step.status === 'complete' ? 'bg-green-300' : 'bg-gray-4'
              }`}
            />
          )}
        </div>
      ))}
    </nav>
  );
}
