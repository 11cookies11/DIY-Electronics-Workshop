import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, storeSecondMeTokens } from "@/lib/secondme";
import { sanitizeReturnPath } from "@/lib/secondme-auth-guard";

function buildAppUrl(pathname: string, request: NextRequest) {
  const configuredRedirectUri = process.env.SECONDME_REDIRECT_URI;

  if (configuredRedirectUri) {
    const configuredBaseUrl = new URL(configuredRedirectUri);
    return new URL(pathname, configuredBaseUrl);
  }

  return new URL(pathname, request.url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const returnTo = sanitizeReturnPath(request.nextUrl.searchParams.get("state"));

  if (error) {
    return NextResponse.redirect(
      buildAppUrl(`/?error=${encodeURIComponent(error)}`, request),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      buildAppUrl("/?error=missing_code", request),
    );
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    await storeSecondMeTokens(tokenData);
    const targetUrl = buildAppUrl(returnTo, request);
    targetUrl.searchParams.set("connected", "1");
    return NextResponse.redirect(targetUrl);
  } catch (callbackError) {
    const message =
      callbackError instanceof Error ? callbackError.message : "callback_failed";

    return NextResponse.redirect(
      buildAppUrl(`/?error=${encodeURIComponent(message)}`, request),
    );
  }
}
