"use client";

import { useState, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Preset } from "../../types";
import { PresetCard } from "./PresetCard";
import { SearchInput } from "../common/SearchInput";

interface PresetBrowserProps {
  installedPresets: Preset[];
  availablePresets: Preset[];
  onInstall: (id: string) => void;
  onRemove: (id: string) => void;
  onActivate?: (id: string) => void;
}

export function PresetBrowser({
  installedPresets,
  availablePresets,
  onInstall,
  onRemove,
  onActivate,
}: PresetBrowserProps) {
  const [search, setSearch] = useState("");
  const [previewPreset, setPreviewPreset] = useState<Preset | null>(null);

  const filterPresets = (presets: Preset[]) => {
    if (!search.trim()) return presets;
    const q = search.toLowerCase().trim();
    return presets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  };

  const filteredInstalled = filterPresets(installedPresets);
  const filteredAvailable = filterPresets(availablePresets);
  const allFiltered = [...filteredInstalled, ...filteredAvailable];

  return (
    <div className="space-y-4">
      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search presets..."
      />

      {/* Installed */}
      {filteredInstalled.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-12">
            Installed ({filteredInstalled.length})
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredInstalled.map((preset) => (
              <div
                key={preset.id}
                onClick={() => setPreviewPreset(preset)}
                className="cursor-pointer"
              >
                <PresetCard
                  preset={preset}
                  isInstalled
                  onRemove={onRemove}
                  onActivate={onActivate}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available */}
      {filteredAvailable.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-12">
            Available ({filteredAvailable.length})
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAvailable.map((preset) => (
              <div
                key={preset.id}
                onClick={() => setPreviewPreset(preset)}
                className="cursor-pointer"
              >
                <PresetCard
                  preset={preset}
                  isInstalled={false}
                  onInstall={onInstall}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {allFiltered.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-9">
          {search
            ? "No presets match your search."
            : "No presets available."}
        </p>
      )}

      {/* Preview Dialog */}
      <Dialog.Root
        open={!!previewPreset}
        onOpenChange={(open) => {
          if (!open) setPreviewPreset(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-6 bg-gray-1 p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            {previewPreset && (
              <>
                <Dialog.Title className="text-lg font-semibold text-gray-12">
                  {previewPreset.name}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-gray-9">
                  {previewPreset.description}
                </Dialog.Description>

                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-9">
                    Version: {previewPreset.version}
                  </p>

                  {previewPreset.templates.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-11">
                        Templates ({previewPreset.templates.length})
                      </p>
                      <ul className="mt-2 space-y-1 rounded-md bg-gray-2 p-3">
                        {previewPreset.templates.map((tmpl) => (
                          <li
                            key={tmpl}
                            className="flex items-center gap-2 text-sm text-gray-11"
                          >
                            <svg className="h-4 w-4 text-gray-9" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            {tmpl}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <button className="spec-button-secondary">Close</button>
                  </Dialog.Close>
                  {installedPresets.some((p) => p.id === previewPreset.id) ? (
                    <button
                      onClick={() => {
                        onRemove(previewPreset.id);
                        setPreviewPreset(null);
                      }}
                      className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onInstall(previewPreset.id);
                        setPreviewPreset(null);
                      }}
                      className="spec-button-primary"
                    >
                      Install
                    </button>
                  )}
                </div>

                <Dialog.Close asChild>
                  <button
                    className="absolute right-4 top-4 rounded-sm text-gray-9 hover:text-gray-11 focus:outline-none focus:ring-2 focus:ring-accent-8"
                    aria-label="Close"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Dialog.Close>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
