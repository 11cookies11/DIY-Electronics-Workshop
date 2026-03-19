import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

type ProfileStore = Record<
  string,
  {
    updated_at: number;
    profile: AccountProfile;
  }
>;

const PROFILE_STORE_PATH =
  process.env.SECONDME_PROFILE_STORE_PATH ??
  path.join(process.cwd(), ".secondme", "account-profiles.json");

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

async function ensureStoreDir() {
  await mkdir(path.dirname(PROFILE_STORE_PATH), { recursive: true });
}

async function readStore(): Promise<ProfileStore> {
  try {
    const raw = await readFile(PROFILE_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as ProfileStore;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeStore(store: ProfileStore) {
  await ensureStoreDir();
  await writeFile(PROFILE_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function getAccountProfile(userInfo: JsonObject) {
  const userId = deriveSecondMeUserId(userInfo);
  const store = await readStore();
  const stored = store[userId];
  const defaults = buildDefaultProfile(userInfo);

  return {
    user_id: userId,
    source_user: userInfo,
    profile: stored ? { ...defaults, ...stored.profile } : defaults,
    updated_at: stored?.updated_at ?? null,
  };
}

export async function saveAccountProfile(userInfo: JsonObject, patch: Partial<AccountProfile>) {
  const userId = deriveSecondMeUserId(userInfo);
  const store = await readStore();
  const current = await getAccountProfile(userInfo);
  const merged: AccountProfile = {
    ...current.profile,
    ...normalizeProfilePatch(patch),
  };

  store[userId] = {
    updated_at: Date.now(),
    profile: merged,
  };
  await writeStore(store);

  return {
    user_id: userId,
    profile: merged,
    updated_at: store[userId].updated_at,
  };
}
