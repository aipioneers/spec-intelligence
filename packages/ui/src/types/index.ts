// ── Feature Status & Priority ──────────────────────────────────────────

export type FeatureStatus =
  | "Draft"
  | "Clarifying"
  | "Planned"
  | "InProgress"
  | "Complete";

export type Priority = "P1" | "P2" | "P3";

export type TaskStatus = "Todo" | "InProgress" | "Done" | "Blocked";

export type TaskPhase = "Setup" | "Foundation" | "UserStory" | "Polish";

// ── Core Entities ──────────────────────────────────────────────────────

export interface Feature {
  number: string; // "001"
  shortName: string; // "spec-kit-ui"
  slug: string; // "001-spec-kit-ui"
  branchName: string;
  status: FeatureStatus;
  createdAt: string; // ISO date
  specPath: string;
  planPath: string | null;
  tasksPath: string | null;
  checklistPaths: string[];
  projectId?: string;
  projectName?: string;
}

export interface AcceptanceScenario {
  given: string;
  when: string;
  then: string;
}

export interface UserStory {
  number: number;
  title: string;
  priority: Priority;
  description: string;
  priorityReason: string;
  independentTest: string;
  acceptanceScenarios: AcceptanceScenario[];
}

export interface Requirement {
  id: string; // "FR-001"
  description: string;
  hasClarificationMarker: boolean;
  clarificationQuestion: string | null;
}

export interface SuccessCriterion {
  id: string; // "SC-001"
  description: string;
}

export interface Clarification {
  sessionDate: string;
  question: string;
  answer: string;
}

export interface Specification {
  title: string;
  description: string;
  userStories: UserStory[];
  edgeCases: string[];
  requirements: Requirement[];
  entities: Entity[];
  successCriteria: SuccessCriterion[];
  clarifications: Clarification[];
  assumptions: string[];
}

export interface Entity {
  name: string;
  description: string;
}

// ── Plan ───────────────────────────────────────────────────────────────

export interface TechnicalContext {
  language: string;
  dependencies: string[];
  storage: string;
  testing: string;
  targetPlatform: string;
  projectType: string;
  performanceGoals: string;
  constraints: string;
  scaleScope: string;
}

export interface ConstitutionCheckResult {
  passed: boolean;
  details: string[];
}

export interface Plan {
  summary: string;
  technicalContext: TechnicalContext;
  projectStructure: string;
  constitutionCheck: ConstitutionCheckResult;
}

// ── Task ───────────────────────────────────────────────────────────────

export interface Task {
  id: string; // "T001"
  phase: TaskPhase;
  userStoryRef: string | null;
  description: string;
  priority: Priority;
  status: TaskStatus;
  isParallel: boolean;
  dependencies: string[];
  filePaths: string[];
}

// ── Constitution ───────────────────────────────────────────────────────

export interface Principle {
  name: string;
  description: string;
  rationale: string;
}

export interface Constitution {
  principles: Principle[];
  constraints: string[];
  developmentGuidelines: string[];
  version: string;
  lastAmended: string;
}

// ── Extensions & Presets ───────────────────────────────────────────────

export type ExtensionStatus = "Active" | "Disabled";

export interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  catalogSource: string;
  installedAt: string;
  status: ExtensionStatus;
  commands: string[];
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  version: string;
  templates: string[];
  isActive: boolean;
}

// ── Agent Config ───────────────────────────────────────────────────────

export type AgentType =
  | "claude"
  | "cursor"
  | "copilot"
  | "gemini"
  | "windsurf"
  | "qwen";

export type SyncStatus = "UpToDate" | "Stale" | "NotInitialized";

export interface AgentConfig {
  agentType: AgentType;
  directoryPath: string;
  contextFilePath: string;
  commandsDir: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
}

// ── Checklist ──────────────────────────────────────────────────────────

export interface ChecklistItem {
  description: string;
  isComplete: boolean;
  category: string;
}

export interface ChecklistCategory {
  name: string;
  items: ChecklistItem[];
}

export interface Checklist {
  name: string;
  purpose: string;
  featureSlug: string;
  categories: ChecklistCategory[];
}

// ── Analysis ───────────────────────────────────────────────────────────

export type AnalysisSeverity = "error" | "warning" | "info";

export type AnalysisCategory =
  | "orphaned_requirement"
  | "missing_coverage"
  | "constitution_violation"
  | "inconsistency";

export interface AnalysisIssue {
  severity: AnalysisSeverity;
  category: AnalysisCategory;
  message: string;
  featureSlug: string;
  artifact: "spec" | "plan" | "tasks" | "constitution";
  section: string;
  line: number | null;
}

export interface AnalysisSummary {
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
}

// ── UI-specific types ──────────────────────────────────────────────────

export interface PipelinePhaseInfo {
  id: string;
  label: string;
  status: "not-started" | "in-progress" | "complete" | "blocked";
  artifact: "spec" | "plan" | "tasks" | null;
}

export interface WorkspaceSettings {
  name: string;
  theme: "light" | "dark" | "system";
  locale: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// ── Project ───────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
  createdAt: string;
  description?: string;
}

export type WorkflowStep = 'specify' | 'clarify' | 'plan' | 'tasks' | 'implement' | 'complete';

// ── File Watcher Events ───────────────────────────────────────────────

export interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted';
  path: string;
  featureSlug: string | null;
  artifact: 'spec' | 'plan' | 'tasks' | 'checklist' | 'unknown';
  timestamp: number;
}

// ── API Error ─────────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown> | null;
  };
}

// ── Type Aliases (convenience) ────────────────────────────────────────

export type ArtifactType = 'spec' | 'plan' | 'tasks' | 'checklist' | 'constitution';
export type FileChangeType = 'created' | 'modified' | 'deleted';
