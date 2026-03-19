import { getAccessToken, getSecondMeConfig } from "@/lib/secondme";
import {
  hasGatewayApiKeyEnv,
  resolveGatewayBaseUrl,
  resolveGatewayChatModel,
  resolveGatewayCompletionsUrl,
} from "./llm-config";
import type { SecondMeChatMessage } from "./types";

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

function getChatEndpoint() {
  const override = resolveGatewayCompletionsUrl();
  if (override) {
    return override;
  }

  const base = resolveGatewayBaseUrl() ?? getSecondMeConfig().apiBaseUrl;
  return `${base.replace(/\/$/, "")}/chat/completions`;
}

async function resolveApiKey() {
  const accessToken = await getAccessToken();
  return (
    process.env.DEEPSEEK_API_KEY ??
    process.env.LLM_API_KEY ??
    process.env.SECONDME_CHAT_API_KEY ??
    accessToken ??
    null
  );
}

// 保留旧方法名，避免现有调用方大面积改动；实际为通用 LLM 网关配置检测。
export function isSecondMeChatConfigured() {
  return Boolean(
    process.env.DEEPSEEK_CHAT_MODEL ||
      process.env.LLM_CHAT_MODEL ||
      process.env.SECONDME_CHAT_MODEL ||
      hasGatewayApiKeyEnv(),
  );
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
  const model = options.model ?? resolveGatewayChatModel("deepseek-chat");
  const apiKey = await resolveApiKey();

  if (!apiKey) {
    throw new Error("Missing LLM API key: set DEEPSEEK_API_KEY (or LLM_API_KEY)");
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
    throw new Error(`LLM chat request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OpenAIChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("LLM chat returned empty content");
  }

  return content;
}
