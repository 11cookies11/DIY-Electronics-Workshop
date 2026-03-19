import { getStoredUserProfile, upsertUserProfile } from "./user-data-db";

type JsonObject = Record<string, unknown>;

export type AccountProfile = {
  display_name: string;
  email: string;
  phone: string;
  company: string;
  role_title: string;
  timezone: string;
  notes: string;
};

const EMPTY_PROFILE: AccountProfile = {
  display_name: "",
  email: "",
  phone: "",
  company: "",
  role_title: "",
  timezone: "Asia/Shanghai",
  notes: "",
};

function asNonEmptyString(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized.length ? normalized : "";
}

function normalizeProfilePatch(patch: Partial<AccountProfile>): AccountProfile {
  return {
    display_name: asNonEmptyString(patch.display_name),
    email: asNonEmptyString(patch.email),
    phone: asNonEmptyString(patch.phone),
    company: asNonEmptyString(patch.company),
    role_title: asNonEmptyString(patch.role_title),
    timezone: asNonEmptyString(patch.timezone) || "Asia/Shanghai",
    notes: asNonEmptyString(patch.notes),
  };
}

function getCandidate(userInfo: JsonObject, keys: string[]) {
  for (const key of keys) {
    const value = userInfo[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

export function deriveSecondMeUserId(userInfo: JsonObject) {
  const id = getCandidate(userInfo, [
    "user_id",
    "userId",
    "uid",
    "open_id",
    "openId",
    "id",
    "username",
  ]);
  if (!id) {
    throw new Error("Cannot derive user id from Second Me user info");
  }
  return id;
}

function buildDefaultProfile(userInfo: JsonObject): AccountProfile {
  return {
    ...EMPTY_PROFILE,
    display_name:
      getCandidate(userInfo, ["nickname", "name", "display_name", "username"]) || EMPTY_PROFILE.display_name,
    email: getCandidate(userInfo, ["email", "mail"]) || EMPTY_PROFILE.email,
    phone: getCandidate(userInfo, ["phone", "mobile"]) || EMPTY_PROFILE.phone,
    company: getCandidate(userInfo, ["company", "organization"]) || EMPTY_PROFILE.company,
    role_title: getCandidate(userInfo, ["title", "role"]) || EMPTY_PROFILE.role_title,
  };
}

export async function getAccountProfile(userInfo: JsonObject) {
  const userId = deriveSecondMeUserId(userInfo);
  const stored = getStoredUserProfile(userId);
  const defaults = buildDefaultProfile(userInfo);
  const profile: AccountProfile = stored
    ? {
        ...defaults,
        display_name: stored.display_name || defaults.display_name,
        email: stored.email || defaults.email,
        phone: stored.phone || defaults.phone,
        company: stored.company || defaults.company,
        role_title: stored.role_title || defaults.role_title,
        timezone: stored.timezone || defaults.timezone,
        notes: stored.notes || defaults.notes,
      }
    : defaults;

  upsertUserProfile({
    userId,
    profile,
    rawUserInfo: userInfo,
  });

  return {
    user_id: userId,
    source_user: userInfo,
    profile,
    updated_at: stored?.updated_at ?? null,
  };
}

export async function saveAccountProfile(userInfo: JsonObject, patch: Partial<AccountProfile>) {
  const userId = deriveSecondMeUserId(userInfo);
  const current = await getAccountProfile(userInfo);
  const merged: AccountProfile = {
    ...current.profile,
    ...normalizeProfilePatch(patch),
  };

  upsertUserProfile({
    userId,
    profile: merged,
    rawUserInfo: userInfo,
  });

  const stored = getStoredUserProfile(userId);
  return {
    user_id: userId,
    profile: merged,
    updated_at: stored?.updated_at ?? Date.now(),
  };
}
