export type ConversationBaseMode =
  | "greeting"
  | "smalltalk"
  | "capability"
  | "lab_intro"
  | "gratitude"
  | "none";

function hasPattern(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message));
}

function normalizeMessage(message: string) {
  return message.trim().replace(/[，。！？、\s]+/g, "").toLowerCase();
}

export function detectConversationBaseMode(message: string): ConversationBaseMode {
  const normalized = normalizeMessage(message);

  if (
    [
      "你好",
      "你好呀",
      "你好啊",
      "您好",
      "嗨",
      "hi",
      "hello",
      "在吗",
      "有人吗",
      "哈喽",
      "哈啰",
    ].includes(normalized)
  ) {
    return "greeting";
  }

  if (hasPattern(message, [/(最近怎么样|你忙吗|今天天气|随便聊聊|聊聊天)/])) {
    return "smalltalk";
  }

  if (
    hasPattern(message, [
      /(你是谁|你是做什么的|你能做什么|你会什么|你可以干什么|你能帮我做什么|你这边能做什么|你这边能帮我做什么|介绍一下你自己)/,
    ])
  ) {
    return "capability";
  }

  if (hasPattern(message, [/(介绍一下实验室|介绍实验室|你们实验室做什么|实验室是做什么的)/])) {
    return "lab_intro";
  }

  if (hasPattern(message, [/(谢谢|多谢|辛苦了|感谢)/])) {
    return "gratitude";
  }

  return "none";
}
