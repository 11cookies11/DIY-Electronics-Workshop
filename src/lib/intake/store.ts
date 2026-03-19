import {
  createEmptyState,
  type ConversationTurn,
  type IntakeAgentOutput,
  type IntakeAgentState,
} from "./types";
import {
  type CollaborationPanel,
  type ProjectCollaborationRecord,
  updateProjectCollaborationRecord,
} from "./collaboration";

export type SessionRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
  state: IntakeAgentState;
  history: ConversationTurn[];
  lastOutput?: IntakeAgentOutput;
  projectRecord?: ProjectCollaborationRecord;
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
    history: [],
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
    history: previous?.history ?? [],
  });

  return state;
}

export function saveSessionOutput(
  sessionId: string,
  userMessage: string,
  output: IntakeAgentOutput,
  collaborationPanel?: CollaborationPanel,
) {
  const store = getStore();
  const previous = store.get(sessionId);
  const now = Date.now();
  const nextHistory: ConversationTurn[] = [
    ...(previous?.history ?? []),
    { role: "user" as const, content: userMessage, timestamp: now },
    {
      role: "assistant" as const,
      content: output.customer_reply,
      timestamp: now,
    },
  ].slice(-16);

  const nextProjectRecord = collaborationPanel
    ? updateProjectCollaborationRecord({
        sessionId,
        panel: collaborationPanel,
        output,
        previous: previous?.projectRecord,
        now,
      })
    : previous?.projectRecord;

  store.set(sessionId, {
    id: sessionId,
    createdAt: previous?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    state: output.state,
    history: nextHistory,
    lastOutput: output,
    projectRecord: nextProjectRecord,
  });

  return output;
}

export function getSessionRecord(sessionId: string) {
  cleanupExpiredSessions();
  return getStore().get(sessionId) ?? null;
}
