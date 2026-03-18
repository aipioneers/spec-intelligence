// Types
export * from "./types";

// Stores
export { useFeatureStore } from "./stores/feature-store";
export type { FeatureStoreState } from "./stores/feature-store";
export { useEditorStore } from "./stores/editor-store";
export type {
  EditorStoreState,
  EditorMode,
  ArtifactType as EditorArtifactType,
  DocumentState,
} from "./stores/editor-store";
export { useKanbanStore } from "./stores/kanban-store";
export type { KanbanStoreState } from "./stores/kanban-store";
export { useProjectStore } from "./stores/project-store";
export type { ProjectStoreState } from "./stores/project-store";

// Lib — adapters
export type { BackendAdapter } from "./lib/backend-adapter";
export { createRestAdapter } from "./lib/rest-adapter";
// Note: createTauriAdapter is NOT re-exported here to avoid pulling in
// @tauri-apps/api in web builds. Import directly from the desktop package.

// Note: pickFolder is re-exported for desktop builds. In web builds, it will
// throw at runtime if called (dynamic import of @tauri-apps/plugin-dialog fails).
export { pickFolder } from "./lib/tauri-adapter";

// Lib — feature discovery (server-only, uses node:fs)
// discoverFeatures is NOT re-exported to avoid bundling Node.js modules in
// the client. Import directly from "@spec-intelligence/ui/lib/features" on the server.

// Hooks
export { useBackend } from "./hooks/useBackend";
export { useFileWatcher } from "./hooks/useFileWatcher";
export type { FileWatcherState } from "./hooks/useFileWatcher";
export { useFileWatcherIntegration } from "./hooks/useFileWatcherIntegration";
export type { Toast } from "./hooks/useFileWatcherIntegration";

// Components — common
export { StatusBadge } from "./components/common/StatusBadge";
export { SearchInput } from "./components/common/SearchInput";
export { EmptyState } from "./components/common/EmptyState";
export { LoadingSpinner } from "./components/common/LoadingSpinner";
export { ErrorBoundary } from "./components/common/ErrorBoundary";

// Components — dashboard
export { FeatureCard } from "./components/dashboard/FeatureCard";
export { FeatureList } from "./components/dashboard/FeatureList";
export { NewFeatureDialog } from "./components/dashboard/NewFeatureDialog";
export { DashboardStats } from "./components/dashboard/DashboardStats";
export { RecentActivity } from "./components/dashboard/RecentActivity";

// Components — constitution
export { ConstitutionSummary } from "./components/constitution/ConstitutionSummary";
export { ConstitutionEditor } from "./components/constitution/ConstitutionEditor";

// Components — extensions
export { ExtensionCard } from "./components/extensions/ExtensionCard";
export { ExtensionBrowser } from "./components/extensions/ExtensionBrowser";
export { PresetCard } from "./components/extensions/PresetCard";
export { PresetBrowser } from "./components/extensions/PresetBrowser";

// Lib — extensions
export {
  listExtensions,
  installExtension,
  removeExtension,
  listPresets,
  installPreset,
  removePreset,
} from "./lib/extensions";

// Components — pipeline
export { PipelinePhase } from "./components/pipeline/PipelinePhase";
export { PipelineConnector } from "./components/pipeline/PipelineConnector";
export { Pipeline, derivePhases } from "./components/pipeline/Pipeline";
export { usePipelineNavigation } from "./components/pipeline/usePipelineNavigation";
export { GeneratePlanButton } from "./components/pipeline/GeneratePlanButton";

// Components — clarification
export { ClarificationDialog } from "./components/clarification/ClarificationDialog";
export { ClarificationHistory } from "./components/clarification/ClarificationHistory";
export { useClarificationResolve } from "./components/clarification/useClarificationResolve";

// Components — checklist
export { ChecklistViewer } from "./components/common/ChecklistViewer";

// Components — conflict
export { ConflictResolver } from "./components/common/ConflictResolver";

// Components — editor
export { SpecEditor } from "./components/editor/SpecEditor";
export { PlanEditor } from "./components/editor/PlanEditor";

// Components — features
export { BoardView } from "./components/features/BoardView";

// Components — kanban
export { KanbanBoard } from "./components/kanban/KanbanBoard";
export { KanbanColumn } from "./components/kanban/KanbanColumn";
export { TaskCard, TaskCardOverlay } from "./components/kanban/TaskCard";
export { DependencyOverlay } from "./components/kanban/DependencyOverlay";
export { useKanbanSync } from "./components/kanban/useKanbanSync";
export {
  ClarificationMarkerExtension,
  ClarificationMarkerInline,
  CLARIFICATION_MARKER_REGEX,
} from "./components/editor/nodes/ClarificationMarker";

// Components — github
export { IssuePreview } from "./components/github/IssuePreview";
export { ExportToGitHubDialog } from "./components/github/ExportToGitHubDialog";
export { useIssueExport } from "./components/github/useIssueExport";

// Components — workflow
export { WorkflowStepper } from "./components/workflow/WorkflowStepper";
export { useWorkflowSteps, deriveWorkflowStep } from "./components/workflow/useWorkflowStep";
export type { WorkflowStepInfo } from "./components/workflow/useWorkflowStep";

// Components — agents
export { AgentCard } from "./components/agents/AgentCard";
export { AgentConfigPanel } from "./components/agents/AgentConfigPanel";

// Components — analysis
export { AnalysisReport } from "./components/analysis/AnalysisReport";

// Lib — github
export {
  taskToIssuePayload,
  generateLabels,
  buildExportPreview,
} from "./lib/github";
export type {
  GitHubIssue,
  ExportPreview,
  ExportResult,
  ExportProgress,
} from "./lib/github";

// Lib — agents
export {
  AGENT_DIRECTORIES,
  buildAgentConfig,
  getAllAgentTypes,
  getAgentDisplayName,
} from "./lib/agents";

// Lib — analysis
export { analyzeFeature, analyzeAllFeatures } from "./lib/analysis/analyzer";
export { checkRequirementCoverage } from "./lib/analysis/requirement-coverage";
export { checkConstitutionCompliance } from "./lib/analysis/constitution-checker";
export { checkConsistency } from "./lib/analysis/consistency-checker";
export type { AnalysisInput, AnalysisResult } from "./lib/analysis/analyzer";

// i18n
export { locales, defaultLocale, localeNames, getMessages, isValidLocale } from "./i18n";
export type { Locale } from "./i18n";
