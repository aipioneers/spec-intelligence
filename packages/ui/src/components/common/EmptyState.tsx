"use client";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-7 bg-gray-2 px-6 py-12 text-center ${className}`}
    >
      {icon && <div className="mb-4 text-gray-9">{icon}</div>}
      <h3 className="text-sm font-medium text-gray-12">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-9">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick} className="spec-button-primary mt-4">
          {action.label}
        </button>
      )}
    </div>
  );
}
