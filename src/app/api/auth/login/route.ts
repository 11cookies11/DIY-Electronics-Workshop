import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizationUrl } from "@/lib/secondme";
import { sanitizeReturnPath } from "@/lib/secondme-auth-guard";

export async function GET(request: NextRequest) {
  const returnTo = sanitizeReturnPath(request.nextUrl.searchParams.get("return_to"));
  const authUrl = new URL(buildAuthorizationUrl());
  authUrl.searchParams.set("state", returnTo);
  return NextResponse.redirect(authUrl);
}
