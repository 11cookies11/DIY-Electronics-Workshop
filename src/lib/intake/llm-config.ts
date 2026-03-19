export function isLlmFirstModeEnabled() {
  const flag = process.env.INTAKE_LLM_FIRST_MODE ?? "true";
  return flag !== "false";
}

export function resolveReasoningModel() {
  return (
    process.env.DEEPSEEK_INTAKE_REASONING_MODEL ??
    process.env.LLM_INTAKE_REASONING_MODEL ??
    process.env.SECONDME_INTAKE_REASONING_MODEL
  );
}

export function resolveIntakeChatModel() {
  return (
    process.env.DEEPSEEK_INTAKE_CHAT_MODEL ??
    process.env.LLM_INTAKE_CHAT_MODEL ??
    process.env.SECONDME_INTAKE_CHAT_MODEL
  );
}

export function resolveGatewayChatModel(fallback = "deepseek-chat") {
  return (
    process.env.DEEPSEEK_CHAT_MODEL ??
    process.env.LLM_CHAT_MODEL ??
    process.env.SECONDME_CHAT_MODEL ??
    fallback
  );
}

export function resolveGatewayBaseUrl() {
  return (
    process.env.DEEPSEEK_BASE_URL ??
    process.env.LLM_BASE_URL ??
    process.env.SECONDME_OPENAI_BASE_URL ??
    process.env.SECONDME_API_BASE_URL
  );
}

export function resolveGatewayCompletionsUrl() {
  return process.env.LLM_CHAT_COMPLETIONS_URL ?? process.env.SECONDME_CHAT_COMPLETIONS_URL;
}

export function hasGatewayApiKeyEnv() {
  return Boolean(
    process.env.DEEPSEEK_API_KEY ??
      process.env.LLM_API_KEY ??
      process.env.SECONDME_CHAT_API_KEY,
  );
}
