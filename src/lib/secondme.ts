import { cookies } from "next/headers";

const SECONDME_API_BASE_URL =
  process.env.SECONDME_API_BASE_URL ?? "https://api.mindverse.com/gate/lab";
const SECONDME_OAUTH_URL =
  process.env.SECONDME_OAUTH_URL ?? "https://go.second.me/oauth/";

const ACCESS_TOKEN_COOKIE = "secondme_access_token";
const REFRESH_TOKEN_COOKIE = "secondme_refresh_token";
const EXPIRES_AT_COOKIE = "secondme_token_expires_at";

type SecondMeTokenData = {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn: number;
  scope?: string[];
};

type SecondMeEnvelope<T> = {
  code: number;
  data: T;
  message?: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

export function getSecondMeConfig() {
  return {
    clientId: getRequiredEnv("SECONDME_CLIENT_ID"),
    clientSecret: getRequiredEnv("SECONDME_CLIENT_SECRET"),
    redirectUri: getRequiredEnv("SECONDME_REDIRECT_URI"),
    scopes: process.env.SECONDME_SCOPES ?? "user.info chat",
    apiBaseUrl: SECONDME_API_BASE_URL,
    oauthUrl: SECONDME_OAUTH_URL,
  };
}

export function buildAuthorizationUrl() {
  const config = getSecondMeConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes,
  });

  return `${config.oauthUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  const config = getSecondMeConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
    grant_type: "authorization_code",
  });

  const response = await fetch(`${config.apiBaseUrl}/api/oauth/token/code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed with status ${response.status}`);
  }

  const result = (await response.json()) as SecondMeEnvelope<SecondMeTokenData>;
  if (result.code !== 0 || !result.data?.accessToken) {
    throw new Error(result.message ?? "Token exchange returned an invalid payload");
  }

  return result.data;
}

export async function storeSecondMeTokens(tokenData: SecondMeTokenData) {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + tokenData.expiresIn * 1000;
  const common = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  cookieStore.set(ACCESS_TOKEN_COOKIE, tokenData.accessToken, common);
  cookieStore.set(REFRESH_TOKEN_COOKIE, tokenData.refreshToken, common);
  cookieStore.set(EXPIRES_AT_COOKIE, String(expiresAt), common);
}

export async function clearSecondMeTokens() {
  const cookieStore = await cookies();

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(EXPIRES_AT_COOKIE);
}

export async function getAccessToken() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const expiresAt = Number(cookieStore.get(EXPIRES_AT_COOKIE)?.value ?? "0");

  if (!accessToken || !expiresAt || Date.now() >= expiresAt) {
    return null;
  }

  return accessToken;
}

export async function fetchSecondMe<T>(path: string) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Missing or expired access token");
  }

  const response = await fetch(`${SECONDME_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`SecondMe API failed with status ${response.status}`);
  }

  const result = (await response.json()) as SecondMeEnvelope<T>;
  if (result.code !== 0) {
    throw new Error(result.message ?? "SecondMe API returned an error");
  }

  return result.data;
}
