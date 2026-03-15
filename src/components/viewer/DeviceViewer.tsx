"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { buildPreviewScene, type PreviewInput, type PreviewView } from "@/engine/preview";
import { SceneRenderer } from "./SceneRenderer";

const DEMO_INPUT: PreviewInput = {
  shell: "cuboid",
  shellSize: {
    width: 120,
    height: 60,
    depth: 90,
  },
  board: "center",
  mainScreen: "front",
  ports: ["right", "right"],
  modules: ["esp32", "battery", "wifi", "temp_sensor", "relay_module"],
};

export function DeviceViewer() {
  const [view, setView] = useState<PreviewView>("assembled");
  const scene = useMemo(() => buildPreviewScene(DEMO_INPUT, view), [view]);

  return (
    <section className="pointer-events-auto w-[360px] rounded-sm border border-slate-200 bg-white/88 p-4 shadow-[0_24px_60px_rgba(148,163,184,0.18)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            preview engine
          </p>
          <h2 className="mt-2 text-sm font-medium text-slate-900">
            规则布局验证
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            固定输入：长方体壳体、前屏、右侧接口、中心主板与 5 个内部模块。
          </p>
        </div>
        <button
          onClick={() =>
            setView((current) =>
              current === "assembled" ? "exploded" : "assembled",
            )
          }
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700 transition hover:bg-slate-100"
        >
          {view === "assembled" ? "切换爆炸图" : "切回装配图"}
        </button>
      </div>

      <div className="mt-4 h-[260px] overflow-hidden rounded-sm border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(103,232,249,0.22),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]">
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

      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
        <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">
            shell
          </span>
          <span className="mt-1 block">`cuboid` / `120 x 60 x 90`</span>
        </div>
        <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">
            board
          </span>
          <span className="mt-1 block">中心主板 + 6x6 网格</span>
        </div>
        <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">
            screen
          </span>
          <span className="mt-1 block">主屏挂载在 `front`</span>
        </div>
        <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">
            ports
          </span>
          <span className="mt-1 block">接口挂载在 `right`</span>
        </div>
      </div>
    </section>
  );
}
