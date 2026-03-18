"use client";

import type { Extension } from "../../types";

interface ExtensionCardProps {
  extension: Extension;
  isInstalled: boolean;
  onInstall?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function ExtensionCard({
  extension,
  isInstalled,
  onInstall,
  onRemove,
}: ExtensionCardProps) {
  return (
    <div className="spec-card flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-gray-12">
              {extension.name}
            </h3>
            <p className="mt-0.5 text-xs text-gray-9">
              {extension.catalogSource}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-gray-3 px-1.5 py-0.5 text-[10px] font-medium text-gray-11">
              v{extension.version}
            </span>
            {isInstalled && (
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  extension.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-3 text-gray-9"
                }`}
              >
                {extension.status}
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-11 line-clamp-2">
          {extension.description}
        </p>
        {extension.commands.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {extension.commands.slice(0, 3).map((cmd) => (
              <span
                key={cmd}
                className="inline-flex items-center rounded bg-accent-3 px-1.5 py-0.5 font-mono text-[10px] text-accent-11"
              >
                {cmd}
              </span>
            ))}
            {extension.commands.length > 3 && (
              <span className="text-[10px] text-gray-9">
                +{extension.commands.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-gray-6 pt-3">
        {isInstalled ? (
          <button
            onClick={() => onRemove?.(extension.id)}
            className="w-full rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={() => onInstall?.(extension.id)}
            className="spec-button-primary w-full text-xs"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
