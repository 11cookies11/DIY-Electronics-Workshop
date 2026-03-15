"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Bot,
  Cuboid,
  Maximize2,
  Minimize2,
  Send,
  User,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LAB_NODES, PRODUCT_TEMPLATES, type ProductTemplateId } from "./constants";
import {
  HIGHLIGHT_GROUPS,
  SHOWCASE_SCENES,
  type HighlightGroupId,
  type ShowcaseSceneId,
  useShowcase,
} from "./showcase-context";
import { useTheme } from "./theme-context";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AgentAction =
  | { type: "scene"; sceneId: ShowcaseSceneId }
  | { type: "group"; groupId: HighlightGroupId }
  | { type: "focus"; nodeId: string }
  | { type: "template"; templateId: ProductTemplateId };

type ChatInterfaceProps = {
  isConnected?: boolean;
  connectedFromCallback?: boolean;
  error?: string;
  userInfo?: Record<string, unknown> | null;
  userInfoError?: string | null;
};

const QUICK_ACTIONS: Array<{
  label: string;
  prompt: string;
}> = [
  { label: "介绍实验室", prompt: "请先介绍一下这个嵌入式实验室" },
  { label: "看主控方案", prompt: "带我看一下主控方案" },
  { label: "手持终端", prompt: "切换成手持终端形态" },
  { label: "工业控制盒", prompt: "切换成工业控制盒形态" },
];

const sceneMatchers: Array<{
  keywords: string[];
  sceneId: ShowcaseSceneId;
  reply: string;
}> = [
  {
    keywords: ["概览", "整体", "整机", "总览"],
    sceneId: "overview",
    reply: "我先切到整体概览，给你看一下设备合拢后的整机形态。",
  },
  {
    keywords: ["拆解", "结构", "拆开", "内部"],
    sceneId: "full-exploded",
    reply: "我先展开整机结构，这样你会更容易看清内部模块关系。",
  },
  {
    keywords: ["主控", "mcu", "esp32", "控制器"],
    sceneId: "mcu-demo",
    reply: "我已经切到主控方案场景，重点看 MCU 如何连接和调度其他模块。",
  },
  {
    keywords: ["传感", "检测", "imu", "mpu"],
    sceneId: "sensor-demo",
    reply: "我已经切到传感方案场景，重点看采集、处理和回传链路。",
  },
  {
    keywords: ["显示", "屏幕", "交互", "界面"],
    sceneId: "display-demo",
    reply: "我已经切到显示方案场景，重点展示多面屏幕与交互结构。",
  },
  {
    keywords: ["供电", "电池", "续航", "功耗"],
    sceneId: "power-demo",
    reply: "我已经切到供电结构场景，重点看电池和供电分发链路。",
  },
  {
    keywords: ["联网", "wifi", "通信", "远程"],
    sceneId: "network-demo",
    reply: "我已经切到联网能力场景，重点看无线通信模组与主控协同。",
  },
];

const groupMatchers: Array<{
  keywords: string[];
  groupId: HighlightGroupId;
  reply: string;
}> = [
  {
    keywords: ["主控核心", "核心", "控制核心"],
    groupId: "core-control",
    reply: "我把主控核心链路高亮了，方便你看它如何串起网络和传感模块。",
  },
  {
    keywords: ["传感采集", "采集", "传感器"],
    groupId: "sensing",
    reply: "我把传感采集链路高亮了，重点看传感器和主控之间的数据流。",
  },
  {
    keywords: ["显示交互", "多屏", "交互"],
    groupId: "display",
    reply: "我把显示交互模块高亮了，方便你直观看到屏幕布局。",
  },
  {
    keywords: ["供电系统", "供电", "电源"],
    groupId: "power",
    reply: "我把供电系统高亮了，重点看电池与核心模块的关系。",
  },
  {
    keywords: ["联网通信", "通信", "网络"],
    groupId: "connectivity",
    reply: "我把联网通信模块高亮了，方便你看无线连接能力。",
  },
];

