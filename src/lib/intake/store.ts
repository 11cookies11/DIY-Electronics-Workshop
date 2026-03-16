import { createEmptyState, type IntakeAgentState } from "./types";

type SessionRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
  state: IntakeAgentState;
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 6;

declare global {
  // eslint-disable-next-line no-var
  var __intakeAgentSessions__: Map<string, SessionRecord> | undefined;
}

function getStore() {
  if (!globalThis.__intakeAgentSessions__) {
    globalThis.__intakeAgentSessions__ = new Map<string, SessionRecord>();
  }

  return globalThis.__intakeAgentSessions__;
}

function cleanupExpiredSessions() {
  const now = Date.now();
  const store = getStore();

  for (const [id, record] of store.entries()) {
    if (now - record.updatedAt > SESSION_TTL_MS) {
      store.delete(id);
    }
  }
}

export function getSessionState(sessionId: string) {
  cleanupExpiredSessions();
  const store = getStore();
  const existing = store.get(sessionId);

  if (existing) {
    return existing.state;
  }

  const state = createEmptyState();
  store.set(sessionId, {
    id: sessionId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    state,
  });
  return state;
}

export function saveSessionState(sessionId: string, state: IntakeAgentState) {
  const store = getStore();
  const previous = store.get(sessionId);

  store.set(sessionId, {
    id: sessionId,
    createdAt: previous?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    state,
  });

  return state;
}
