"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PlanEditorClient } from "./plan-editor-client";

export default function PlanEditorPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
            <span className="text-sm text-gray-9">Loading plan editor...</span>
          </div>
        </div>
      }
    >
      <PlanEditorClient slug={slug} hasPlan={false} />
    </Suspense>
  );
}
