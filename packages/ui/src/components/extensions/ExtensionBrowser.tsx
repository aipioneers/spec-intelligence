"use client";

import { useState, useMemo } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import type { Extension } from "../../types";
import { ExtensionCard } from "./ExtensionCard";
import { SearchInput } from "../common/SearchInput";

interface ExtensionBrowserProps {
  installedExtensions: Extension[];
  availableExtensions: Extension[];
  onInstall: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ExtensionBrowser({
  installedExtensions,
  availableExtensions,
  onInstall,
  onRemove,
}: ExtensionBrowserProps) {
  const [search, setSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<string>("All");

  const catalogs = useMemo(() => {
    const sources = new Set<string>();
    for (const ext of [...installedExtensions, ...availableExtensions]) {
      sources.add(ext.catalogSource);
    }
    return ["All", ...Array.from(sources).sort()];
  }, [installedExtensions, availableExtensions]);

  const filterExtensions = (extensions: Extension[]) => {
    let result = extensions;

    if (catalogFilter !== "All") {
      result = result.filter((e) => e.catalogSource === catalogFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q),
      );
    }

    return result;
  };

  const filteredInstalled = filterExtensions(installedExtensions);
  const filteredAvailable = filterExtensions(availableExtensions);

  return (
    <div className="space-y-4">
      {/* Search and filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search extensions..."
          className="flex-1"
        />
        <select
          value={catalogFilter}
          onChange={(e) => setCatalogFilter(e.target.value)}
          className="spec-input min-w-[160px]"
        >
          {catalogs.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "All" ? "All Sources" : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="installed">
        <Tabs.List className="flex gap-1 border-b border-gray-6">
          <Tabs.Trigger
            value="installed"
            className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-9 transition-colors hover:text-gray-11 data-[state=active]:border-accent-9 data-[state=active]:text-gray-12"
          >
            Installed ({filteredInstalled.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="available"
            className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-9 transition-colors hover:text-gray-11 data-[state=active]:border-accent-9 data-[state=active]:text-gray-12"
          >
            Available ({filteredAvailable.length})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="installed" className="mt-4">
          {filteredInstalled.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredInstalled.map((ext) => (
                <ExtensionCard
                  key={ext.id}
                  extension={ext}
                  isInstalled
                  onRemove={onRemove}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-9">
              {search || catalogFilter !== "All"
                ? "No installed extensions match your filters."
                : "No extensions installed yet."}
            </p>
          )}
        </Tabs.Content>

        <Tabs.Content value="available" className="mt-4">
          {filteredAvailable.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAvailable.map((ext) => (
                <ExtensionCard
                  key={ext.id}
                  extension={ext}
                  isInstalled={false}
                  onInstall={onInstall}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-9">
              {search || catalogFilter !== "All"
                ? "No available extensions match your filters."
                : "No extensions available."}
            </p>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
