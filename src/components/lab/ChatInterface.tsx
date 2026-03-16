"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Bot,
  Maximize2,
  Minimize2,
  Send,
  User,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PreviewView } from "@/engine/preview";
import type { PreviewDraft, SecondMeChatMessage } from "@/lib/intake/types";
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

const QUICK_ACTIONS: Array<{ label: string; prompt: string }> = [
  { label: "介绍实验室", prompt: "介绍一下实验室" },
  { label: "介绍当前方案", prompt: "介绍一下当前方案" },
  { label: "我想做手持设备", prompt: "我想做一个手持设备" },
  { label: "我想做桌面设备", prompt: "我想做一个桌面设备" },
];

function buildSeedMessage(isConnected: boolean, activePresetLabel: string) {
  return isConnected
    ? `你好，实验室平台已经接入 Second Me。当前主舞台正在展示“${activePresetLabel}”，你现在可以直接在这里自由对话。`
    : `你好，我是实验室前台接待助手 Twin-AI。当前主舞台正在展示“${activePresetLabel}”。你可以先告诉我想做什么嵌入式产品，我会一边聊天一边帮你收敛需求。`;
}

function buildFallbackReply(input: string, activePresetLabel: string) {
  const normalized = input.toLowerCase();

  if (normalized.includes("介绍") && normalized.includes("实验室")) {
    return "这里是一个面向嵌入式产品概念验证的实验室。我们会把产品拆成外壳、主板、屏幕、端口和内部模块，再用 3D 预览把结构直观地展示出来。";
  }

  if (normalized.includes("当前") || normalized.includes("方案")) {
    return `当前主舞台展示的是“${activePresetLabel}”。如果你愿意，我可以继续介绍它的屏幕、端口、主板布局，或者切到别的产品方向。`;
  }

  if (normalized.includes("手持")) {
    return "手持设备通常会优先考虑窄长主板、小屏幕、电池位置和侧边端口。我们现在这套预览系统已经能表达这些结构。";
  }

  if (normalized.includes("桌面")) {
    return "桌面设备通常更适合更大的壳体、更大的屏幕和更完整的接口布局，也更容易容纳摄像头、麦克风和散热结构。";
  }

  return `收到。你可以继续描述功能、交互方式或外形方向，我会基于“${activePresetLabel}”这类结构继续帮你梳理。`;
}

function toSecondMeMessages(messages: Message[]): SecondMeChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
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
            ? `你好，${visitorName}。实验室平台已经接入 Second Me，现在你可以直接在这里和我聊天。`
            : `你好，${visitorName}。当前主舞台正在展示“${activePresetLabel}”，我可以先介绍这个方案，再一起梳理你的产品需求。`
          : buildSeedMessage(isConnected, activePresetLabel),
      },
    ]);
    setSessionId(null);
    setHandoffUrl(null);
  }, [activePresetLabel, isConnected, visitorName]);

  const handleSend = async (prompt?: string) => {
    const nextInput = (prompt ?? input).trim();
    if (!nextInput || isLoading) return;

    const nextMessages = [...messages, { role: "user" as const, content: nextInput }];

    setInput("");
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      if (isConnected) {
        const response = await fetch("/api/secondme/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: toSecondMeMessages(nextMessages.slice(-12)),
          }),
        });

        if (!response.ok) {
          throw new Error("secondme chat request failed");
        }

        const payload = (await response.json()) as {
          reply?: string;
        };

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: payload.reply ?? "我在，继续聊吧。",
          },
        ]);
        return;
      }

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
      };

      setSessionId(payload.sessionId);
      setHandoffUrl(payload.handoffUrl ?? null);
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
      ? "Second Me 授权状态异常"
      : isConnected
        ? "Second Me 平台已连接"
        : "等待平台接入 Second Me";

  const statusMeta = connectedFromCallback
    ? "管理员刚完成绑定"
    : isConnected
      ? "平台直连对话模式"
      : "当前为本地接待模式";

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

            {!isConnected ? (
              <div className="border-b border-black/5 px-4 py-3 dark:border-white/10">
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((action) => (
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
            ) : null}

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
                  placeholder={
                    isConnected
                      ? "直接和 Second Me 聊天..."
                      : "告诉我你想做什么嵌入式产品，或者让我介绍当前方案..."
                  }
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
                {handoffUrl && !isConnected ? (
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
                  {isConnected ? "secondme-direct-conversation" : "showcase-guided-conversation"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
