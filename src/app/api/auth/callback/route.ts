import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, storeSecondMeTokens } from "@/lib/secondme";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

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
    return NextResponse.redirect(new URL("/?connected=1", request.url));
  } catch (callbackError) {
    const message =
      callbackError instanceof Error ? callbackError.message : "callback_failed";

    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
