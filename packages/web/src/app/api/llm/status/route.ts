import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
  const model = process.env.OLLAMA_MODEL ?? "glm-4.7-flash:latest";

  try {
    // Check Ollama is running
    const tagsUrl = baseUrl.replace("/v1", "") + "/api/tags";
    const res = await fetch(tagsUrl, { signal: AbortSignal.timeout(3000) });

    if (!res.ok) {
      return NextResponse.json({
        status: "error",
        message: "Ollama is not responding",
        baseUrl,
        model,
      });
    }

    const data = await res.json() as { models?: Array<{ name: string }> };
    const models = data.models?.map((m) => m.name) ?? [];
    const modelAvailable = models.some((m) => m.startsWith(model.split(":")[0]));

    return NextResponse.json({
      status: modelAvailable ? "ready" : "model_missing",
      message: modelAvailable
        ? `Ollama running, ${model} available`
        : `Ollama running but ${model} not found. Run: ollama pull ${model}`,
      baseUrl,
      model,
      availableModels: models,
    });
  } catch {
    return NextResponse.json({
      status: "offline",
      message: "Ollama is not running. Start with: ollama serve",
      baseUrl,
      model,
    });
  }
}
