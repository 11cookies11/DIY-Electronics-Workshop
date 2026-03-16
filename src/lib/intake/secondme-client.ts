import { getAccessToken, getSecondMeConfig } from "@/lib/secondme";
import type { SecondMeChatMessage } from "./types";

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

function getChatEndpoint() {
  const override = process.env.SECONDME_CHAT_COMPLETIONS_URL;
  if (override) {
    return override;
  }

  const base = process.env.SECONDME_OPENAI_BASE_URL ?? getSecondMeConfig().apiBaseUrl;
  return `${base.replace(/\/$/, "")}/v1/chat/completions`;
}

export function isSecondMeChatConfigured() {
  return Boolean(
    process.env.SECONDME_CHAT_MODEL &&
      (process.env.SECONDME_CHAT_API_KEY || process.env.SECONDME_CLIENT_ID),
  );
}

export async function requestSecondMeStructuredReply(messages: SecondMeChatMessage[]) {
  const model = process.env.SECONDME_CHAT_MODEL;
  if (!model) {
    throw new Error("Missing SECONDME_CHAT_MODEL");
  }

  const accessToken = await getAccessToken();
  const apiKey =
    process.env.SECONDME_CHAT_API_KEY ??
    accessToken ??
    process.env.SECONDME_CLIENT_ID;

  if (!apiKey) {
    throw new Error("Missing Second Me chat credentials");
  }

  const response = await fetch(getChatEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Second Me chat request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OpenAIChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Second Me chat returned empty content");
  }

  return content;
}
