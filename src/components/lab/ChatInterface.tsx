"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bot, Maximize2, Minimize2, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const seedMessages: Message[] = [
  {
    role: "assistant",
    content: "你好，我是实验室调度助手 Twin-AI。你可以问我当前系统状态、联调建议，或者下一步该接哪条 SecondMe 能力。",
  },
];

function createReply(input: string) {
  if (input.includes("chat")) {
    return "下一步建议接入 SecondMe chat 会话接口，把这里的演示输入替换成真实对话流。";
  }
  if (input.includes("note") || input.includes("记录")) {
    return "实验记录面板很适合接 SecondMe note.add，提交联调结论后同步生成结构化笔记。";
  }
  if (input.includes("状态") || input.includes("用户")) {
    return "当前工作台已经接好 OAuth 和用户信息读取，建议先把用户资料卡片与任务面板串起来。";
  }

  return "收到。这个前端界面已经迁进项目里了，下一步可以把你的业务流程逐个替换成真实的 SecondMe API 调用。";
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(seedMessages);
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    window.setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: createReply(userMessage) }]);
      setIsLoading(false);
    }, 650);
  };

  return (
    <div className={`pointer-events-none fixed bottom-6 right-6 z-50 transition-all duration-300 ${isMinimized ? "h-12 w-12" : "w-80 sm:w-96"}`}>
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            key="minimized"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsMinimized(false)}
            className="pointer-events-auto flex h-full w-full items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
          >
            <Maximize2 className="h-5 w-5" />
          </motion.button>
        ) : (
          <motion.div
            key="maximized"
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="pointer-events-auto flex h-[520px] flex-col overflow-hidden rounded-sm border border-white/10 bg-black/88 shadow-[0_32px_64px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white">Twin-AI</span>
                  <span className="mt-1 font-mono text-[8px] uppercase tracking-widest text-white/40">Lab Reception v1</span>
                </div>
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-white/40 transition-all hover:bg-white/5 hover:text-white"
              >
                <Minimize2 className="h-3 w-3" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-5">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[88%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm border ${
                      msg.role === "user" ? "border-blue-500/20 bg-blue-500/10" : "border-emerald-500/20 bg-emerald-500/10"
                    }`}>
                      {msg.role === "user" ? (
                        <User className="h-3.5 w-3.5 text-blue-400" />
                      ) : (
                        <Bot className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div
                      className={`rounded-sm border p-3.5 text-[11px] leading-relaxed tracking-wide ${
                        msg.role === "user"
                          ? "border-blue-500/10 bg-blue-500/[0.08] text-blue-50/90"
                          : "border-white/5 bg-white/[0.03] text-white/80"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading ? (
                <div className="flex justify-start">
                  <div className="rounded-sm border border-white/5 bg-white/[0.03] p-3">
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

            <div className="border-t border-white/10 bg-white/[0.02] p-4">
              <div className="group relative">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSend()}
                  placeholder="询问系统状态，或者下一步接什么能力..."
                  className="w-full rounded-sm border border-white/10 bg-black/40 py-2.5 pl-4 pr-12 text-[11px] text-white placeholder:text-white/20 focus:border-emerald-500/40 focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-emerald-500 transition-all hover:scale-110 hover:text-emerald-400 disabled:text-white/10"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 text-center">
                <span className="font-mono text-[7px] uppercase tracking-[0.3em] text-white/10">
                  secure link established
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
