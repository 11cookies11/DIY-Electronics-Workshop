import { NextResponse } from "next/server";
import { requestLlmChatReply } from "@/lib/intake/llm-client";
import type { SecondMeChatMessage } from "@/lib/intake/types";

type RequestBody = {
  messages?: SecondMeChatMessage[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const messages = body.messages?.filter(
      (message) =>
        message &&
        (message.role === "system" ||
          message.role === "user" ||
          message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    );

    if (!messages?.length) {
      return NextResponse.json({ error: "messages are required" }, { status: 400 });
    }

    const content = await requestLlmChatReply(messages);
    return NextResponse.json({ reply: content });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "LLM chat request failed" },
      { status: 500 },
    );
  }
}
