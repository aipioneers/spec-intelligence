// T075: Extension and Preset service functions
// Provides listing, installation, and removal of extensions and presets.
// Uses mock data for initial implementation.

import type { Extension, ExtensionStatus, Preset } from '../types/index';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_EXTENSIONS: Extension[] = [
  {
    id: 'ext-specify-lint',
    name: 'Specify Lint',
    description: 'Lint spec files for consistency, missing fields, and structural issues.',
    version: '1.2.0',
    catalogSource: 'official',
    installedAt: '2025-12-01',
    status: 'Active',
    commands: ['specify lint', 'specify lint --fix'],
  },
  {
    id: 'ext-spec-metrics',
    name: 'Spec Metrics',
    description: 'Generate coverage and quality metrics for your specifications.',
    version: '0.9.1',
    catalogSource: 'official',
    installedAt: '2025-11-15',
    status: 'Active',
    commands: ['specify metrics', 'specify metrics --report'],
  },
  {
    id: 'ext-ai-clarify',
    name: 'AI Clarifier',
    description: 'Use AI to automatically identify ambiguous requirements and suggest clarification questions.',
    version: '2.0.0',
    catalogSource: 'community',
    installedAt: '',
    status: 'Disabled',
    commands: ['specify clarify', 'specify clarify --auto'],
  },
  {
    id: 'ext-export-pdf',
    name: 'PDF Export',
    description: 'Export specifications, plans, and task lists as formatted PDF documents.',
    version: '1.0.3',
    catalogSource: 'official',
    installedAt: '',
    status: 'Disabled',
    commands: ['specify export --pdf'],
  },
  {
    id: 'ext-jira-sync',
    name: 'Jira Sync',
    description: 'Synchronize tasks and user stories with Jira issues bidirectionally.',
    version: '0.5.0',
    catalogSource: 'community',
    installedAt: '',
    status: 'Disabled',
    commands: ['specify jira sync', 'specify jira push', 'specify jira pull'],
  },
  {
    id: 'ext-diagram-gen',
    name: 'Diagram Generator',
    description: 'Auto-generate entity-relationship and flow diagrams from specifications.',
    version: '1.1.0',
    catalogSource: 'official',
    installedAt: '',
    status: 'Disabled',
    commands: ['specify diagram'],
  },
];

const MOCK_PRESETS: Preset[] = [
  {
    id: 'preset-web-app',
    name: 'Web Application',
    description: 'Templates for full-stack web application specifications with frontend, backend, and database considerations.',
    version: '1.0.0',
    templates: ['spec-webapp.md', 'plan-webapp.md', 'tasks-webapp.md', 'checklist-webapp.md'],
    isActive: true,
  },
  {
    id: 'preset-api',
    name: 'REST API',
    description: 'Templates optimized for API-first projects with endpoint specifications and integration testing.',
    version: '1.0.0',
    templates: ['spec-api.md', 'plan-api.md', 'tasks-api.md', 'checklist-api.md'],
    isActive: false,
  },
  {
    id: 'preset-mobile',
    name: 'Mobile App',
    description: 'Cross-platform mobile application templates covering iOS and Android considerations.',
    version: '0.9.0',
    templates: ['spec-mobile.md', 'plan-mobile.md', 'tasks-mobile.md'],
    isActive: false,
  },
  {
    id: 'preset-library',
    name: 'Library / Package',
    description: 'Templates for building reusable libraries and npm/crate packages with API surface documentation.',
    version: '1.0.0',
    templates: ['spec-library.md', 'plan-library.md', 'tasks-library.md'],
    isActive: false,
  },
  {
    id: 'preset-microservice',
    name: 'Microservice',
    description: 'Templates for microservice architecture with service boundaries, contracts, and deployment specifications.',
    version: '0.8.0',
    templates: ['spec-microservice.md', 'plan-microservice.md', 'tasks-microservice.md', 'contract-microservice.md'],
    isActive: false,
  },
];

// ---------------------------------------------------------------------------
// In-memory state (mock persistence)
// ---------------------------------------------------------------------------

let installedExtensions: Extension[] = MOCK_EXTENSIONS.filter(
  (e) => e.installedAt !== '',
);
let allExtensions: Extension[] = [...MOCK_EXTENSIONS];
let installedPresets: Preset[] = MOCK_PRESETS.filter((p) => p.isActive);
let allPresets: Preset[] = [...MOCK_PRESETS];

// ---------------------------------------------------------------------------
// Extension Service Functions
// ---------------------------------------------------------------------------

export async function listExtensions(): Promise<{
  installed: Extension[];
  available: Extension[];
}> {
  const installedIds = new Set(installedExtensions.map((e) => e.id));
  return {
    installed: installedExtensions,
    available: allExtensions.filter((e) => !installedIds.has(e.id)),
  };
}

export async function installExtension(id: string): Promise<Extension> {
  const ext = allExtensions.find((e) => e.id === id);
  if (!ext) throw new Error(`Extension not found: ${id}`);

  const installed: Extension = {
    ...ext,
    installedAt: new Date().toISOString(),
    status: 'Active',
  };

  installedExtensions = [
    ...installedExtensions.filter((e) => e.id !== id),
    installed,
  ];

  return installed;
}

export async function removeExtension(id: string): Promise<boolean> {
  const exists = installedExtensions.some((e) => e.id === id);
  if (!exists) throw new Error(`Extension not installed: ${id}`);

  installedExtensions = installedExtensions.filter((e) => e.id !== id);
  return true;
}

// ---------------------------------------------------------------------------
// Preset Service Functions
// ---------------------------------------------------------------------------

export async function listPresets(): Promise<{
  installed: Preset[];
  available: Preset[];
}> {
  const installedIds = new Set(installedPresets.map((p) => p.id));
  return {
    installed: installedPresets,
    available: allPresets.filter((p) => !installedIds.has(p.id)),
  };
}

export async function installPreset(id: string): Promise<Preset> {
  const preset = allPresets.find((p) => p.id === id);
  if (!preset) throw new Error(`Preset not found: ${id}`);

  const installed: Preset = {
    ...preset,
    isActive: false,
  };

  installedPresets = [
    ...installedPresets.filter((p) => p.id !== id),
    installed,
  ];

  return installed;
}

export async function removePreset(id: string): Promise<boolean> {
  const exists = installedPresets.some((p) => p.id === id);
  if (!exists) throw new Error(`Preset not installed: ${id}`);

  installedPresets = installedPresets.filter((p) => p.id !== id);
  return true;
}
