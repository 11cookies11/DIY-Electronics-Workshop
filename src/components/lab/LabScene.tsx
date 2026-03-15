"use client";

import { Grid, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Settings, Sun, X } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ChatInterface } from "./ChatInterface";
import { THEME } from "./constants";
import { useTheme } from "./theme-context";
import { DeviceViewer } from "@/components/viewer/DeviceViewer";
import { PREVIEW_DEVICE_PRESETS } from "@/components/viewer/device-presets";
import { SceneRenderer } from "@/components/viewer/SceneRenderer";
import { buildPreviewScene, type PreviewView } from "@/engine/preview";

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
  const [view, setView] = useState<PreviewView>("assembled");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const isDark = mode === "dark";
  const bgColor = isDark ? THEME.bg : THEME.bgLight;
  const activePreset =
    PREVIEW_DEVICE_PRESETS.find((preset) => preset.id === presetId) ??
    PREVIEW_DEVICE_PRESETS[0];
  const activeScene = useMemo(
    () => buildPreviewScene(activePreset.input, view),
    [activePreset, view],
  );

  useEffect(() => {
    setSelectedNodeId(null);
  }, [presetId, view]);
  const heroCopy =
    "这是新的嵌入式产品 3D 预览系统。现在主舞台和左下控制面板都由同一套预览引擎驱动，可以直接切换设备方案、装配图和拆解图。";

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden transition-colors duration-500 ${
        isDark ? "bg-[#050505]" : "bg-[#f0f2f5]"
      }`}
    >
      <Canvas shadows dpr={[1, 2]} onPointerMissed={() => setSelectedNodeId(null)}>
        <PerspectiveCamera makeDefault position={[4.9, 4.1, 6]} fov={38} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={12}
          maxPolarAngle={Math.PI / 1.8}
          target={[0, 0, 0]}
        />
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 6, 15]} />
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
                EMBEDDED_A2A<span className="text-emerald-500">.</span>LAB
              </h1>
            </div>
            <p
              className={`max-w-xl border-l pl-4 font-mono text-[10px] uppercase tracking-[0.22em] ${
                isDark
                  ? "border-white/20 text-white/35"
                  : "border-slate-300 text-slate-500"
              }`}
            >
              {view === "exploded"
                ? "preview mode | exploded assembly"
                : "preview mode | assembled concept"}
            </p>
            <p
              className={`max-w-2xl text-sm leading-7 ${
                isDark ? "text-white/70" : "text-slate-700"
              }`}
            >
              {heroCopy}
            </p>
            <p
              className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
                isDark ? "text-cyan-300/70" : "text-cyan-700"
              }`}
            >
              active preset | {activePreset.label}
            </p>
          </div>

          <div className="pointer-events-auto flex gap-3">
            <button
              onClick={() =>
                setView((current) =>
                  current === "assembled" ? "exploded" : "assembled",
                )
              }
              className={`flex h-12 min-w-24 items-center justify-center rounded-sm border px-4 font-mono text-[10px] uppercase tracking-[0.18em] transition-all md:h-14 md:min-w-28 ${
                isDark
                  ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  : "border-slate-300 bg-white/75 text-slate-600 hover:bg-white"
              }`}
            >
              {view === "exploded" ? "合拢设备" : "拆解设备"}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`flex h-12 w-12 items-center justify-center rounded-sm border transition-all md:h-14 md:w-14 ${
                isDark
                  ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  : "border-slate-300 bg-white/75 text-slate-600 hover:bg-white"
              }`}
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-start gap-4">
          <DeviceViewer
            presetId={presetId}
            view={view}
            onPresetChange={(nextPresetId) => {
              setPresetId(nextPresetId);
              setView("assembled");
            }}
            onViewChange={setView}
          />
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
        activePresetLabel={activePreset.label}
        activeView={view}
      />
    </div>
  );
}
