import { NextResponse } from "next/server";
import { searchInteractions } from "@/lib/user-data-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim() || undefined;
  const sessionId = searchParams.get("sessionId")?.trim() || undefined;
  const q = searchParams.get("q")?.trim() || undefined;
  const limit = Number(searchParams.get("limit") ?? "50");

  const interactions = searchInteractions({
    userId,
    sessionId,
    q,
    limit: Number.isFinite(limit) ? limit : 50,
  });

  return NextResponse.json({
    ok: true,
    total: interactions.length,
    data: interactions,
  });
}
