import { NextRequest, NextResponse } from "next/server";
import {
  listExtensions,
  installExtension,
  removeExtension,
} from "@spec-intelligence/ui";

// ---------------------------------------------------------------------------
// GET /api/extensions — list installed and available extensions
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const result = await listExtensions();
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
// POST /api/extensions — install an extension
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

    const extension = await installExtension(id);
    return NextResponse.json({ extension }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/extensions — remove an extension
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

    const success = await removeExtension(id);
    return NextResponse.json({ success }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message, details: null } },
      { status: 500 },
    );
  }
}
