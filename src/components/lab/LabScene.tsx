"use client";

import { Grid, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Moon, Settings, Sun, User, X } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatInterface } from "./ChatInterface";
import { THEME } from "./constants";
import { useTheme } from "./theme-context";
import { PREVIEW_DEVICE_PRESETS } from "@/components/viewer/device-presets";
import { SceneRenderer } from "@/components/viewer/SceneRenderer";
import {
  buildPreviewScene,
  type PreviewInput,
  type PreviewView,
} from "@/engine/preview";
import type { PreviewDraft } from "@/lib/intake/types";

const AUTO_ROTATE_SECONDS_PER_LOOP = 15;
const AUTO_MODE_IDLE_RESUME_MS = 10_000;
const AUTO_VIEW_SWITCH_MS = AUTO_ROTATE_SECONDS_PER_LOOP * 1000;
const AUTO_ROTATE_SPEED = 60 / AUTO_ROTATE_SECONDS_PER_LOOP;
const DEFAULT_DEMO_BRAND = "SECONDME EMBEDDED DEMO";

type LabSceneProps = {
  isConnected: boolean;
  connectedFromCallback: boolean;
  error?: string;
  userInfo?: Record<string, unknown> | null;
  userInfoError?: string | null;
};

export function LabScene({
  isConnected,
  connectedFromCallback,
  error,
  userInfo,
  userInfoError,
}: LabSceneProps) {
  const { mode, toggleTheme } = useTheme();
  const [presetId, setPresetId] = useState(PREVIEW_DEVICE_PRESETS[0].id);
  const [view, setView] = useState<PreviewView>("exploded");
  const [isPreviewAutoMode, setIsPreviewAutoMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [generatedPreview, setGeneratedPreview] = useState<PreviewDraft | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const idleResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDark = mode === "dark";
  const bgColor = isDark ? THEME.bg : THEME.bgLight;
  const activePreset =
    PREVIEW_DEVICE_PRESETS.find((preset) => preset.id === presetId) ??
    PREVIEW_DEVICE_PRESETS[0];
  const activePreviewInput: PreviewInput =
    generatedPreview?.input ?? activePreset.input;
  const activePresetLabel = generatedPreview ? "AI 生成方案" : activePreset.label;
  const activeScene = useMemo(
    () => buildPreviewScene(activePreviewInput, view),
    [activePreviewInput, view],
  );
  const titleText =
    process.env.NEXT_PUBLIC_DEMO_TITLE?.trim() || "DIY电子产品工坊";
  const viewText = view === "exploded" ? "拆解视图" : "装配视图";
  const previewModeText = isPreviewAutoMode
    ? `自动预览（${AUTO_ROTATE_SECONDS_PER_LOOP}秒/圈）`
    : "手动预览";
  const productionHeroCopy = generatedPreview
    ? `当前展示「${activePresetLabel}」，可继续在右侧对话中细化需求，系统会同步更新结构预览与交付信息。`
    : `当前展示「${activePresetLabel}」。前台会在对话中收集需求，系统同步生成 3D 结构预览与协作信息。`;

  useEffect(() => {
    setSelectedNodeId(null);
  }, [presetId, view, generatedPreview]);

  const markUserActivity = useCallback(() => {
    setIsPreviewAutoMode(false);
    if (idleResumeTimerRef.current) {
      clearTimeout(idleResumeTimerRef.current);
    }
    idleResumeTimerRef.current = setTimeout(() => {
      setIsPreviewAutoMode(true);
    }, AUTO_MODE_IDLE_RESUME_MS);
  }, []);

  const isFromChatInterface = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('[data-chat-interface-root="true"]'));
  }, []);

  const markUserActivityFromGlobalEvent = useCallback(
    (event: Event) => {
      if (isFromChatInterface(event.target)) {
        return;
      }
      markUserActivity();
    },
    [isFromChatInterface, markUserActivity],
  );

  useEffect(() => {
    const eventOptions = { passive: true } as const;
    window.addEventListener("pointerdown", markUserActivityFromGlobalEvent, eventOptions);
    window.addEventListener("wheel", markUserActivityFromGlobalEvent, eventOptions);
    window.addEventListener("touchstart", markUserActivityFromGlobalEvent, eventOptions);
    window.addEventListener("keydown", markUserActivityFromGlobalEvent);
    return () => {
      window.removeEventListener("pointerdown", markUserActivityFromGlobalEvent);
      window.removeEventListener("wheel", markUserActivityFromGlobalEvent);
      window.removeEventListener("touchstart", markUserActivityFromGlobalEvent);
      window.removeEventListener("keydown", markUserActivityFromGlobalEvent);
    };
  }, [markUserActivityFromGlobalEvent]);

  useEffect(() => {
    if (!isPreviewAutoMode) return;
    const timer = setInterval(() => {
      setView((current) => (current === "assembled" ? "exploded" : "assembled"));
    }, AUTO_VIEW_SWITCH_MS);
    return () => {
      clearInterval(timer);
    };
  }, [isPreviewAutoMode]);

  useEffect(() => {
    return () => {
      if (idleResumeTimerRef.current) {
        clearTimeout(idleResumeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current) return;
      const target = event.target;
      if (target instanceof Node && !accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);
  const heroCopy =
    "这是新的嵌入式产品 3D 预览系统。现在主舞台和左下控制面板都由同一套预览引擎驱动，可以直接切换设备方案、装配图和拆解图。";

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden transition-colors duration-500 ${
        isDark ? "bg-[#050505]" : "bg-[#f0f2f5]"
      }`}
    >
      <Canvas shadows dpr={[1, 2]} onPointerMissed={() => setSelectedNodeId(null)}>
        <PerspectiveCamera makeDefault position={[4.3, 3.7, 5.2]} fov={34} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={12}
          maxPolarAngle={Math.PI / 1.8}
          autoRotate={isPreviewAutoMode}
          autoRotateSpeed={AUTO_ROTATE_SPEED}
          onStart={markUserActivity}
          target={[0, 0, 0]}
        />
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 10, 24]} />
        <ambientLight intensity={isDark ? 0.82 : 0.92} />
        <pointLight position={[10, 10, 10]} intensity={isDark ? 1.35 : 0.55} />
        <pointLight
          position={[-6, 4, 6]}
          intensity={isDark ? 0.65 : 0.24}
          color="#3ddcff"
        />
        <spotLight
          position={[-10, 10, 10]}
          angle={0.15}
          penumbra={1}
          intensity={isDark ? 2.1 : 0.9}
          castShadow
        />
        <Grid
          infiniteGrid
          fadeDistance={20}
          fadeStrength={3}
          cellSize={0.5}
          sectionSize={2.5}
          sectionColor={isDark ? "#111" : "#d5d9de"}
          cellColor={isDark ? "#080808" : "#e7eaee"}
          position={[0, -4, 0]}
        />
        <Suspense fallback={null}>
          <group scale={0.015}>
            <SceneRenderer
              scene={activeScene}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          </group>
          <EffectComposer>
            <Bloom
              luminanceThreshold={1}
              mipmapBlur
              intensity={isDark ? 0.8 : 0.4}
              radius={0.3}
            />
            <Vignette
              eskil={false}
              offset={0.1}
              darkness={isDark ? 1.05 : 0.45}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 sm:p-8 lg:p-10">
        <div className={`scanline ${isDark ? "opacity-100" : "opacity-15"}`} />

        <div className="flex justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`h-3 w-3 rounded-full ${
                    view === "exploded" ? "bg-blue-500" : "bg-emerald-500"
                  } animate-pulse`}
                />
                <div
                  className={`absolute inset-0 h-3 w-3 rounded-full ${
                    view === "exploded" ? "bg-blue-500" : "bg-emerald-500"
                  } animate-ping opacity-20`}
                />
              </div>
              <h1
                className={`font-mono text-2xl font-medium leading-none tracking-tighter ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {titleText}
              </h1>
            </div>
            <p
              className={`max-w-xl border-l pl-4 font-mono text-[10px] uppercase tracking-[0.22em] ${
                isDark
                  ? "border-white/20 text-white/35"
                  : "border-slate-300 text-slate-500"
              }`}
            >
              {`当前模式 | ${viewText} | ${previewModeText}`}
            </p>
            <p
              className={`max-w-2xl text-sm leading-7 ${
                isDark ? "text-white/70" : "text-slate-700"
              }`}
            >
              {productionHeroCopy}
            </p>
            <p
              className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
                isDark ? "text-cyan-300/70" : "text-cyan-700"
              }`}
            >
              当前展示设备 | {activePresetLabel}
            </p>
          </div>

          <div
            className={`pointer-events-auto fixed bottom-6 z-[70] ${
              isChatMinimized ? "right-24" : "right-[22rem] sm:right-[26.5rem]"
            }`}
          >
            <button
              onClick={() => {
                markUserActivity();
                setView((current) =>
                  current === "assembled" ? "exploded" : "assembled",
                );
              }}
              className={`flex h-12 min-w-24 items-center justify-center rounded-sm border px-4 font-mono text-[10px] uppercase tracking-[0.18em] transition-all md:h-14 md:min-w-28 ${
                isDark
                  ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  : "border-slate-300 bg-white/75 text-slate-600 hover:bg-white"
              }`}
            >
              {view === "exploded" ? "合拢设备" : "拆解设备"}
            </button>
          </div>
          <div className="pointer-events-auto fixed right-6 top-4 z-[70] sm:right-8 sm:top-6 lg:right-10 lg:top-7">
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setIsAccountMenuOpen((current) => !current)}
                className={`group flex h-12 items-center gap-2 px-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-all md:h-14 ${
                  isDark
                    ? "text-white/60 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                aria-label="账号菜单"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    isDark
                      ? "bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white"
                      : "bg-white/70 text-slate-600 group-hover:bg-white group-hover:text-slate-900"
                  }`}
                >
                  <User size={14} />
                </span>
                <span className="tracking-[0.16em]">account</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {isAccountMenuOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`absolute right-0 top-[calc(100%+8px)] z-40 w-44 rounded-sm border p-1 shadow-xl ${
                      isDark
                        ? "border-white/10 bg-[#0b0b0b]"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    <a
                      href="/account"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className={`flex h-9 items-center rounded-sm px-3 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                        isDark
                          ? "text-white/70 hover:bg-white/10 hover:text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      账号中心
                    </a>
                    <button
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        setIsSettingsOpen(true);
                      }}
                      className={`flex h-9 w-full items-center rounded-sm px-3 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                        isDark
                          ? "text-white/70 hover:bg-white/10 hover:text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      系统设置
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSettingsOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-md overflow-hidden rounded-lg border shadow-2xl ${
                isDark
                  ? "border-white/10 bg-[#0a0a0a]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b px-6 py-4 ${
                  isDark ? "border-white/10" : "border-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings
                    className={isDark ? "text-white/40" : "text-slate-400"}
                    size={18}
                  />
                  <h2
                    className={`font-mono text-sm font-bold uppercase tracking-widest ${
                      isDark ? "text-white" : "text-slate-800"
                    }`}
                  >
                    system settings
                  </h2>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className={`rounded-full p-1 transition-colors ${
                    isDark
                      ? "text-white/40 hover:bg-white/10"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-8 p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-widest ${
                        isDark ? "text-white/40" : "text-slate-400"
                      }`}
                    >
                      visual style
                    </span>
                    <span
                      className={`font-mono text-[10px] ${
                        isDark ? "text-emerald-500" : "text-blue-500"
                      }`}
                    >
                      {mode.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => mode !== "dark" && toggleTheme()}
                      className={`flex flex-col items-center gap-3 rounded-md border p-4 transition-all ${
                        isDark
                          ? "border-emerald-500/50 bg-white/5 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      <Moon size={24} className={isDark ? "text-emerald-400" : ""} />
                      <span className="font-mono text-[10px] uppercase">深色模式</span>
                    </button>
                    <button
                      onClick={() => mode !== "light" && toggleTheme()}
                      className={`flex flex-col items-center gap-3 rounded-md border p-4 transition-all ${
                        !isDark
                          ? "border-blue-500/50 bg-blue-50 text-slate-800"
                          : "border-white/10 bg-white/5 text-white/40 hover:border-white/20"
                      }`}
                    >
                      <Sun size={24} className={!isDark ? "text-blue-500" : ""} />
                      <span className="font-mono text-[10px] uppercase">浅色模式</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <div
        className={`pointer-events-none absolute left-0 top-0 m-6 h-24 w-24 border-l border-t ${
          isDark ? "border-white/10" : "border-slate-200"
        }`}
      />
      <div
        className={`pointer-events-none absolute right-0 top-0 m-6 h-24 w-24 border-r border-t ${
          isDark ? "border-white/10" : "border-slate-200"
        }`}
      />
      <div
        className={`pointer-events-none absolute bottom-0 left-0 m-6 h-24 w-24 border-b border-l ${
          isDark ? "border-white/10" : "border-slate-200"
        }`}
      />
      <div
        className={`pointer-events-none absolute bottom-0 right-0 m-6 h-24 w-24 border-b border-r ${
          isDark ? "border-white/10" : "border-slate-200"
        }`}
      />

      <ChatInterface
        isConnected={isConnected}
        connectedFromCallback={connectedFromCallback}
        error={error}
        userInfo={userInfo}
        userInfoError={userInfoError}
        activePresetLabel={activePresetLabel}
        activeView={view}
        onMinimizedChange={setIsChatMinimized}
        onPreviewDraft={(draft) => {
          setGeneratedPreview(draft);
          setView("assembled");
          setSelectedNodeId(null);
        }}
      />
    </div>
  );
}
