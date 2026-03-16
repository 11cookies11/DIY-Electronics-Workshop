import { NextResponse } from "next/server";
import { getSecondMeConnectionState } from "@/lib/secondme";

export async function GET() {
  const state = await getSecondMeConnectionState();
  return NextResponse.json(state);
}
