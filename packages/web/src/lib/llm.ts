/**
 * LLM Service — connects to Ollama (OpenAI-compatible API) for AI-powered
 * plan and task generation.
 *
 * Default: http://localhost:11434/v1/chat/completions (Ollama)
 * Model: configurable via OLLAMA_MODEL env var (default: glm4:latest)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

interface LLMConfig {
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getConfig(): LLMConfig {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    model: process.env.OLLAMA_MODEL ?? "glm-4.7-flash:latest",
    temperature: parseFloat(process.env.OLLAMA_TEMPERATURE ?? "0.7"),
    maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS ?? "4096", 10),
  };
}

// ---------------------------------------------------------------------------
// Core chat function
// ---------------------------------------------------------------------------

export async function chat(
  messages: ChatMessage[],
  options?: Partial<LLMConfig>,
): Promise<string> {
  const config = { ...getConfig(), ...options };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Ollama API error (${response.status}): ${text}`,
    );
  }

  const data = (await response.json()) as LLMResponse;
  return data.choices[0]?.message?.content ?? "";
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function isOllamaAvailable(): Promise<boolean> {
  const config = getConfig();
  try {
    const res = await fetch(`${config.baseUrl.replace("/v1", "")}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Plan generation
// ---------------------------------------------------------------------------

export async function generatePlanFromSpec(
  specContent: string,
  slug: string,
): Promise<string> {
  const title = slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a software architect creating an implementation plan.
Output ONLY valid markdown. The plan must include these sections:
# Implementation Plan: ${title}

(1-2 paragraph summary)

## Technical Context
**Language**: ...
**Dependencies**: ...
**Storage**: ...
**Testing**: ...
**Target Platform**: ...
**Project Type**: ...
**Performance Goals**: ...
**Constraints**: ...
**Scale/Scope**: ...

## Project Structure
\`\`\`
(directory tree)
\`\`\`

## Implementation Phases
(numbered phases with descriptions)

## Constitution Check
Status: PASS
- (compliance notes)`,
    },
    {
      role: "user",
      content: `Create an implementation plan for this specification:\n\n${specContent}`,
    },
  ];

  return chat(messages);
}

// ---------------------------------------------------------------------------
// Task generation
// ---------------------------------------------------------------------------

export async function generateTasksFromPlan(
  specContent: string,
  planContent: string,
  slug: string,
): Promise<string> {
  const title = slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a project manager creating implementation tasks from a plan.
Output ONLY valid markdown in this exact format:

# Tasks: ${title}

## Phase: Setup
- [ ] **T001** (Phase: Setup, P1): Description [files: path/to/file]
- [ ] **T002** (Phase: Setup, P1, [P]): Description [depends: T001]

## Phase: Foundation
- [ ] **T003** (Phase: Foundation, P1): Description [depends: T001]

## Phase: UserStory
- [ ] **T004** (Phase: UserStory, US: US1, P1): Description [depends: T003]

## Phase: Polish
- [ ] **T005** (Phase: Polish, P2, [P]): Description [depends: T004]

Rules:
- Use sequential IDs (T001, T002, ...)
- Mark parallel tasks with [P]
- Include file paths in [files: ...] when known
- Include dependencies in [depends: ...]
- Set priorities: P1 (critical), P2 (important), P3 (nice-to-have)
- Create 10-30 tasks depending on complexity
- Group by phase: Setup → Foundation → UserStory → Polish`,
    },
    {
      role: "user",
      content: `Create implementation tasks based on this specification and plan:

## Specification:
${specContent}

## Plan:
${planContent}`,
    },
  ];

  return chat(messages, { maxTokens: 8192 });
}
