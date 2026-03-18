import { NextRequest, NextResponse } from "next/server";
import {
  listPresets,
  installPreset,
  removePreset,
} from "@spec-intelligence/ui";

// ---------------------------------------------------------------------------
// GET /api/presets — list installed and available presets
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const result = await listPresets();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/presets — install a preset
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body as { id: string };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "id is required",
            details: null,
          },
        },
        { status: 400 },
      );
    }

    const preset = await installPreset(id);
    return NextResponse.json({ preset }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/presets — remove a preset
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "id query parameter is required",
            details: null,
          },
        },
        { status: 400 },
      );
    }

    const success = await removePreset(id);
    return NextResponse.json({ success }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}
