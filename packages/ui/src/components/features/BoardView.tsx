import type { Feature, FeatureStatus } from '../../types';

const STATUS_COLUMNS: { status: FeatureStatus; label: string; color: string }[] = [
  { status: 'Draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { status: 'Clarifying', label: 'Clarifying', color: 'bg-amber-100 text-amber-700' },
  { status: 'Planned', label: 'Planned', color: 'bg-blue-100 text-blue-700' },
  { status: 'InProgress', label: 'In Progress', color: 'bg-purple-100 text-purple-700' },
  { status: 'Complete', label: 'Complete', color: 'bg-green-100 text-green-700' },
];

function BoardCard({
  feature,
  showProject,
  onClick,
}: {
  feature: Feature;
  showProject: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-gray-6 bg-white p-3 text-left shadow-sm transition-colors hover:border-accent-8 hover:shadow-md"
    >
      <div className="text-sm font-medium text-gray-12">{feature.shortName}</div>
      <div className="mt-0.5 text-xs text-gray-9">{feature.slug}</div>
      {showProject && feature.projectName && (
        <div className="mt-1.5">
          <span className="inline-flex items-center rounded-full bg-accent-3 px-2 py-0.5 text-xs font-medium text-accent-11">
            {feature.projectName}
          </span>
        </div>
      )}
    </button>
  );
}

export function BoardView({
  features,
  groupBy,
  onFeatureClick,
}: {
  features: Feature[];
  groupBy: 'status' | 'project';
  onFeatureClick: (feature: Feature) => void;
}) {
  if (groupBy === 'status') {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map((col) => {
          const items = features.filter((f) => f.status === col.status);
          return (
            <div key={col.status} className="flex w-64 shrink-0 flex-col">
              <div className="mb-3 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs text-gray-9">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((f) => (
                  <BoardCard
                    key={`${f.projectId ?? 'default'}-${f.slug}`}
                    feature={f}
                    showProject={true}
                    onClick={() => onFeatureClick(f)}
                  />
                ))}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-6 py-8 text-center text-xs text-gray-8">
                    No features
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Group by project
  const projectMap = new Map<string, { name: string; features: Feature[] }>();
  for (const f of features) {
    const key = f.projectId ?? 'unknown';
    const name = f.projectName ?? 'Unknown Project';
    if (!projectMap.has(key)) {
      projectMap.set(key, { name, features: [] });
    }
    projectMap.get(key)!.features.push(f);
  }

  const projects = Array.from(projectMap.entries());

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {projects.map(([id, { name, features: items }]) => (
        <div key={id} className="flex w-64 shrink-0 flex-col">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-accent-3 px-2.5 py-0.5 text-xs font-semibold text-accent-11">
              {name}
            </span>
            <span className="text-xs text-gray-9">{items.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {items.map((f) => (
              <BoardCard
                key={f.slug}
                feature={f}
                showProject={false}
                onClick={() => onFeatureClick(f)}
              />
            ))}
          </div>
        </div>
      ))}
      {projects.length === 0 && (
        <div className="w-full rounded-lg border border-dashed border-gray-6 py-12 text-center text-sm text-gray-8">
          No features found across projects
        </div>
      )}
    </div>
  );
}
