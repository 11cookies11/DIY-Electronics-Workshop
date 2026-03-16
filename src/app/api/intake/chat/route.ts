import { NextResponse } from "next/server";
import { runIntakeWorkflow } from "@/lib/intake/workflow";
import { getSessionState, saveSessionState } from "@/lib/intake/store";

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
    const currentState = getSessionState(sessionId);
    const result = await runIntakeWorkflow(sessionId, message, currentState);
    saveSessionState(sessionId, result.state);

    return NextResponse.json({
      sessionId,
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
