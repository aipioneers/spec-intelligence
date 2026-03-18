import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();
    if (!path) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Path is required" } },
        { status: 400 },
      );
    }
    const isProject = existsSync(join(path, "specs"));
    return NextResponse.json({ isProject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
