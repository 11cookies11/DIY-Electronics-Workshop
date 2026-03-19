import { NextResponse } from "next/server";
import { listSessions } from "@/lib/user-data-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim() || undefined;
  const limit = Number(searchParams.get("limit") ?? "100");

  const sessions = listSessions({
    userId,
    limit: Number.isFinite(limit) ? limit : 100,
  });

  return NextResponse.json({
    ok: true,
    total: sessions.length,
    data: sessions,
  });
}