const templateMatchers: Array<{
  keywords: string[];
  templateId: ProductTemplateId;
  reply: string;
}> = [
  {
    keywords: ["立方体", "cube", "沉浸"],
    templateId: "immersive-cube",
    reply: "我切回了沉浸立方体形态，适合展示全向多屏结构。",
  },
  {
    keywords: ["手持", "便携", "终端"],
    templateId: "handheld-terminal",
    reply: "我切到手持终端形态，方便你看便携式设备的装配方式。",
  },
  {
    keywords: ["工业", "控制盒", "控制台"],
    templateId: "industrial-console",
    reply: "我切到工业控制盒形态，重点看盒体式前屏与内部模组布局。",
  },
  {
    keywords: ["节点", "传感节点", "监测站"],
    templateId: "sensor-station",
    reply: "我切到传感节点形态，方便你看采集站式布局和供电分布。",
  },
];

const nodeMatchers = LAB_NODES.map((node) => ({
  nodeId: node.id,
  label: node.label,
  keywords: [node.label.toLowerCase(), node.id.toLowerCase()],
}));

function buildSeedMessage(isConnected: boolean) {
  return isConnected
    ? "你好，我是实验室前台接待助手 Twin-AI。这里是一个可展示嵌入式产品概念、结构拆解和模块能力的实验室，你可以告诉我想做什么产品，我会边讲边驱动 3D 模型给你看。"
    : "你好，我是实验室前台接待助手 Twin-AI。你可以先连接 SecondMe 账号，后续我会结合你的身份信息、产品想法和 3D 展示系统做更完整的讲解。";
}

function collectAgentActions(input: string): {
  reply: string;
  actions: AgentAction[];
} {
  const normalized = input.toLowerCase();
  const actions: AgentAction[] = [];
  const replyParts: string[] = [];

  const matchedTemplate = templateMatchers.find((matcher) =>
    matcher.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );
  if (matchedTemplate) {
    actions.push({ type: "template", templateId: matchedTemplate.templateId });
    replyParts.push(matchedTemplate.reply);
  }

  const matchedScene = sceneMatchers.find((matcher) =>
    matcher.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );
  if (matchedScene) {
    actions.push({ type: "scene", sceneId: matchedScene.sceneId });
    replyParts.push(matchedScene.reply);
  }

  const matchedGroup = groupMatchers.find((matcher) =>
    matcher.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );
  if (matchedGroup) {
    actions.push({ type: "group", groupId: matchedGroup.groupId });
    replyParts.push(matchedGroup.reply);
  }

  const matchedNode = nodeMatchers.find((matcher) =>
    matcher.keywords.some((keyword) => normalized.includes(keyword)),
  );
  if (matchedNode) {
    actions.push({ type: "focus", nodeId: matchedNode.nodeId });
    replyParts.push(`我再把镜头聚焦到 ${matchedNode.label}，方便你看细节。`);
  }

  if (normalized.includes("介绍") || normalized.includes("实验室")) {
    replyParts.unshift(
      "这是一个面向嵌入式产品构思与演示的实验室，我们可以把需求拆成主控、传感、显示、联网和供电几个维度来讲。",
    );
  }

  if (replyParts.length === 0) {
    replyParts.push(
      "收到。你可以继续告诉我目标产品、使用场景和想要的功能，我会整理需求，并按需要驱动 3D 模型给你看。",
    );
  }

  return {
    reply: replyParts.join(" "),
    actions,
  };
}

