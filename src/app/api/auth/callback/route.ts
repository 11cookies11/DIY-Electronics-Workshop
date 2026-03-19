import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, storeSecondMeTokens } from "@/lib/secondme";
import { sanitizeReturnPath } from "@/lib/secondme-auth-guard";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const returnTo = sanitizeReturnPath(request.nextUrl.searchParams.get("state"));

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=missing_code", request.url),
    );
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    await storeSecondMeTokens(tokenData);
    const targetUrl = new URL(returnTo, request.url);
    targetUrl.searchParams.set("connected", "1");
    return NextResponse.redirect(targetUrl);
  } catch (callbackError) {
    const message =
      callbackError instanceof Error ? callbackError.message : "callback_failed";

    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
