"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Bot,
  Boxes,
  ClipboardCheck,
  ExternalLink,
  Maximize2,
  Minimize2,
  Send,
  User,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PreviewView } from "@/engine/preview";
import type {
  IntakeAgentState,
  IntakeDebugInfo,
  IntakeNextAction,
  PreviewDraft,
} from "@/lib/intake/types";
import { useTheme } from "./theme-context";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatInterfaceProps = {
  isConnected?: boolean;
  connectedFromCallback?: boolean;
  error?: string;
  userInfo?: Record<string, unknown> | null;
  userInfoError?: string | null;
  activePresetLabel: string;
  activeView: PreviewView;
  onPreviewDraft?: (draft: PreviewDraft) => void;
};

type StageFeedback = {
  kind: "preview" | "handoff";
  title: string;
  detail: string;
  actionLabel?: string;
  actionHref?: string;
};

type ContextGuide = {
  eyebrow: string;
  title: string;
  detail: string;
  placeholder: string;
  actions: Array<{ label: string; prompt: string }>;
};

const QUICK_ACTIONS: Array<{ label: string; prompt: string }> = [
  { label: "介绍实验室", prompt: "介绍一下实验室" },
  { label: "看看当前方案", prompt: "介绍一下当前方案" },
  { label: "我想做手持设备", prompt: "我想做一个手持设备" },
  { label: "我想做桌面设备", prompt: "我想做一个桌面设备" },
];

function buildSeedMessage(isConnected: boolean, activePresetLabel: string) {
  return isConnected
    ? `你好呀，实验室平台已经接入 Second Me 了。当前主舞台展示的是“${activePresetLabel}”。你可以先随便和我聊聊想法，我会慢慢帮你把方案理出来。`
    : `你好呀，我是实验室前台接待助手 Twin-AI。当前主舞台展示的是“${activePresetLabel}”。你可以先跟我聊聊想法，我会一边听一边帮你把需求整理出来。`;
}

function buildFallbackReply(input: string, activePresetLabel: string) {
  const normalized = input.toLowerCase();

  if (normalized.includes("介绍") && normalized.includes("实验室")) {
    return "我们这边主要做嵌入式产品的前期接待、方案梳理和 3D 结构预览。你可以先把想法告诉我，我会慢慢帮你理顺。";
  }

  if (normalized.includes("当前") || normalized.includes("方案")) {
    return `当前主舞台展示的是“${activePresetLabel}”。如果你愿意，我可以继续和你介绍它的结构特点，或者我们也可以直接聊你的新想法。`;
  }

  if (normalized.includes("手持")) {
    return "手持设备通常会更关注尺寸、电池、屏幕和侧边交互。你如果已经有方向了，可以直接往下说，我来帮你慢慢整理。";
  }

  if (normalized.includes("桌面")) {
    return "桌面设备通常空间会更宽裕一些，适合放更大的屏幕、更完整的接口和更多模块。你想偏展示型，还是偏工具型呀？";
  }

  return "收到啦。你继续说就好，我会顺着你的思路慢慢帮你整理。";
}

