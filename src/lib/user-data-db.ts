import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { AccountProfile } from "./account-profile";
import type { CollaborationPanel, ProjectCollaborationRecord } from "./intake/collaboration";
import type { IntakeAgentOutput } from "./intake/types";

type JsonObject = Record<string, unknown>;

const DB_PATH =
  process.env.USER_DATA_DB_PATH ??
  path.join(process.cwd(), ".secondme", "user-data.sqlite");

declare global {
  // eslint-disable-next-line no-var
  var __userDataDb__: DatabaseSync | undefined;
}

function toJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function asSearchText(parts: Array<string | undefined | null>) {
  return parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getDb() {
  if (!globalThis.__userDataDb__) {
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        company TEXT NOT NULL DEFAULT '',
        role_title TEXT NOT NULL DEFAULT '',
        timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
        notes TEXT NOT NULL DEFAULT '',
        raw_user_info_json TEXT NOT NULL DEFAULT '{}',
        search_text TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS intake_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_workflow_state TEXT,
        last_next_action TEXT,
        last_summary TEXT,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      );

      CREATE TABLE IF NOT EXISTS intake_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_id TEXT,
        user_message TEXT NOT NULL,
        assistant_reply TEXT NOT NULL,
        workflow_state TEXT,
        next_action TEXT,
        requirement_summary TEXT,
        confirmed_json TEXT NOT NULL,
        unknowns_json TEXT NOT NULL,
        risks_json TEXT NOT NULL,
        suggestions_json TEXT NOT NULL,
        preview_json TEXT,
        handoff_json TEXT,
        debug_json TEXT,
        collaboration_panel_json TEXT,
        project_record_json TEXT,
        created_at INTEGER NOT NULL,
        search_text TEXT NOT NULL DEFAULT '',
        FOREIGN KEY(session_id) REFERENCES intake_sessions(session_id)
      );

      CREATE INDEX IF NOT EXISTS idx_users_search_text ON users(search_text);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON intake_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_session_id ON intake_interactions(session_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON intake_interactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON intake_interactions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_interactions_search_text ON intake_interactions(search_text);
    `);
    globalThis.__userDataDb__ = db;
  }

  return globalThis.__userDataDb__;
}

export function upsertUserProfile(args: {
  userId: string;
  profile: AccountProfile;
  rawUserInfo: JsonObject;
}) {
  const now = Date.now();
  const db = getDb();
  const searchText = asSearchText([
    args.userId,
    args.profile.display_name,
    args.profile.email,
    args.profile.phone,
    args.profile.company,
    args.profile.role_title,
    args.profile.timezone,
    args.profile.notes,
    JSON.stringify(args.rawUserInfo),
  ]);

  db.prepare(
    `INSERT INTO users (
      user_id, display_name, email, phone, company, role_title, timezone, notes,
      raw_user_info_json, search_text, created_at, updated_at, last_seen_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      display_name = excluded.display_name,
      email = excluded.email,
      phone = excluded.phone,
      company = excluded.company,
      role_title = excluded.role_title,
      timezone = excluded.timezone,
      notes = excluded.notes,
      raw_user_info_json = excluded.raw_user_info_json,
      search_text = excluded.search_text,
      updated_at = excluded.updated_at,
      last_seen_at = excluded.last_seen_at`
  ).run(
    args.userId,
    args.profile.display_name,
    args.profile.email,
    args.profile.phone,
    args.profile.company,
    args.profile.role_title,
    args.profile.timezone,
    args.profile.notes,
    toJson(args.rawUserInfo),
    searchText,
    now,
    now,
    now,
  );
}

export function getStoredUserProfile(userId: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT user_id, display_name, email, phone, company, role_title, timezone, notes, updated_at
       FROM users WHERE user_id = ?`
    )
    .get(userId) as
    | {
        user_id: string;
        display_name: string;
        email: string;
        phone: string;
        company: string;
        role_title: string;
        timezone: string;
        notes: string;
        updated_at: number;
      }
    | undefined;
}

export function saveIntakeInteraction(args: {
  sessionId: string;
  userId?: string;
  userMessage: string;
  output: IntakeAgentOutput;
  collaborationPanel?: CollaborationPanel;
  projectRecord?: ProjectCollaborationRecord;
}) {
  const db = getDb();
  const now = Date.now();
  const searchText = asSearchText([
    args.userId,
    args.sessionId,
    args.userMessage,
    args.output.customer_reply,
    args.output.requirement_summary,
    args.output.confirmed.device_type,
    args.output.confirmed.use_case,
    args.output.confirmed.target_users,
    args.output.unknowns.join(" "),
    args.output.risks.join(" "),
  ]);

  db.prepare(
    `INSERT INTO intake_sessions (
      session_id, user_id, created_at, updated_at, last_workflow_state, last_next_action, last_summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      user_id = COALESCE(excluded.user_id, intake_sessions.user_id),
      updated_at = excluded.updated_at,
      last_workflow_state = excluded.last_workflow_state,
      last_next_action = excluded.last_next_action,
      last_summary = excluded.last_summary`
  ).run(
    args.sessionId,
    args.userId ?? null,
    now,
    now,
    args.output.state.workflow_state,
    args.output.next_action,
    args.output.requirement_summary,
  );

  db.prepare(
    `INSERT INTO intake_interactions (
      session_id, user_id, user_message, assistant_reply, workflow_state, next_action, requirement_summary,
      confirmed_json, unknowns_json, risks_json, suggestions_json,
      preview_json, handoff_json, debug_json, collaboration_panel_json, project_record_json,
      created_at, search_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    args.sessionId,
    args.userId ?? null,
    args.userMessage,
    args.output.customer_reply,
    args.output.state.workflow_state,
    args.output.next_action,
    args.output.requirement_summary,
    toJson(args.output.confirmed),
    toJson(args.output.unknowns),
    toJson(args.output.risks),
    toJson(args.output.suggestions),
    toJson(args.output.preview_input_draft),
    toJson(args.output.lab_handoff),
    toJson(args.output.debug),
    toJson(args.collaborationPanel),
    toJson(args.projectRecord),
    now,
    searchText,
  );
}

export function searchUsers(args: { q?: string; limit?: number }) {
  const db = getDb();
  const limit = Math.min(Math.max(args.limit ?? 20, 1), 200);
  if (!args.q?.trim()) {
    return db
      .prepare(
        `SELECT user_id, display_name, email, phone, company, role_title, timezone, notes, updated_at, last_seen_at
         FROM users ORDER BY updated_at DESC LIMIT ?`
      )
      .all(limit);
  }

  const q = `%${args.q.trim().toLowerCase()}%`;
  return db
    .prepare(
      `SELECT user_id, display_name, email, phone, company, role_title, timezone, notes, updated_at, last_seen_at
       FROM users WHERE search_text LIKE ? ORDER BY updated_at DESC LIMIT ?`
    )
    .all(q, limit);
}

export function searchInteractions(args: {
  userId?: string;
  sessionId?: string;
  q?: string;
  limit?: number;
}) {
  const db = getDb();
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 500);
  const conditions: string[] = [];
  const values: Array<string | number | null> = [];

  if (args.userId?.trim()) {
    conditions.push("user_id = ?");
    values.push(args.userId.trim());
  }

  if (args.sessionId?.trim()) {
    conditions.push("session_id = ?");
    values.push(args.sessionId.trim());
  }

  if (args.q?.trim()) {
    conditions.push("search_text LIKE ?");
    values.push(`%${args.q.trim().toLowerCase()}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT id, session_id, user_id, user_message, assistant_reply, workflow_state, next_action, requirement_summary, created_at,
           confirmed_json, unknowns_json, risks_json, suggestions_json, preview_json, handoff_json, debug_json,
           collaboration_panel_json, project_record_json
    FROM intake_interactions
    ${where}
    ORDER BY id DESC
    LIMIT ?
  `;

  return db.prepare(sql).all(...values, limit);
}

export function listSessions(args: { userId?: string; limit?: number }) {
  const db = getDb();
  const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
  if (args.userId?.trim()) {
    return db
      .prepare(
        `SELECT session_id, user_id, created_at, updated_at, last_workflow_state, last_next_action, last_summary
         FROM intake_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`
      )
      .all(args.userId.trim(), limit);
  }

  return db
    .prepare(
      `SELECT session_id, user_id, created_at, updated_at, last_workflow_state, last_next_action, last_summary
       FROM intake_sessions ORDER BY updated_at DESC LIMIT ?`
    )
    .all(limit);
}
