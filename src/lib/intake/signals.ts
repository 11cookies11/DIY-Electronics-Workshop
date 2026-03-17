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
  return message.trim().replace(/[，。！？、\s]+/g, "").toLowerCase();
}

export function parseConversationSignals(message: string): ConversationSignals {
  const normalized = normalizeMessage(message);

  return {
    wantsPreview: hasPattern(message, [
      /(生成|出一版|来一版|搭一版|做一版).*(预览|草案|方案|模型|3d)/i,
      /(看看|看下|想看).*(预览|草案|方案|模型|3d)/i,
      /(直接|现在).*(生成|出).*(预览|草案|方案|模型|3d)/i,
      /(现在可以了吗|可以生成了吗|能生成了吗|给我生成吧|那就生成吧|直接出吧)/,
    ]),
    wantsHandoff: hasPattern(message, [
      /(交接|交给实验室|整理交接单|提交实验室)/,
      /(继续推进|往下走|开始评估).*(实验室|交接)/,
    ]),
    isAffirmative:
      hasPattern(normalized, [
        /^(可以|好|好的|好呀|好啊|行|行啊|来吧|开始吧|继续吧|就这样吧|没问题|可以的|那就这样|那就开始吧)+$/i,
        /^(可以来吧|好来吧|好的来吧|那就开始吧|那就继续吧)$/i,
      ]) ||
      hasPattern(message, [/(那就|那你就|那麻烦你).*(开始|继续|生成|整理|推进)/]),
    isNegative:
      hasPattern(normalized, [
        /^(先不要|不要|不急|先等等|等一下|先别|还不行|先不做|先不生成)+$/i,
      ]) || hasPattern(message, [/(暂时|现在先).*(不要|不做|不生成|不推进)/]),
    isCorrection: hasPattern(message, [
      /(不是|不对|纠正一下|改一下|我说的是|应该是|准确地说)/,
      /(不是.*而是|别用.*用)/,
    ]),
  };
}