export function ChatInterface({
  isConnected = false,
  connectedFromCallback = false,
  error,
  userInfo,
  userInfoError,
  activePresetLabel,
  activeView,
  onPreviewDraft,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: buildSeedMessage(isConnected, activePresetLabel) },
  ]);
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<IntakeDebugInfo | null>(null);
  const [stageFeedback, setStageFeedback] = useState<StageFeedback | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const visitorName = useMemo(() => {
    const candidate =
      (userInfo?.nickname as string | undefined) ??
      (userInfo?.name as string | undefined) ??
      (userInfo?.username as string | undefined);
    return candidate?.trim() || null;
  }, [userInfo]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: visitorName
          ? isConnected
            ? `你好呀，${visitorName}。实验室平台已经接入 Second Me 了。你可以先跟我随便聊聊，我会在合适的时候帮你慢慢推进成方案。`
            : `你好呀，${visitorName}。当前主舞台展示的是“${activePresetLabel}”。你想到哪儿都可以直接说，我来帮你慢慢收。`
          : buildSeedMessage(isConnected, activePresetLabel),
      },
    ]);
    setSessionId(null);
    setHandoffUrl(null);
    setDebugInfo(null);
    setStageFeedback(null);
  }, [activePresetLabel, isConnected, visitorName]);

  const contextGuide = useMemo<ContextGuide>(() => {
    if (!debugInfo || debugInfo.workflow_state === "collecting") {
      return {
        eyebrow: "front desk",
        title: "先把想法接住",
        detail: "你可以先随便聊设备方向、使用场景，或者先让我介绍实验室能力。",
        placeholder: "先随便聊聊想法，或者直接告诉我你想做什么设备...",
        actions: QUICK_ACTIONS,
      };
    }

    if (debugInfo.workflow_state === "clarifying") {
      const focus = debugInfo.single_focus ?? debugInfo.unknowns[0] ?? "关键需求";
      return {
        eyebrow: "clarifying",
        title: `先补齐 ${focus}`,
        detail: "我会优先收一个最关键的信息点，避免把对话聊成问卷。",
        placeholder: `补充一下${focus}，比如场景、交互、供电或核心功能...`,
        actions: [
          { label: `补充${focus}`, prompt: `我来补充一下${focus}` },
          { label: "说下使用场景", prompt: "我补充一下使用场景" },
          { label: "说下供电方式", prompt: "我补充一下供电方式" },
        ],
      };
    }

    if (debugInfo.workflow_state === "preview_ready") {
      return {
        eyebrow: "preview ready",
        title: "已经可以出一版草案",
        detail: "信息基本够了，现在更适合确认是否生成 3D preview，而不是继续分散追问。",
        placeholder: "如果你想继续，就直接说“可以生成预览”...",
        actions: [
          { label: "生成预览", prompt: "可以，生成预览吧" },
          { label: "先讲讲方向", prompt: "先讲讲你现在理解的方案方向" },
          { label: "我再补一点", prompt: "我再补充一点需求" },
        ],
      };
    }

    if (debugInfo.workflow_state === "preview_generated") {
      return {
        eyebrow: "preview active",
        title: "草案已经在主舞台里",
        detail: "现在适合看结构方向、提修改意见，或者直接推进实验室交接。",
        placeholder: "你可以让我调整方案，或者直接说整理交接单...",
        actions: [
          { label: "整理交接单", prompt: "那就整理交接单吧" },
          { label: "调整方案", prompt: "我想再调整一下方案" },
          { label: "解释结构", prompt: "你介绍一下这个方案结构" },
        ],
      };
    }

    if (debugInfo.workflow_state === "handoff_ready") {
      return {
        eyebrow: "handoff ready",
        title: "已经进入实验室交接阶段",
        detail: "核心内容已经收好，现在更适合确认交接范围或补最后几个小缺口。",
        placeholder: "可以继续补充细节，或者直接打开交接单查看...",
        actions: [
          { label: "打开交接单", prompt: "我先看一下交接单" },
          { label: "补一点细节", prompt: "我再补充一点细节" },
          { label: "说明风险", prompt: "你把当前风险再讲清楚一点" },
        ],
      };
    }

    return {
      eyebrow: "front desk",
      title: "继续往下推进",
      detail: "你可以继续补充需求，或者让我先帮你总结当前方向。",
      placeholder: "继续补充你的想法，或者让我先总结当前方向...",
      actions: QUICK_ACTIONS,
    };
  }, [debugInfo]);

  function buildStageFeedback(args: {
    nextAction?: IntakeNextAction;
    state?: IntakeAgentState;
    previewDraft?: PreviewDraft;
    handoffUrl?: string | null;
  }) {
    if (args.handoffUrl && args.state?.workflow_state === "handoff_ready") {
      return {
        kind: "handoff" as const,
        title: "实验室交接单已整理",
        detail: "需求摘要、风险和 preview 草案都已经收好，可以直接交给实验室继续评估。",
        actionLabel: "打开交接单",
        actionHref: args.handoffUrl,
      };
    }

    if (args.previewDraft && args.nextAction === "generate_preview") {
      return {
        kind: "preview" as const,
        title: "3D 草案已生成",
        detail: "主舞台已经切到 AI 生成方案，你可以直接旋转、拆解查看结构方向。",
      };
    }

    if (args.state?.workflow_state === "preview_ready") {
      return {
        kind: "preview" as const,
        title: "已进入预览准备阶段",
        detail: "当前信息已经足够拼出一版方向，再确认一下就可以生成 3D 草案。",
      };
    }

    return null;
  }

  const handleSend = async (prompt?: string) => {
    const nextInput = (prompt ?? input).trim();
    if (!nextInput || isLoading) return;

    const nextMessages = [...messages, { role: "user" as const, content: nextInput }];

    setInput("");
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/intake/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message: nextInput,
        }),
      });

      if (!response.ok) {
        throw new Error("intake api request failed");
      }

      const payload = (await response.json()) as {
        sessionId: string;
        customer_reply?: string;
        preview_input_draft?: PreviewDraft;
        handoffUrl?: string | null;
        next_action?: IntakeNextAction;
        state?: IntakeAgentState;
        debug?: IntakeDebugInfo;
      };

      setSessionId(payload.sessionId);
      setHandoffUrl(payload.handoffUrl ?? null);
      setDebugInfo(payload.debug ?? null);
      setStageFeedback(
        buildStageFeedback({
          nextAction: payload.next_action,
          state: payload.state,
          previewDraft: payload.preview_input_draft,
          handoffUrl: payload.handoffUrl,
        }),
      );
      if (payload.preview_input_draft) {
        onPreviewDraft?.(payload.preview_input_draft);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            payload.customer_reply ?? buildFallbackReply(nextInput, activePresetLabel),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: buildFallbackReply(nextInput, activePresetLabel),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const statusLine =
    error || userInfoError
      ? "平台连接状态异常"
      : isConnected
        ? "Second Me 已接入 / DeepSeek 已启用"
        : "本地前台 Agent / DeepSeek 已启用";

  const statusMeta = connectedFromCallback
    ? "管理员刚完成绑定"
    : isConnected
      ? "前台接待模式"
      : "前台接待模式";

  const viewLabel = activeView === "exploded" ? "完整拆解" : "装配预览";

  return (
    <div
      className={`pointer-events-none fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isMinimized ? "h-12 w-12" : "w-80 sm:w-96"
      }`}
    >
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            key="minimized"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsMinimized(false)}
            className={`pointer-events-auto flex h-full w-full items-center justify-center rounded-full transition-colors ${
              isDark
                ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
                : "border border-emerald-200 bg-white text-emerald-600 shadow-lg shadow-slate-300/40 hover:bg-emerald-50"
            }`}
          >
            <Maximize2 className="h-5 w-5" />
          </motion.button>
        ) : (
          <motion.div
            key="maximized"
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className={`pointer-events-auto flex h-[580px] flex-col overflow-hidden rounded-sm border backdrop-blur-2xl ${
              isDark
                ? "border-white/10 bg-black/88 shadow-[0_32px_64px_rgba(0,0,0,0.5)]"
                : "border-slate-200 bg-[rgba(255,255,255,0.94)] shadow-[0_28px_70px_rgba(148,163,184,0.35)]"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b p-4 ${
                isDark
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-slate-200 bg-slate-50/90"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                <div className="flex flex-col">
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Twin-AI
                  </span>
                  <span
                    className={`mt-1 font-mono text-[8px] uppercase tracking-widest ${
                      isDark ? "text-white/40" : "text-slate-400"
                    }`}
                  >
                    Front Desk Agent
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
                  isDark
                    ? "text-white/40 hover:bg-white/5 hover:text-white"
                    : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                }`}
              >
                <Minimize2 className="h-3 w-3" />
              </button>
            </div>

            <div
              className={`flex items-center justify-between border-b px-4 py-2 text-[10px] ${
                isDark
                  ? "border-white/10 bg-white/[0.02] text-white/45"
                  : "border-slate-200 bg-white/60 text-slate-500"
              }`}
            >
              <span>{statusLine}</span>
              <span>{statusMeta}</span>
            </div>

            <div
              className={`grid grid-cols-2 gap-2 border-b px-4 py-3 text-[10px] ${
                isDark
                  ? "border-white/10 bg-white/[0.02]"
                  : "border-slate-200 bg-slate-50/75"
              }`}
            >
              <div>
                <div className={isDark ? "text-white/30" : "text-slate-400"}>
                  当前方案
                </div>
                <div className={isDark ? "mt-1 text-white/75" : "mt-1 text-slate-700"}>
                  {activePresetLabel}
                </div>
              </div>
              <div>
                <div className={isDark ? "text-white/30" : "text-slate-400"}>
                  视图
                </div>
                <div className={isDark ? "mt-1 text-white/75" : "mt-1 text-slate-700"}>
                  {viewLabel}
                </div>
              </div>
            </div>

            {debugInfo ? (
              <div
                className={`border-b px-4 py-3 text-[10px] ${
                  isDark
                    ? "border-white/10 bg-white/[0.025] text-white/70"
                    : "border-slate-200 bg-white/75 text-slate-600"
                }`}
              >
                <div
                  className={`mb-2 font-mono uppercase tracking-[0.18em] ${
                    isDark ? "text-cyan-300/70" : "text-cyan-700"
                  }`}
                >
                  intake debug
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div>
                    <div className={isDark ? "text-white/35" : "text-slate-400"}>
                      workflow
                    </div>
                    <div>{debugInfo.workflow_state}</div>
                  </div>
                  <div>
                    <div className={isDark ? "text-white/35" : "text-slate-400"}>
                      skill
                    </div>
                    <div>{debugInfo.active_skill}</div>
                  </div>
                  <div>
                    <div className={isDark ? "text-white/35" : "text-slate-400"}>
                      memory
                    </div>
                    <div>{debugInfo.memory_mode}</div>
                  </div>
                  <div>
                    <div className={isDark ? "text-white/35" : "text-slate-400"}>
                      next action
                    </div>
                    <div>{debugInfo.next_action}</div>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  <div>
                    <div className={isDark ? "text-white/35" : "text-slate-400"}>
                      routing reason
                    </div>
                    <div>{debugInfo.routing_reason}</div>
                  </div>
                  <div>
                    <div className={isDark ? "text-white/35" : "text-slate-400"}>
                      single focus
                    </div>
                    <div>{debugInfo.single_focus ?? "—"}</div>
                  </div>
                  <div>
                    <div className={isDark ? "text-white/35" : "text-slate-400"}>
                      unknowns
                    </div>
                    <div>{debugInfo.unknowns.length ? debugInfo.unknowns.join(" / ") : "—"}</div>
                  </div>
                  <div>
                    <div className={isDark ? "text-white/35" : "text-slate-400"}>
                      risks
                    </div>
                    <div>{debugInfo.risks.length ? debugInfo.risks.slice(0, 2).join(" / ") : "—"}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {stageFeedback ? (
              <div
                className={`border-b px-4 py-3 ${
                  isDark
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-slate-200 bg-emerald-50/70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
                      stageFeedback.kind === "handoff"
                        ? isDark
                          ? "bg-cyan-400/15 text-cyan-300"
                          : "bg-cyan-100 text-cyan-700"
                        : isDark
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {stageFeedback.kind === "handoff" ? (
                      <ClipboardCheck className="h-4 w-4" />
                    ) : (
                      <Boxes className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[11px] font-medium ${
                        isDark ? "text-white/88" : "text-slate-900"
                      }`}
                    >
                      {stageFeedback.title}
                    </div>
                    <div
                      className={`mt-1 text-[10px] leading-5 ${
                        isDark ? "text-white/58" : "text-slate-600"
                      }`}
                    >
                      {stageFeedback.detail}
                    </div>
                    {stageFeedback.actionHref && stageFeedback.actionLabel ? (
                      <div className="mt-3">
                        <a
                          href={stageFeedback.actionHref}
                          target="_blank"
                          rel="noreferrer"
                          className={`pointer-events-auto inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] transition-all ${
                            isDark
                              ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/15"
                              : "border-cyan-200 bg-white text-cyan-700 hover:bg-cyan-50"
                          }`}
                        >
                          {stageFeedback.actionLabel}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="border-b border-black/5 px-4 py-3 dark:border-white/10">
              <div
                className={`mb-3 rounded-sm border px-3 py-2.5 ${
                  isDark
                    ? "border-white/8 bg-white/[0.025]"
                    : "border-slate-200 bg-slate-50/85"
                }`}
              >
                <div
                  className={`font-mono text-[8px] uppercase tracking-[0.24em] ${
                    isDark ? "text-white/35" : "text-slate-400"
                  }`}
                >
                  {contextGuide.eyebrow}
                </div>
                <div
                  className={`mt-1 text-[11px] font-medium ${
                    isDark ? "text-white/85" : "text-slate-900"
                  }`}
                >
                  {contextGuide.title}
                </div>
                <div
                  className={`mt-1 text-[10px] leading-5 ${
                    isDark ? "text-white/55" : "text-slate-600"
                  }`}
                >
                  {contextGuide.detail}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {contextGuide.actions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.prompt)}
                    className={`pointer-events-auto inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] transition-all ${
                      isDark
                        ? "border-white/10 bg-white/[0.03] text-white/70 hover:border-emerald-400/30 hover:text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                    }`}
                  >
                    <WandSparkles className="h-3 w-3" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-5">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex max-w-[88%] gap-3 ${
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm border ${
                        msg.role === "user"
                          ? isDark
                            ? "border-blue-500/20 bg-blue-500/10"
                            : "border-blue-200 bg-blue-50"
                          : isDark
                            ? "border-emerald-500/20 bg-emerald-500/10"
                            : "border-emerald-200 bg-emerald-50"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="h-3.5 w-3.5 text-blue-400" />
                      ) : (
                        <Bot className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div
                      className={`rounded-sm border p-3.5 text-[11px] leading-relaxed tracking-wide ${
                        msg.role === "user"
                          ? isDark
                            ? "border-blue-500/10 bg-blue-500/[0.08] text-blue-50/90"
                            : "border-blue-200 bg-blue-50 text-slate-700"
                          : isDark
                            ? "border-white/5 bg-white/[0.03] text-white/80"
                            : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading ? (
                <div className="flex justify-start">
                  <div
                    className={`rounded-sm border p-3 ${
                      isDark
                        ? "border-white/5 bg-white/[0.03]"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                          className="h-1 w-1 rounded-full bg-emerald-500"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div
              className={`border-t p-4 ${
                isDark
                  ? "border-white/10 bg-white/[0.02]"
                  : "border-slate-200 bg-slate-50/90"
              }`}
            >
              <div className="group relative">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSend()}
                  placeholder={contextGuide.placeholder}
                  className={`w-full rounded-sm border py-2.5 pl-4 pr-12 text-[11px] focus:outline-none ${
                    isDark
                      ? "border-white/10 bg-black/40 text-white placeholder:text-white/20 focus:border-emerald-500/40"
                      : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400"
                  }`}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center transition-all hover:scale-110 ${
                    isDark
                      ? "text-emerald-500 hover:text-emerald-400 disabled:text-white/10"
                      : "text-emerald-600 hover:text-emerald-500 disabled:text-slate-300"
                  }`}
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 text-center">
                {handoffUrl ? (
                  <div className="mb-2">
                    <a
                      href={handoffUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`pointer-events-auto inline-flex rounded-full border px-3 py-1 text-[10px] transition-all ${
                        isDark
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      查看实验室交接单
                    </a>
                  </div>
                ) : null}
                <span
                  className={`font-mono text-[7px] uppercase tracking-[0.3em] ${
                    isDark ? "text-white/10" : "text-slate-300"
                  }`}
                >
                  deepseek-powered-front-desk-agent
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
