import { NextResponse } from "next/server";
import { clearSecondMeTokens } from "@/lib/secondme";

export async function POST() {
  await clearSecondMeTokens();
  return NextResponse.json({ ok: true });
}
