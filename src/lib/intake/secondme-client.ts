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

function getRequestTimeoutMs() {
  const raw = Number(process.env.LLM_REQUEST_TIMEOUT_MS ?? "20000");
  return Number.isFinite(raw) && raw > 0 ? raw : 20000;
}

function shouldRetryStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function getMaxRetries() {
  const raw = Number(process.env.LLM_REQUEST_MAX_RETRIES ?? "1");
  return Number.isFinite(raw) && raw >= 0 ? raw : 1;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

// 保留旧方法名，避免现有调用方大面积改动；实际是通用 LLM 网关配置检测。
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

  const endpoint = getChatEndpoint();
  const timeoutMs = getRequestTimeoutMs();
  const maxRetries = getMaxRetries();
  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
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
        signal: controller.signal,
      });

      if (!response.ok) {
        if (attempt < maxRetries && shouldRetryStatus(response.status)) {
          attempt += 1;
          await wait(350 * attempt);
          continue;
        }
        throw new Error(`LLM chat request failed with status ${response.status}`);
      }

      const data = (await response.json()) as OpenAIChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("LLM chat returned empty content");
      }

      if (options.requireJson) {
        JSON.parse(content);
      }

      return content;
    } catch (error) {
      if (attempt < maxRetries) {
        attempt += 1;
        await wait(350 * attempt);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
