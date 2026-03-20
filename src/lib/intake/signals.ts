export type ConversationSignals = {
  wantsPreview: boolean;
  wantsHandoff: boolean;
  isAffirmative: boolean;
  isNegative: boolean;
  isCorrection: boolean;
};

function hasPattern(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message));
}

function normalizeMessage(message: string) {
  return message
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function containsAny(message: string, keywords: string[]) {
  return keywords.some((keyword) => message.includes(keyword));
}

export function parseConversationSignals(message: string): ConversationSignals {
  const normalized = normalizeMessage(message);
  const lowered = message.trim().toLowerCase();

  const wantsPreview = containsAny(normalized, [
    "预览",
    "出图",
    "3d",
    "看一版",
    "看看效果",
    "生成草案",
  ]);

  const wantsHandoff = containsAny(normalized, [
    "交接",
    "handoff",
    "移交",
    "提交实验室",
    "继续推进",
    "往下走",
    "给我一版交接",
  ]);

  const isAffirmative =
    containsAny(normalized, [
      "我愿意",
      "愿意",
      "可以",
      "好的",
      "好呀",
      "好啊",
      "行",
      "开始吧",
      "继续",
      "就这样",
      "没问题",
    ]) ||
    hasPattern(normalized, [/^(愿意|可以|好的|好呀|好啊|行|开始吧|继续|就这样)$/i]);

  const isNegative =
    containsAny(normalized, [
      "不要",
      "先不要",
      "先不",
      "不做",
      "不生成",
      "等等",
      "等一下",
      "稍后",
    ]) ||
    hasPattern(normalized, [/^(先不要|不要|先不|不做|不生成|等等|等一下|稍后)$/i]);

  const isCorrection =
    containsAny(normalized, ["不是", "不对", "纠正", "改成", "应该是", "我说的是"]) ||
    hasPattern(lowered, [/(不是.*而是|改成|应该是|我说的是)/i]);

  return {
    wantsPreview,
    wantsHandoff,
    isAffirmative,
    isNegative,
    isCorrection,
  };
}
