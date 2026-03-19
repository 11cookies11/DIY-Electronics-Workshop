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

  const wantsPreviewByKeyword = containsAny(normalized, [
    "预览",
    "出图",
    "生成",
    "3d",
    "草案",
    "方案",
    "模型",
  ]);
  const wantsHandoffByKeyword = containsAny(normalized, [
    "交接",
    "handoff",
    "移交",
    "提交实验室",
    "继续推进",
  ]);
  const affirmativeByKeyword = containsAny(normalized, [
    "我愿意",
    "愿意",
    "可以",
    "好",
    "好的",
    "行",
    "开始吧",
    "继续",
    "就这样",
    "没问题",
  ]);
  const negativeByKeyword = containsAny(normalized, [
    "不要",
    "先不要",
    "先不",
    "不做",
    "不生成",
    "等等",
    "等一下",
    "稍后",
  ]);
  const correctionByKeyword = containsAny(normalized, [
    "不是",
    "不对",
    "纠正",
    "改成",
    "应该是",
    "我说的是",
  ]);

  return {
    wantsPreview:
      wantsPreviewByKeyword &&
      hasPattern(lowered, [
        /(生成|出|看).*(预览|草案|方案|模型|3d)/i,
        /(直接|现在).*(生成|出图)/i,
      ]),
    wantsHandoff:
      wantsHandoffByKeyword &&
      hasPattern(lowered, [
        /(交接|handoff|移交|提交).*(实验室|团队|工程)/i,
        /(继续推进|往下走)/i,
      ]),
    isAffirmative:
      affirmativeByKeyword ||
      hasPattern(normalized, [/^(我愿意|愿意|可以|好的|好啊|好呀|行|开始吧|继续|就这样)$/i]),
    isNegative:
      negativeByKeyword ||
      hasPattern(normalized, [/^(先不要|不要|先不|不做|不生成|等等|等一下|稍后)$/i]),
    isCorrection:
      correctionByKeyword || hasPattern(lowered, [/(不是.*而是|改成|应该是|我说的是)/i]),
  };
}
