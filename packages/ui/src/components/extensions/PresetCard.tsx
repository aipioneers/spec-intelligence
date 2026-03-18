"use client";

import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import type { Preset } from "../../types";

interface PresetCardProps {
  preset: Preset;
  isInstalled: boolean;
  onInstall?: (id: string) => void;
  onRemove?: (id: string) => void;
  onActivate?: (id: string) => void;
}

export function PresetCard({
  preset,
  isInstalled,
  onInstall,
  onRemove,
  onActivate,
}: PresetCardProps) {
  const [templatesOpen, setTemplatesOpen] = useState(false);

  return (
    <div className="spec-card flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-gray-12">
              {preset.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-gray-3 px-1.5 py-0.5 text-[10px] font-medium text-gray-11">
              v{preset.version}
            </span>
            {preset.templates.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-accent-3 px-1.5 py-0.5 text-[10px] font-medium text-accent-11">
                {preset.templates.length} templates
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-11 line-clamp-2">
          {preset.description}
        </p>

        {/* Template list (collapsible) */}
        {preset.templates.length > 0 && (
          <Collapsible.Root
            open={templatesOpen}
            onOpenChange={setTemplatesOpen}
          >
            <Collapsible.Trigger asChild>
              <button className="mt-2 flex items-center gap-1 text-xs font-medium text-accent-11 hover:text-accent-12">
                <svg
                  className={`h-3 w-3 transition-transform ${templatesOpen ? "rotate-90" : ""}`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
                {templatesOpen ? "Hide" : "Show"} templates
              </button>
            </Collapsible.Trigger>
            <Collapsible.Content className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
              <ul className="mt-2 space-y-1 rounded-md bg-gray-2 p-2">
                {preset.templates.map((tmpl) => (
                  <li
                    key={tmpl}
                    className="flex items-center gap-1.5 text-xs text-gray-11"
                  >
                    <svg className="h-3 w-3 text-gray-9" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    {tmpl}
                  </li>
                ))}
              </ul>
            </Collapsible.Content>
          </Collapsible.Root>
        )}
      </div>

      <div className="mt-3 border-t border-gray-6 pt-3">
        {isInstalled ? (
          <div className="flex gap-2">
            {!preset.isActive && onActivate && (
              <button
                onClick={() => onActivate(preset.id)}
                className="flex-1 rounded-md border border-accent-7 bg-white px-3 py-1.5 text-xs font-medium text-accent-11 transition-colors hover:bg-accent-3"
              >
                Activate
              </button>
            )}
            {preset.isActive && (
              <span className="flex-1 rounded-md bg-green-50 px-3 py-1.5 text-center text-xs font-medium text-green-700">
                Active
              </span>
            )}
            <button
              onClick={() => onRemove?.(preset.id)}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => onInstall?.(preset.id)}
            className="spec-button-primary w-full text-xs"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
