import { detectConversationBaseMode } from "./conversation-base";
import { parseConversationSignals } from "./signals";
import type { ConversationMemory, ConversationTurn } from "./types";

function normalizeQuestionText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function extractAssistantQuestions(history: ConversationTurn[] = []) {
  return history
    .filter((turn) => turn.role === "assistant" && /[？?]/.test(turn.content))
    .map((turn) => turn.content);
}

function extractLatestAssistantQuestion(history: ConversationTurn[] = []) {
  return [...history]
    .reverse()
    .find((turn) => turn.role === "assistant" && /[？?]/.test(turn.content))
    ?.content;
}

function inferFocusHint(question?: string) {
  if (!question) return undefined;
  if (/(电视|空调|控制哪些设备|家电)/.test(question)) return "控制对象";
  if (/(场景|家里|外出|环境)/.test(question)) return "使用场景";
  if (/(供电|电池|充电|续航)/.test(question)) return "供电方式";
  if (/(按键|触屏|触控|交互)/.test(question)) return "主要交互方式";
  if (/(尺寸|大小|厚度|外形)/.test(question)) return "尺寸与外形";
  if (/(接口|usb|type-c|端口)/i.test(question)) return "接口需求";
  if (/(蓝牙|wifi|联网|连接|通信)/i.test(question)) return "连接方式";
  return undefined;
}

function countRepeatedFocus(history: ConversationTurn[] = []) {
  const questions = extractAssistantQuestions(history);
  if (!questions.length) return 0;

  const lastQuestion = questions[questions.length - 1];
  const lastFocus = inferFocusHint(lastQuestion);
  const lastNormalized = normalizeQuestionText(lastQuestion);

  let count = 1;
  for (let i = questions.length - 2; i >= 0; i -= 1) {
    const current = questions[i];
    const sameFocus =
      inferFocusHint(current) &&
      lastFocus &&
      inferFocusHint(current) === lastFocus;
    const sameText = normalizeQuestionText(current) === lastNormalized;
    if (!sameFocus && !sameText) break;
    count += 1;
  }

  return count;
}

export function analyzeConversationMemory(args: {
  message: string;
  history?: ConversationTurn[];
  unknowns: string[];
}): ConversationMemory {
  const baseMode = detectConversationBaseMode(args.message);
  const signals = parseConversationSignals(args.message);
  const recentAssistantQuestion = extractLatestAssistantQuestion(args.history);
  const focusHint = inferFocusHint(recentAssistantQuestion) ?? args.unknowns[0];
  const repeatedFocusCount = countRepeatedFocus(args.history);

  if (signals.isCorrection) {
    return {
      mode: "correcting",
      recentAssistantQuestion,
      pendingUnknown: args.unknowns[0],
      focusHint,
      repeatedFocusCount,
      shouldContinueThread: true,
    };
  }

  if (signals.isNegative) {
    return {
      mode: "rejecting",
      recentAssistantQuestion,
      pendingUnknown: args.unknowns[0],
      focusHint,
      repeatedFocusCount,
      shouldContinueThread: false,
    };
  }

  if (baseMode === "gratitude") {
    return {
      mode: "gratitude",
      recentAssistantQuestion,
      pendingUnknown: args.unknowns[0],
      focusHint,
      repeatedFocusCount,
      shouldContinueThread: false,
    };
  }

  if (signals.isAffirmative && recentAssistantQuestion) {
    return {
      mode: "confirming",
      recentAssistantQuestion,
      pendingUnknown: args.unknowns[0],
      focusHint,
      repeatedFocusCount,
      shouldContinueThread: true,
    };
  }

  if (baseMode !== "none") {
    return {
      mode: "free_chat",
      recentAssistantQuestion,
      pendingUnknown: args.unknowns[0],
      focusHint,
      repeatedFocusCount,
      shouldContinueThread: false,
    };
  }

  if (recentAssistantQuestion) {
    return {
      mode: "answering_question",
      recentAssistantQuestion,
      pendingUnknown: args.unknowns[0],
      focusHint,
      repeatedFocusCount,
      shouldContinueThread: true,
    };
  }

  return {
    mode: "new_topic",
    recentAssistantQuestion,
    pendingUnknown: args.unknowns[0],
    focusHint,
    repeatedFocusCount,
    shouldContinueThread: false,
  };
}
