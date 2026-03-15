"use client";

import { Layers3, MonitorSmartphone, Move3D, Router } from "lucide-react";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { buildPreviewScene, type PreviewView } from "@/engine/preview";
import { describePreviewModule, PREVIEW_DEVICE_PRESETS } from "./device-presets";
import { SceneRenderer } from "./SceneRenderer";

export function DeviceViewer({
  presetId,
  view,
  onPresetChange,
  onViewChange,
}: {
  presetId: string;
  view: PreviewView;
  onPresetChange: (presetId: string) => void;
  onViewChange: (view: PreviewView) => void;
}) {
  const activePreset =
    PREVIEW_DEVICE_PRESETS.find((preset) => preset.id === presetId) ??
    PREVIEW_DEVICE_PRESETS[0];
  const scene = buildPreviewScene(activePreset.input, view);
  const screenConfig = activePreset.input.mainScreen;
  const boardConfig = activePreset.input.board;
  const portsCount = activePreset.input.ports?.length ?? 0;
  const modulesCount = activePreset.input.modules.length;

  return (
    <section className="pointer-events-auto w-[380px] rounded-sm border border-slate-200 bg-white/90 p-4 shadow-[0_24px_60px_rgba(148,163,184,0.18)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            preview engine
          </p>
          <h2 className="mt-2 text-base font-semibold text-slate-900">产品方案切换台</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            点击不同设备方案，中间主舞台和这里的小窗会同步切换。
          </p>
        </div>
        <button
          onClick={() =>
            onViewChange(view === "assembled" ? "exploded" : "assembled")
          }
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <Move3D size={14} />
          {view === "assembled" ? "切到拆解图" : "切回装配图"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {PREVIEW_DEVICE_PRESETS.map((preset) => {
          const active = preset.id === activePreset.id;

          return (
            <button
              key={preset.id}
              onClick={() => onPresetChange(preset.id)}
              className={`rounded-md border px-3 py-3 text-left transition ${
                active
                  ? "border-cyan-300 bg-cyan-50 shadow-[0_10px_24px_rgba(34,211,238,0.16)]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-900">{preset.label}</div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    active
                      ? "bg-cyan-100 text-cyan-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {preset.input.shell}
                </span>
              </div>
              <div className="mt-2 text-[11px] leading-4 text-slate-500">
                {preset.description}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-md border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(103,232,249,0.22),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">{activePreset.label}</div>
            <div className="mt-1 text-[11px] text-slate-500">{activePreset.description}</div>
          </div>
          <div className="rounded-full bg-white/75 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {view === "assembled" ? "assembled" : "exploded"}
          </div>
        </div>

        <div className="mt-3 h-[220px] overflow-hidden rounded-md border border-white/60 bg-white/30">
          <Canvas dpr={[1, 2]}>
            <PerspectiveCamera makeDefault position={[120, 95, 150]} fov={34} />
            <OrbitControls enableDamping dampingFactor={0.08} />
            <ambientLight intensity={1.2} />
            <pointLight position={[120, 120, 120]} intensity={24000} />
            <pointLight position={[-120, 80, 40]} intensity={12000} color="#67e8f9" />
            <group scale={0.015}>
              <SceneRenderer scene={scene} />
            </group>
          </Canvas>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="flex items-center gap-2 text-slate-500">
            <Layers3 size={14} />
            <span className="font-mono text-[10px] uppercase tracking-widest">Modules</span>
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{modulesCount}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="flex items-center gap-2 text-slate-500">
            <Router size={14} />
            <span className="font-mono text-[10px] uppercase tracking-widest">Ports</span>
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{portsCount}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="flex items-center gap-2 text-slate-500">
            <MonitorSmartphone size={14} />
            <span className="font-mono text-[10px] uppercase tracking-widest">Screen</span>
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {screenConfig?.type ?? "none"}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">
            shell
          </span>
          <span className="mt-1 block">
            {activePreset.input.shellSize.width} x {activePreset.input.shellSize.height} x{" "}
            {activePreset.input.shellSize.depth}
          </span>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">
            board
          </span>
          <span className="mt-1 block">
            {boardConfig.sizeMm?.width ?? "auto"} x {boardConfig.sizeMm?.depth ?? "auto"} x{" "}
            {boardConfig.sizeMm?.thickness ?? 2}
          </span>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">
            board grid
          </span>
          <span className="mt-1 block">
            {boardConfig.grid?.cols ?? 6} x {boardConfig.grid?.rows ?? 6}
          </span>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">
            screen size
          </span>
          <span className="mt-1 block">
            {screenConfig?.sizeMm
              ? `${screenConfig.sizeMm.width} x ${screenConfig.sizeMm.height} x ${screenConfig.sizeMm.depth}`
              : "default"}
          </span>
        </div>
        <div className="col-span-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">
            ports
          </span>
          <span className="mt-1 block leading-5">
            {activePreset.input.ports?.length
              ? activePreset.input.ports
                  .map((port) => `${port.type ?? "usb_c"} @ ${port.face}`)
                  .join(" / ")
              : "none"}
          </span>
        </div>
        <div className="col-span-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">
            modules
          </span>
          <span className="mt-1 block leading-5">
            {activePreset.input.modules.map(describePreviewModule).join(", ")}
          </span>
        </div>
      </div>
    </section>
  );
}
