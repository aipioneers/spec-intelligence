"use client";

import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import type { Constitution } from "../../types";

interface ConstitutionSummaryProps {
  constitution: Constitution | null;
}

function PrincipleCard({
  name,
  description,
  rationale,
}: {
  name: string;
  description: string;
  rationale: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger asChild>
        <button className="flex w-full items-center justify-between rounded-md border border-gray-6 bg-gray-2 px-3 py-2 text-left transition-colors hover:bg-gray-3 focus:outline-none focus:ring-2 focus:ring-accent-8">
          <span className="text-sm font-medium text-gray-12">{name}</span>
          <svg
            className={`h-4 w-4 text-gray-9 transition-transform ${open ? "rotate-180" : ""}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <div className="border-x border-b border-gray-6 bg-gray-1 px-3 py-2 text-sm">
          <p className="text-gray-11">{description}</p>
          {rationale && (
            <div className="mt-2 rounded-md bg-gray-3 px-2 py-1.5">
              <p className="text-xs font-medium text-gray-9">Rationale</p>
              <p className="mt-0.5 text-xs text-gray-11">{rationale}</p>
            </div>
          )}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export function ConstitutionSummary({ constitution }: ConstitutionSummaryProps) {
  if (!constitution) {
    return (
      <div className="spec-card">
        <h3 className="text-sm font-semibold text-gray-12">Constitution</h3>
        <p className="mt-2 text-sm text-gray-9">
          No constitution defined. Create one in Settings to establish project principles.
        </p>
      </div>
    );
  }

  return (
    <div className="spec-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-12">Constitution</h3>
        {constitution.version && (
          <span className="inline-flex items-center rounded-full bg-gray-3 px-2 py-0.5 text-[10px] font-medium text-gray-11">
            v{constitution.version}
          </span>
        )}
      </div>

      {/* Principles */}
      {constitution.principles.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-gray-9">Core Principles</p>
          {constitution.principles.map((principle) => (
            <PrincipleCard
              key={principle.name}
              name={principle.name}
              description={principle.description}
              rationale={principle.rationale}
            />
          ))}
        </div>
      )}

      {/* Constraints */}
      {constitution.constraints.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-9">Constraints</p>
          <ul className="mt-1.5 space-y-1">
            {constitution.constraints.map((constraint, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-11">
                <span className="mt-1.5 block h-1 w-1 flex-shrink-0 rounded-full bg-gray-9" />
                {constraint}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
