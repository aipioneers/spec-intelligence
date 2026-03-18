"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useBackend, useWorkflowSteps, WorkflowStepper } from "@spec-intelligence/ui";
import type { Feature, Specification, Plan, Task } from "@spec-intelligence/ui";

export default function FeatureDetailLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const backend = useBackend();

  const [feature, setFeature] = useState<Feature | null>(null);
  const [spec, setSpec] = useState<Specification | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    backend.getFeature(slug).then((data) => {
      setFeature(data.feature);
      setSpec(data.spec);
      setPlan(data.plan);
      setTasks(data.tasks);
    });
  }, [backend, slug]);

  const { steps } = useWorkflowSteps(
    feature ?? ({ slug, number: "", shortName: "", branchName: "", status: "Draft", createdAt: "", specPath: "", planPath: null, tasksPath: null, checklistPaths: [] } as Feature),
    spec,
    plan,
    tasks,
  );

  return (
    <div>
      {feature && (
        <div className="border-b border-gray-6 bg-gray-2 px-4 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-12">{spec?.title ?? feature.slug}</h1>
              <p className="text-xs text-gray-9">{feature.slug}</p>
            </div>
            <WorkflowStepper
              steps={steps}
              onStepClick={(step) => router.push(step.href)}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
