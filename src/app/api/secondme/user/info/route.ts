import { NextResponse } from "next/server";
import { fetchSecondMe } from "@/lib/secondme";

export async function GET() {
  try {
    const data = await fetchSecondMe<unknown>("/api/secondme/user/info");
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch user info";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 401 },
    );
  }
}