export function ChatInterface({
  isConnected = false,
  connectedFromCallback = false,
  error,
  userInfo,
  userInfoError,
}: ChatInterfaceProps) {
  const {
    activeSceneId,
    activeHighlightGroupId,
    activeTemplateId,
    selectedNodeId,
    applyHighlightGroup,
    focusNode,
    setTemplate,
    showScene,
  } = useShowcase();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: buildSeedMessage(isConnected) },
  ]);
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
          ? `你好，${visitorName}。欢迎来到嵌入式实验室，我可以先带你看 3D 结构，再一起梳理产品方案。`
          : buildSeedMessage(isConnected),
      },
    ]);
  }, [isConnected, visitorName]);

  const handleAgentActions = (actions: AgentAction[]) => {
    actions.forEach((action) => {
      if (action.type === "template") {
        setTemplate(action.templateId);
      }
      if (action.type === "scene") {
        showScene(action.sceneId);
      }
      if (action.type === "group") {
        applyHighlightGroup(action.groupId);
      }
      if (action.type === "focus") {
        focusNode(action.nodeId);
      }
    });
  };

  const handleSend = async (prompt?: string) => {
    const nextInput = (prompt ?? input).trim();
    if (!nextInput || isLoading) {
      return;
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: nextInput }]);
    setIsLoading(true);

    const { reply, actions } = collectAgentActions(nextInput);

    window.setTimeout(() => {
      handleAgentActions(actions);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setIsLoading(false);
    }, 650);
  };

  const statusLine =
    error || userInfoError
      ? "授权状态异常"
      : isConnected
        ? "SecondMe 已连接"
        : "等待连接 SecondMe";

  const activeSceneLabel =
    SHOWCASE_SCENES.find((scene) => scene.id === activeSceneId)?.label ?? "未选择";
  const activeGroupLabel =
    HIGHLIGHT_GROUPS.find((group) => group.id === activeHighlightGroupId)?.label ??
    "未高亮";
  const activeTemplateLabel =
    PRODUCT_TEMPLATES.find((template) => template.id === activeTemplateId)?.label ??
    "未选择";
  const activeNodeLabel =
    LAB_NODES.find((node) => node.id === selectedNodeId)?.label ?? "未聚焦";

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
              <span>
                {connectedFromCallback
                  ? "刚完成授权回调"
                  : isConnected
                    ? "接待模式已就绪"
                    : "等待身份接入"}
              </span>
            </div>

            <div
              className={`grid grid-cols-2 gap-2 border-b px-4 py-3 text-[10px] ${
                isDark
                  ? "border-white/10 bg-white/[0.02]"
                  : "border-slate-200 bg-slate-50/75"
              }`}
            >
              <div>
                <div className={isDark ? "text-white/30" : "text-slate-400"}>模板</div>
                <div className={isDark ? "mt-1 text-white/75" : "mt-1 text-slate-700"}>
                  {activeTemplateLabel}
                </div>
              </div>
              <div>
                <div className={isDark ? "text-white/30" : "text-slate-400"}>场景</div>
                <div className={isDark ? "mt-1 text-white/75" : "mt-1 text-slate-700"}>
                  {activeSceneLabel}
                </div>
              </div>
              <div>
                <div className={isDark ? "text-white/30" : "text-slate-400"}>分组</div>
                <div className={isDark ? "mt-1 text-white/75" : "mt-1 text-slate-700"}>
                  {activeGroupLabel}
                </div>
              </div>
              <div>
                <div className={isDark ? "text-white/30" : "text-slate-400"}>聚焦</div>
                <div className={isDark ? "mt-1 text-white/75" : "mt-1 text-slate-700"}>
                  {activeNodeLabel}
                </div>
              </div>
            </div>

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
                    {action.label.includes("终端") || action.label.includes("控制盒") ? (
                      <Cuboid className="h-3 w-3" />
                    ) : (
                      <WandSparkles className="h-3 w-3" />
                    )}
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
                          transition={{
                            repeat: Infinity,
                            duration: 1,
                            delay: i * 0.2,
                          }}
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
                  placeholder="告诉我你想做什么嵌入式产品，或者直接说：切到手持终端 / 工业控制盒 / 看主控 / 看联网..."
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
                <span
                  className={`font-mono text-[7px] uppercase tracking-[0.3em] ${
                    isDark ? "text-white/10" : "text-slate-300"
                  }`}
                >
                  showcase-guided conversation
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
