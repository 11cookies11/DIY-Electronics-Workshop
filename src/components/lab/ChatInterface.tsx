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
  Settings,
  User,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PreviewView } from "@/engine/preview";
import type {
  CollaborationPanel,
  ProjectCollaborationRecord,
  RoleplayAgentStatus,
} from "@/lib/intake/collaboration";
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
  onMinimizedChange?: (isMinimized: boolean) => void;
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
  { label: "实验室能做什么", prompt: "介绍一下你们实验室能做什么" },
  { label: "看看主舞台方案", prompt: "介绍一下当前方案" },
  { label: "我想做手持设备", prompt: "我想做一个手持设备" },
  { label: "我想做遥控器", prompt: "我想做一个红外万能遥控器" },
];

function buildSeedMessage(isConnected: boolean, activePresetLabel: string) {
  return isConnected
    ? `你好呀，实验室平台已经接入 Second Me 了。主舞台上现在摆着的是“${activePresetLabel}”。你先随便说想法就行，我会一边接话，一边帮你把方向慢慢收出来。`
    : `你好呀，我是实验室前台接待助手 Twin-AI。主舞台上现在摆着的是“${activePresetLabel}”。你可以先随便聊聊想做什么，我会边听边帮你把需求收成一版像样的方案。`;
}

function buildFallbackReply(input: string, activePresetLabel: string) {
  const normalized = input.toLowerCase();

  if (
    (normalized.includes("介绍") && normalized.includes("实验室")) ||
    (normalized.includes("实验室") && normalized.includes("能做"))
  ) {
    return "我们这边主要是先把嵌入式产品的想法接住，再往下帮你梳理需求、出 3D 结构草案，最后整理成实验室能继续接手的交接内容。你现在如果只有一个模糊方向，也完全可以直接跟我聊。";
  }

  if (normalized.includes("当前") || normalized.includes("方案")) {
    return `主舞台上现在展示的是“${activePresetLabel}”。如果你愿意，我可以顺手给你讲讲它的结构感觉；当然，我们也可以直接切到你的新想法。`;
  }

  if (normalized.includes("手持")) {
    return "手持设备一般会更早卡在尺寸、电池、屏幕和握持感这几个点上。你要是已经有点方向了，就直接往下说，我帮你一点点收。";
  }

  if (normalized.includes("遥控")) {
    return "遥控器这类设备我通常会先帮你收控制对象、交互方式和供电方向。你先说个大概就行，我来顺着往下理。";
  }

  if (normalized.includes("桌面")) {
    return "桌面设备通常空间会更宽裕一些，适合放更大的屏幕、更完整的接口和更多模块。你想做得更像展示终端，还是更像顺手用的小工具呀？";
  }

  return "收到呀。你继续往下说就好，我会顺着你的思路慢慢帮你整理。";
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
  onMinimizedChange,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: buildSeedMessage(isConnected, activePresetLabel) },
  ]);
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [collaborationPanel, setCollaborationPanel] = useState<CollaborationPanel | null>(null);
  const [projectRecord, setProjectRecord] = useState<ProjectCollaborationRecord | null>(null);
  const [debugInfo, setDebugInfo] = useState<IntakeDebugInfo | null>(null);
  const [stageFeedback, setStageFeedback] = useState<StageFeedback | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const showDebug = process.env.NEXT_PUBLIC_INTAKE_DEBUG === "1";
  const showCollaborationPanel =
    process.env.NEXT_PUBLIC_SHOW_COLLAB_PANEL === "1" ||
    process.env.NODE_ENV === "development";
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
    onMinimizedChange?.(isMinimized);
  }, [isMinimized, onMinimizedChange]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: visitorName
          ? isConnected
            ? `你好呀，${visitorName}。实验室平台已经接入 Second Me 了。你先随便聊聊就好，我会在合适的时候替你把方案一点点收起来。`
            : `你好呀，${visitorName}。主舞台上现在摆着的是“${activePresetLabel}”。你想到哪儿都可以直接说，我来帮你慢慢收。`
          : buildSeedMessage(isConnected, activePresetLabel),
      },
    ]);
    setSessionId(null);
    setHandoffUrl(null);
    setCollaborationPanel(null);
    setProjectRecord(null);
    setDebugInfo(null);
    setStageFeedback(null);
    setIsSettingsOpen(false);
  }, [activePresetLabel, isConnected, visitorName]);

  const contextGuide = useMemo<ContextGuide>(() => {
    if (
      !debugInfo ||
      debugInfo.workflow_state === "collecting" ||
      debugInfo.active_skill === "capability-intro" ||
      debugInfo.active_skill === "lab-intro" ||
      debugInfo.transition_mode === "stay_conversational" ||
      debugInfo.transition_mode === "answer_then_offer"
    ) {
      return {
        eyebrow: "front desk",
        title: "先把想法放过来",
        detail: "你可以先聊设备方向、使用场景，或者让我先介绍实验室这边能帮你做到哪一步。",
        placeholder: "比如说说你想做什么设备，或者你脑子里现在最清楚的那一部分...",
        actions: QUICK_ACTIONS,
      };
    }

    if (debugInfo.workflow_state === "clarifying") {
      const focus = debugInfo.single_focus ?? debugInfo.unknowns[0] ?? "关键需求";
      return {
        eyebrow: "clarifying",
        title: `先把 ${focus} 收准`,
        detail: "我先只盯一个最关键的信息点，不把这段对话聊成盘问。",
        placeholder: `补充一下${focus}，比如场景、交互、供电或核心功能...`,
        actions: [
          { label: `补充${focus}`, prompt: `我来补充一下${focus}` },
          { label: "说下使用场景", prompt: "我补充一下使用场景" },
          { label: "说下供电方式", prompt: "我补充一下供电方式" },
        ],
      };
    }

    if (false) {
      return {
        eyebrow: "preview ready",
        title: "已经能先摆一版结构",
        detail: "关键信息已经收得差不多了，现在更适合先看看 3D 方向，再顺着真实画面去调，而不是继续空聊。",
        placeholder: "如果你想继续，就直接说“可以生成预览”或者“先出一版”...",
        actions: [
          { label: "生成预览", prompt: "可以，生成预览吧" },
          { label: "先讲讲方向", prompt: "先讲讲你现在理解的方案方向" },
          { label: "我再补一点", prompt: "我再补充一点需求" },
        ],
      };
    }

    if (debugInfo.workflow_state === "preview_ready") {
      return {
        eyebrow: "preview ready",
        title: "已经能拼出一版草案",
        detail: "关键信息基本够了，现在更适合直接出个 3D 方向看看，而不是继续把问题越聊越散。",
        placeholder: "如果你想继续，就直接说“可以生成预览”或者“先出一版”...",
        actions: [
          { label: "生成预览", prompt: "可以，生成预览吧" },
          { label: "先讲讲方向", prompt: "先讲讲你现在理解的方案方向" },
          { label: "我再补一点", prompt: "我再补充一点需求" },
        ],
      };
    }

    if (false) {
      return {
        eyebrow: "preview active",
        title: "草案已经摆上主舞台了",
        detail: "现在最适合顺着画面看结构方向、提修改意见，或者干脆继续往实验室交接推进。",
        placeholder: "你可以让我调整方案，也可以直接说整理交接单...",
        actions: [
          { label: "整理交接单", prompt: "那就整理交接单吧" },
          { label: "调整方案", prompt: "我想再调整一下方案" },
          { label: "解释结构", prompt: "你介绍一下这个方案结构" },
        ],
      };
    }

    if (debugInfo.workflow_state === "preview_generated") {
      return {
        eyebrow: "preview active",
        title: "草案已经摆到主舞台了",
        detail: "现在最适合看结构方向顺不顺眼，提修改意见，或者干脆继续往实验室交接推进。",
        placeholder: "你可以让我调整方案，也可以直接说整理交接单...",
        actions: [
          { label: "整理交接单", prompt: "那就整理交接单吧" },
          { label: "调整方案", prompt: "我想再调整一下方案" },
          { label: "解释结构", prompt: "你介绍一下这个方案结构" },
        ],
      };
    }

    if (false) {
      return {
        eyebrow: "handoff ready",
        title: "已经能先收成交接稿了",
        detail: "核心内容我已经替你拢成一版了，现在更适合确认交接范围，或者补最后几个小缺口。",
        placeholder: "可以继续补充细节，或者直接打开交接单查看...",
        actions: [
          { label: "打开交接单", prompt: "我先看一下交接单" },
          { label: "补一点细节", prompt: "我再补充一点细节" },
          { label: "说明风险", prompt: "你把当前风险再讲清楚一点" },
        ],
      };
    }

    if (debugInfo.workflow_state === "handoff_ready") {
      return {
        eyebrow: "handoff ready",
        title: "已经收进交接阶段了",
        detail: "核心内容我已经替你拢好了，现在更适合确认交接范围，或者补最后几个小缺口。",
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
      detail: "你可以继续补充需求，或者让我先替你收一下当前方向。",
      placeholder: "继续补充你的想法，或者让我先总结当前方向...",
      actions: QUICK_ACTIONS,
    };
  }, [debugInfo]);

  function buildStageFeedback(args: {
    nextAction?: IntakeNextAction;
    state?: IntakeAgentState;
    previewDraft?: PreviewDraft;
    handoffUrl?: string | null;
    debug?: IntakeDebugInfo | null;
  }) {
    if (false) {
      return {
        kind: "handoff" as const,
        title: "实验室交接单已经替你收好了",
        detail: "需求摘要、风险和 preview 草案我都已经拢进去了，现在可以直接交给实验室继续往下评估。",
        actionLabel: "打开交接单",
        actionHref: args.handoffUrl ?? undefined,
      };
    }

    if (args.handoffUrl && args.state?.workflow_state === "handoff_ready") {
      return {
        kind: "handoff" as const,
        title: "实验室交接单已整理",
        detail: "需求摘要、风险和 preview 草案我都已经替你收好了，现在可以直接交给实验室继续评估。",
        actionLabel: "打开交接单",
        actionHref: args.handoffUrl,
      };
    }

    if (args.debug?.offering_handoff && args.debug.has_handoff_candidate) {
      return {
        kind: "handoff" as const,
        title: "交接内容已经能先收一版",
        detail: "我这边已经能整理出一份实验室可接手的交接内容了，只是还没正式替你打开交接单。",
      };
    }

    if (false) {
      return {
        kind: "preview" as const,
        title: "3D 草案已经替你摆出来了",
        detail: "主舞台已经切到 AI 生成方案，你现在可以直接旋转、拆解，看结构方向顺不顺眼。",
      };
    }

    if (args.previewDraft && args.nextAction === "generate_preview") {
      return {
        kind: "preview" as const,
        title: "3D 草案已生成",
        detail: "主舞台已经切到 AI 生成方案，你现在可以直接旋转、拆解，看结构方向顺不顺眼。",
      };
    }

    if (false) {
      return {
        kind: "preview" as const,
        title: "我已经先替你备好一版预览",
        detail: "现在这批信息已经够拼出一版方向了，你点头的话我就可以把 3D 草案起出来。",
      };
    }

    if (args.debug?.offering_preview && args.debug.has_preview_candidate) {
      return {
        kind: "preview" as const,
        title: "我已经悄悄备好一版预览",
        detail: "现在这批信息已经够拼出一版方向了，你点头的话我就可以把 3D 草案起出来。",
      };
    }

    return null;
  }

  function getRoleplayStatusText(status: RoleplayAgentStatus) {
    if (status === "ready") return "已可交接";
    if (status === "drafting") return "编排中";
    return "监听中";
  }

  function getRoleplayStatusClass(status: RoleplayAgentStatus) {
    if (status === "ready") {
      return isDark
        ? "border-cyan-400/35 bg-cyan-400/10 text-cyan-200"
        : "border-cyan-200 bg-cyan-50 text-cyan-700";
    }

    if (status === "drafting") {
      return isDark
        ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    return isDark
      ? "border-white/15 bg-white/[0.03] text-white/65"
      : "border-slate-200 bg-white text-slate-600";
  }

  function getCollaborationStageText(stage: CollaborationPanel["stage"] | ProjectCollaborationRecord["stage"]) {
    if (stage === "cross_agent_sync") return "跨 Agent 协同";
    if (stage === "software_planning") return "软件规划";
    if (stage === "procurement_planning") return "采购规划";
    return "前台收敛";
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getAgentLabel(id: string) {
    if (id === "front_desk") return "前台接待";
    if (id === "hardware_procurement") return "硬件采购";
    if (id === "software_lead") return "软件负责人";
    if (id === "delivery_lead") return "交付 Agent";
    return id;
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
        collaboration_panel?: CollaborationPanel;
        project_record?: ProjectCollaborationRecord | null;
        next_action?: IntakeNextAction;
          state?: IntakeAgentState;
          debug?: IntakeDebugInfo;
      };

      setSessionId(payload.sessionId);
      setHandoffUrl(payload.handoffUrl ?? null);
      setCollaborationPanel(payload.collaboration_panel ?? null);
      setProjectRecord(payload.project_record ?? null);
      setDebugInfo(payload.debug ?? null);
      setStageFeedback(
        buildStageFeedback({
          nextAction: payload.next_action,
          state: payload.state,
          previewDraft: payload.preview_input_draft,
          handoffUrl: payload.handoffUrl,
          debug: payload.debug ?? null,
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
  const showMainGuide = messages.length <= 2 || Boolean(stageFeedback);
  const canShowAgentDiscussion =
    debugInfo?.workflow_state === "preview_generated" ||
    debugInfo?.workflow_state === "handoff_ready" ||
    debugInfo?.workflow_state === "handoff_completed";

  return (
    <div
      data-chat-interface-root="true"
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
                    isDark
                      ? "text-white/40 hover:bg-white/5 hover:text-white"
                      : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
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
            </div>

            <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
              <div
                className={`rounded-sm border p-4 ${
                  isDark
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-slate-200 bg-white/80"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div
                      className={`font-mono text-[8px] uppercase tracking-[0.24em] ${
                        isDark ? "text-white/35" : "text-slate-400"
                      }`}
                    >
                      front desk status
                    </div>
                    <div
                      className={`mt-2 text-[12px] font-medium ${
                        isDark ? "text-white/88" : "text-slate-900"
                      }`}
                    >
                      {contextGuide.title}
                    </div>
                    <div
                      className={`mt-1 text-[10px] leading-5 ${
                        isDark ? "text-white/58" : "text-slate-600"
                      }`}
                    >
                      {contextGuide.detail}
                    </div>
                    {debugInfo?.has_preview_candidate || debugInfo?.has_handoff_candidate ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {debugInfo.has_preview_candidate ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] ${
                              isDark
                                ? "bg-emerald-400/10 text-emerald-300"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {debugInfo.exposed_preview
                              ? "preview 已展示"
                              : debugInfo.offering_preview
                                ? "preview 已就绪"
                                : "preview 候选已生成"}
                          </span>
                        ) : null}
                        {debugInfo.has_handoff_candidate ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] ${
                              isDark
                                ? "bg-cyan-400/10 text-cyan-300"
                                : "bg-cyan-50 text-cyan-700"
                            }`}
                          >
                            {debugInfo.exposed_handoff
                              ? "handoff 已展示"
                              : debugInfo.offering_handoff
                                ? "handoff 已就绪"
                                : "handoff 候选已生成"}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div
                    className={`rounded-full px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.22em] ${
                      isDark
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {viewLabel}
                  </div>
                </div>

                {showMainGuide ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {contextGuide.actions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleSend(action.prompt)}
                        className={`pointer-events-auto inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] transition-all ${
                          isDark
                            ? "border-white/10 bg-white/[0.03] text-white/72 hover:border-emerald-400/35 hover:text-white"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-white hover:text-emerald-700"
                        }`}
                      >
                        <WandSparkles className="h-3 w-3" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {stageFeedback ? (
                <div
                  className={`hidden rounded-sm border p-4 ${
                    isDark
                      ? "border-white/10 bg-white/[0.03]"
                      : "border-slate-200 bg-white/85"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${
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
              <div className="hidden">
                <span
                  className={`text-[10px] ${
                    isDark ? "text-white/28" : "text-slate-400"
                  }`}
                >
                  {contextGuide.eyebrow === "front desk"
                    ? "先随便说想法也没关系"
                    : `现在先收一下：${contextGuide.title}`}
                </span>
                <span
                  className={`font-mono text-[7px] uppercase tracking-[0.3em] ${
                    isDark ? "text-white/10" : "text-slate-300"
                  }`}
                >
                  deepseek-powered-front-desk-agent
                </span>
              </div>
            </div>

            <AnimatePresence>
              {isSettingsOpen ? (
                <>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsSettingsOpen(false)}
                    className="absolute inset-0 z-10 bg-black/35 backdrop-blur-[2px]"
                  />
                  <motion.div
                    initial={{ x: 24, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 24, opacity: 0 }}
                    className={`absolute inset-y-0 right-0 z-20 w-[86%] max-w-[340px] overflow-y-auto border-l p-4 ${
                      isDark
                        ? "border-white/10 bg-[#080808]/96"
                        : "border-slate-200 bg-white/98"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div
                          className={`font-mono text-[9px] uppercase tracking-[0.22em] ${
                            isDark ? "text-white/35" : "text-slate-400"
                          }`}
                        >
                          settings
                        </div>
                        <div
                          className={`mt-1 text-sm font-medium ${
                            isDark ? "text-white/88" : "text-slate-900"
                          }`}
                        >
                          聊天侧栏信息
                        </div>
                      </div>
                      <button
                        onClick={() => setIsSettingsOpen(false)}
                        className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                          isDark
                            ? "text-white/45 hover:bg-white/5 hover:text-white"
                            : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        }`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 space-y-4">
                      <section
                        className={`rounded-sm border p-3 ${
                          isDark
                            ? "border-white/10 bg-white/[0.02]"
                            : "border-slate-200 bg-slate-50/85"
                        }`}
                      >
                        <div className={`text-[10px] ${isDark ? "text-white/35" : "text-slate-400"}`}>
                          运行状态
                        </div>
                        <div className={`mt-1 text-[11px] ${isDark ? "text-white/80" : "text-slate-700"}`}>
                          {statusLine}
                        </div>
                        <div className={`mt-1 text-[10px] ${isDark ? "text-white/45" : "text-slate-500"}`}>
                          {statusMeta}
                        </div>
                      </section>

                      <section
                        className={`rounded-sm border p-3 ${
                          isDark
                            ? "border-white/10 bg-white/[0.02]"
                            : "border-slate-200 bg-slate-50/85"
                        }`}
                      >
                        <div className={`text-[10px] ${isDark ? "text-white/35" : "text-slate-400"}`}>
                          场景信息
                        </div>
                        <div className={`mt-2 text-[10px] ${isDark ? "text-white/35" : "text-slate-400"}`}>
                          当前方案
                        </div>
                        <div className={`mt-1 text-[11px] ${isDark ? "text-white/80" : "text-slate-700"}`}>
                          {activePresetLabel}
                        </div>
                        <div className={`mt-3 text-[10px] ${isDark ? "text-white/35" : "text-slate-400"}`}>
                          视图
                        </div>
                        <div className={`mt-1 text-[11px] ${isDark ? "text-white/80" : "text-slate-700"}`}>
                          {viewLabel}
                        </div>
                      </section>

                      {stageFeedback ? (
                        <section
                          className={`hidden rounded-sm border p-3 ${
                            isDark
                              ? "border-white/10 bg-white/[0.02]"
                              : "border-slate-200 bg-slate-50/85"
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
                        </section>
                      ) : null}

                      <section
                        className={`rounded-sm border p-3 ${
                          isDark
                            ? "border-white/10 bg-white/[0.02]"
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
                        <div className="mt-3 flex flex-wrap gap-2">
                          {contextGuide.actions.map((action) => (
                            <button
                              key={action.label}
                              onClick={() => {
                                setIsSettingsOpen(false);
                                handleSend(action.prompt);
                              }}
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
                      </section>

                      {collaborationPanel && showCollaborationPanel ? (
                        <section
                          className={`rounded-sm border p-3 ${
                            isDark
                              ? "border-white/10 bg-white/[0.02]"
                              : "border-slate-200 bg-slate-50/85"
                          }`}
                        >
                          <div className={`text-[10px] ${isDark ? "text-white/35" : "text-slate-400"}`}>
                            多 Agent 协作（角色扮演）
                          </div>
                          <div className={`mt-1 text-[10px] ${isDark ? "text-white/45" : "text-slate-500"}`}>
                            当前阶段：{getCollaborationStageText(collaborationPanel!.stage)}
                          </div>
                          <div className="mt-2 space-y-2">
                            {collaborationPanel!.agents.map((agent) => (
                              <div
                                key={agent.id}
                                className={`rounded-sm border p-2.5 ${
                                  isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-white"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <div className={`text-[11px] font-medium ${isDark ? "text-white/85" : "text-slate-900"}`}>
                                      {agent.name}
                                    </div>
                                    <div className={`mt-0.5 text-[10px] ${isDark ? "text-white/45" : "text-slate-500"}`}>
                                      {agent.role}
                                    </div>
                                  </div>
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] ${getRoleplayStatusClass(agent.status)}`}
                                  >
                                    {getRoleplayStatusText(agent.status)}
                                  </span>
                                </div>
                                <div className={`mt-2 text-[10px] leading-5 ${isDark ? "text-white/58" : "text-slate-600"}`}>
                                  {agent.handoff_preview}
                                </div>
                                {collaborationPanel!.profiles
                                  .filter((profile) => profile.id === agent.id)
                                  .map((profile) => (
                                    <div key={profile.id} className="mt-2 space-y-1">
                                      <div className={`text-[10px] ${isDark ? "text-white/42" : "text-slate-500"}`}>
                                        身份：{profile.identity}
                                      </div>
                                      <div className={`text-[10px] ${isDark ? "text-white/42" : "text-slate-500"}`}>
                                        能力：{profile.capabilities.slice(0, 2).join("；")}
                                      </div>
                                      <div className={`text-[10px] ${isDark ? "text-white/36" : "text-slate-400"}`}>
                                        边界：{profile.boundaries.join("；")}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ))}
                          </div>
                        </section>
                      ) : null}

                      {canShowAgentDiscussion && projectRecord ? (
                        <section
                          className={`rounded-sm border p-3 ${
                            isDark
                              ? "border-white/10 bg-white/[0.02]"
                              : "border-slate-200 bg-slate-50/85"
                          }`}
                        >
                          <div className={`text-[10px] ${isDark ? "text-white/35" : "text-slate-400"}`}>
                            项目协作记录
                          </div>
                          <div className={`mt-1 text-[10px] ${isDark ? "text-white/45" : "text-slate-500"}`}>
                            阶段：{getCollaborationStageText(projectRecord.stage)}
                          </div>
                          <div className="mt-2 space-y-2">
                            {projectRecord.timeline
                              .slice(-5)
                              .reverse()
                              .map((event) => (
                                <div
                                  key={event.id}
                                  className={`rounded-sm border p-2 ${
                                    isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-white"
                                  }`}
                                >
                                  <div className={`text-[10px] ${isDark ? "text-white/45" : "text-slate-500"}`}>
                                    {formatTime(event.ts)} · {event.from} → {event.to.join(" / ")}
                                  </div>
                                  <div className={`mt-1 text-[10px] leading-5 ${isDark ? "text-white/65" : "text-slate-700"}`}>
                                    {event.summary}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </section>
                      ) : null}

                      {handoffUrl ? (
                        <section
                          className={`rounded-sm border p-3 ${
                            isDark
                              ? "border-white/10 bg-white/[0.02]"
                              : "border-slate-200 bg-slate-50/85"
                          }`}
                        >
                          <div className={`text-[10px] ${isDark ? "text-white/35" : "text-slate-400"}`}>
                            交接入口
                          </div>
                          <div className="mt-3">
                            <a
                              href={handoffUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`pointer-events-auto inline-flex rounded-full border px-3 py-1.5 text-[10px] transition-all ${
                                isDark
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                                  : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              查看实验室交接单
                            </a>
                          </div>
                        </section>
                      ) : null}

                      {showDebug && debugInfo ? (
                        <section
                          className={`rounded-sm border p-3 text-[10px] ${
                            isDark
                              ? "border-white/10 bg-white/[0.02] text-white/70"
                              : "border-slate-200 bg-slate-50/85 text-slate-600"
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
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                llm stage
                              </div>
                              <div>{debugInfo.llm_native_stage ?? "n/a"}</div>
                            </div>
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                llm next
                              </div>
                              <div>{debugInfo.llm_native_next_action ?? "n/a"}</div>
                            </div>
                          </div>
                          <div className="mt-2 space-y-2">
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                preview candidate
                              </div>
                              <div>
                                {debugInfo.has_preview_candidate
                                  ? debugInfo.exposed_preview
                                    ? "exposed"
                                    : debugInfo.offering_preview
                                      ? "offering"
                                      : "candidate"
                                  : "—"}
                              </div>
                            </div>
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                handoff candidate
                              </div>
                              <div>
                                {debugInfo.has_handoff_candidate
                                  ? debugInfo.exposed_handoff
                                    ? "exposed"
                                    : debugInfo.offering_handoff
                                      ? "offering"
                                      : "candidate"
                                  : "—"}
                              </div>
                            </div>
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                routing reason
                              </div>
                              <div>{debugInfo.routing_reason}</div>
                            </div>
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                llm ready
                              </div>
                              <div>
                                {debugInfo.llm_native_preview_ready || debugInfo.llm_native_handoff_ready
                                  ? [
                                      debugInfo.llm_native_preview_ready ? "preview" : null,
                                      debugInfo.llm_native_handoff_ready ? "handoff" : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" / ")
                                  : "n/a"}
                              </div>
                            </div>
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                single focus
                              </div>
                              <div>{debugInfo.single_focus ?? "—"}</div>
                            </div>
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                llm focus
                              </div>
                              <div>{debugInfo.llm_native_single_focus ?? "n/a"}</div>
                            </div>
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                llm unknowns
                              </div>
                              <div>
                                {debugInfo.llm_native_unknowns?.length
                                  ? debugInfo.llm_native_unknowns.join(" / ")
                                  : "n/a"}
                              </div>
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
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                reasoning
                              </div>
                              <div>
                                {debugInfo.reasoning_trace?.enabled
                                  ? debugInfo.reasoning_trace.confidence ?? "enabled"
                                  : "disabled"}
                              </div>
                            </div>
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                patch fields
                              </div>
                              <div>
                                {debugInfo.reasoning_trace?.applied_fields.length
                                  ? debugInfo.reasoning_trace.applied_fields.join(" / ")
                                  : "—"}
                              </div>
                            </div>
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                replaced fields
                              </div>
                              <div>
                                {debugInfo.reasoning_trace?.replaced_fields.length
                                  ? debugInfo.reasoning_trace.replaced_fields.join(" / ")
                                  : "—"}
                              </div>
                            </div>
                            <div>
                              <div className={isDark ? "text-white/35" : "text-slate-400"}>
                                reasoning notes
                              </div>
                              <div>
                                {debugInfo.reasoning_trace?.notes.length
                                  ? debugInfo.reasoning_trace.notes.slice(0, 2).join(" / ")
                                  : "—"}
                              </div>
                            </div>
                          </div>
                        </section>
                      ) : null}
                    </div>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
