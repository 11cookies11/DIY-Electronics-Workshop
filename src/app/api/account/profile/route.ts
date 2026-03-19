import { NextResponse } from "next/server";
import { fetchSecondMe } from "@/lib/secondme";
import { getAccountProfile, saveAccountProfile, type AccountProfile } from "@/lib/account-profile";

type PatchBody = {
  profile?: Partial<AccountProfile>;
};

export async function GET() {
  try {
    const userInfo = await fetchSecondMe<Record<string, unknown>>("/api/secondme/user/info");
    const result = await getAccountProfile(userInfo);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load account profile";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PatchBody;
    const patch = body.profile ?? {};
    const userInfo = await fetchSecondMe<Record<string, unknown>>("/api/secondme/user/info");
    const result = await saveAccountProfile(userInfo, patch);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save account profile";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
