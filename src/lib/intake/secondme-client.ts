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

  const base =
    process.env.SECONDME_OPENAI_BASE_URL ??
    process.env.SECONDME_API_BASE_URL ??
    getSecondMeConfig().apiBaseUrl;
  return `${base.replace(/\/$/, "")}/v1/chat/completions`;
}

export function isSecondMeChatConfigured() {
  return Boolean(process.env.SECONDME_CHAT_MODEL);
}

export async function requestSecondMeStructuredReply(messages: SecondMeChatMessage[]) {
  return requestSecondMeChatReply(messages, { requireJson: true });
}

export async function requestSecondMeChatReply(
  messages: SecondMeChatMessage[],
  options: {
    requireJson?: boolean;
    model?: string;
    temperature?: number;
  } = {},
) {
  const model = options.model ?? process.env.SECONDME_CHAT_MODEL;
  if (!model) {
    throw new Error("Missing SECONDME_CHAT_MODEL");
  }

  const accessToken = await getAccessToken();
  const apiKey = process.env.SECONDME_CHAT_API_KEY ?? accessToken;

  if (!apiKey) {
    throw new Error(
      "Missing Second Me chat credentials: connect OAuth or set SECONDME_CHAT_API_KEY",
    );
  }

  const response = await fetch(getChatEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.2,
      messages,
      ...(options.requireJson ? { response_format: { type: "json_object" } } : {}),
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
