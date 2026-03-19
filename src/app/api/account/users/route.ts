import { NextResponse } from "next/server";
import { searchUsers } from "@/lib/user-data-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const limit = Number(searchParams.get("limit") ?? "20");

  const users = searchUsers({
    q,
    limit: Number.isFinite(limit) ? limit : 20,
  });

  return NextResponse.json({
    ok: true,
    total: users.length,
    data: users,
  });
}
