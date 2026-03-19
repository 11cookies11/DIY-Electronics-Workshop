import { NextResponse } from "next/server";
import { runIntakeWorkflow } from "@/lib/intake/workflow";
import { buildCollaborationPanel } from "@/lib/intake/collaboration";
import { getSessionRecord, getSessionState, saveSessionOutput } from "@/lib/intake/store";

type RequestBody = {
  sessionId?: string;
  message?: string;
};

function createSessionId() {
  return `intake_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    const sessionId = body.sessionId?.trim() || createSessionId();
    const record = getSessionRecord(sessionId);
    const currentState = getSessionState(sessionId);
    const result = await runIntakeWorkflow(
      sessionId,
      message,
      currentState,
      record?.history ?? [],
    );
    const collaborationPanel = await buildCollaborationPanel(result);
    saveSessionOutput(sessionId, message, result, collaborationPanel);
    const savedRecord = getSessionRecord(sessionId);

    return NextResponse.json({
      sessionId,
      handoffUrl: result.lab_handoff ? `/handoff/${sessionId}` : null,
      collaboration_panel: collaborationPanel,
      project_record: savedRecord?.projectRecord ?? null,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown intake error",
      },
      { status: 500 },
    );
  }
}
