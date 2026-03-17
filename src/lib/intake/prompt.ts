import type { IntakeAgentRequest } from "./types";
import { buildEmbeddedKnowledgePrompt, buildLabKnowledgePrompt } from "./knowledge";
import {
  FRONT_DESK_FEWSHOTS,
  FRONT_DESK_OUTPUT_RULES,
  FRONT_DESK_PERSONA,
  FRONT_DESK_RUNTIME_RULES,
} from "./prompt-config";

function buildPromptSection(title: string, lines: string[]) {
  return [title, ...lines.map((line) => `- ${line}`)].join("\n");
}

export function buildIntakeSystemPrompt() {
  return [
    buildPromptSection("前台角色", FRONT_DESK_PERSONA),
    buildPromptSection("运行时规则", FRONT_DESK_RUNTIME_RULES),
    buildPromptSection("输出要求", FRONT_DESK_OUTPUT_RULES),
    buildPromptSection("参考风格示例", FRONT_DESK_FEWSHOTS),
    buildEmbeddedKnowledgePrompt(),
    buildLabKnowledgePrompt(),
  ].join("\n\n");
}

export function buildIntakeUserPrompt(request: IntakeAgentRequest) {
  return JSON.stringify(
    {
      locale: request.locale,
      message: request.message,
      current_state: request.state,
      recent_history: request.history?.slice(-6) ?? [],
      instruction:
        "请基于当前会话状态更新结构化需求。先像真人前台一样自然回应，再决定是否推进需求。只有在信息确实足够时，再把 next_action 推进到 generate_preview 或 prepare_handoff。",
    },
    null,
    2,
  );
}
