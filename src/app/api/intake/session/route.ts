import { NextResponse } from "next/server";
import { getSessionRecord } from "@/lib/intake/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId")?.trim();

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }

  const record = getSessionRecord(sessionId);

  if (!record) {
    return NextResponse.json(
      { error: "session not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    sessionId: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    state: record.state,
    result: record.lastOutput ?? null,
    projectRecord: record.projectRecord ?? null,
  });
}
