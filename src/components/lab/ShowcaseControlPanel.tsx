"use client";

import { Cuboid, Dices, RotateCcw, Sparkles } from "lucide-react";
import {
  DEMO_RECIPES,
  HIGHLIGHT_GROUPS,
  PRODUCT_TEMPLATES,
  SHOWCASE_SCENES,
  useShowcase,
} from "./showcase-context";
import { useTheme } from "./theme-context";

export function ShowcaseControlPanel() {
  const {
    activeDemoRecipeId,
    activeSceneId,
    activeHighlightGroupId,
    activeTemplateId,
    applyDemoRecipe,
    applyHighlightGroup,
    applyRandomDemoRecipe,
    setTemplate,
    showScene,
    resetShowcase,
  } = useShowcase();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const activeGroup =
    HIGHLIGHT_GROUPS.find((group) => group.id === activeHighlightGroupId) ?? null;
  const activeTemplate =
    PRODUCT_TEMPLATES.find((template) => template.id === activeTemplateId) ?? null;

  return (
    <section
      className={`pointer-events-auto w-[380px] rounded-sm border p-4 backdrop-blur-xl ${
        isDark
          ? "border-white/10 bg-black/62 shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
          : "border-slate-200 bg-white/82 shadow-[0_24px_60px_rgba(148,163,184,0.22)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
              isDark ? "text-white/35" : "text-slate-500"
            }`}
          >
            showcase controls
          </p>
          <h2
            className={`mt-2 text-sm font-medium ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            3D 展示控制台
          </h2>
          <p
            className={`mt-1 text-xs leading-5 ${
              isDark ? "text-white/45" : "text-slate-500"
            }`}
          >
            先试试下面几种样板方案，再切换模板、场景和讲解分组看细节。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={applyRandomDemoRecipe}
            className={`flex h-10 w-10 items-center justify-center rounded-sm border transition-all ${
              isDark
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
            title="随机演示一个样板方案"
          >
            <Dices size={16} />
          </button>
          <button
            onClick={resetShowcase}
            className={`flex h-10 w-10 items-center justify-center rounded-sm border transition-all ${
              isDark
                ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-800"
            }`}
            title="重置展示状态"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="mt-5">
        <p
          className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
            isDark ? "text-white/35" : "text-slate-500"
          }`}
        >
          sample builds
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO_RECIPES.map((recipe) => {
            const active = activeDemoRecipeId === recipe.id;

            return (
              <button
                key={recipe.id}
                onClick={() => applyDemoRecipe(recipe.id)}
                className={`rounded-sm border px-3 py-3 text-left transition-all ${
                  active
                    ? isDark
                      ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                      : "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : isDark
                      ? "border-white/8 bg-white/[0.03] text-white/75 hover:border-white/15 hover:bg-white/[0.05]"
                      : "border-slate-200 bg-white/75 text-slate-700 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="text-xs font-medium">{recipe.label}</div>
                <div
                  className={`mt-1 text-[11px] leading-5 ${
                    isDark ? "text-white/45" : "text-slate-500"
                  }`}
                >
                  {recipe.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
        <p
          className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
            isDark ? "text-white/35" : "text-slate-500"
          }`}
        >
          product templates
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {PRODUCT_TEMPLATES.map((template) => {
            const active = activeTemplateId === template.id;

            return (
              <button
                key={template.id}
                onClick={() => setTemplate(template.id)}
                className={`rounded-sm border px-3 py-3 text-left transition-all ${
                  active
                    ? isDark
                      ? "border-blue-300/40 bg-blue-500/10 text-blue-100"
                      : "border-blue-300 bg-blue-50 text-blue-800"
                    : isDark
                      ? "border-white/8 bg-white/[0.03] text-white/75 hover:border-white/15 hover:bg-white/[0.05]"
                      : "border-slate-200 bg-white/75 text-slate-700 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cuboid size={12} />
                  <span className="text-xs font-medium">{template.label}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div
          className={`mt-3 rounded-sm border px-3 py-3 text-xs leading-5 ${
            isDark
              ? "border-white/8 bg-white/[0.03] text-white/60"
              : "border-slate-200 bg-slate-50/80 text-slate-600"
          }`}
        >
          {activeTemplate
            ? activeTemplate.description
            : "选择一种产品形态，查看相同模块在不同产品中的装配方式。"}
        </div>
      </div>

      <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
        <p
          className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
            isDark ? "text-white/35" : "text-slate-500"
          }`}
        >
          showcase scenes
        </p>
        <div className="mt-3 space-y-2">
          {SHOWCASE_SCENES.map((scene) => {
            const active = activeSceneId === scene.id;

            return (
              <button
                key={scene.id}
                onClick={() => showScene(scene.id)}
                className={`flex w-full items-start gap-3 rounded-sm border px-3 py-3 text-left transition-all ${
                  active
                    ? isDark
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                      : "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : isDark
                      ? "border-white/8 bg-white/[0.03] text-white/75 hover:border-white/15 hover:bg-white/[0.05]"
                      : "border-slate-200 bg-white/75 text-slate-700 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                    active
                      ? "bg-emerald-500 text-black"
                      : isDark
                        ? "bg-white/6 text-white/50"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Sparkles size={12} />
                </div>
                <div>
                  <div className="font-medium">{scene.label}</div>
                  <div
                    className={`mt-1 text-xs leading-5 ${
                      active
                        ? isDark
                          ? "text-emerald-100/80"
                          : "text-emerald-700"
                        : isDark
                          ? "text-white/45"
                          : "text-slate-500"
                    }`}
                  >
                    {scene.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
        <p
          className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
            isDark ? "text-white/35" : "text-slate-500"
          }`}
        >
          highlight groups
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {HIGHLIGHT_GROUPS.map((group) => {
            const active = activeHighlightGroupId === group.id;

            return (
              <button
                key={group.id}
                onClick={() => applyHighlightGroup(active ? null : group.id)}
                className={`rounded-full border px-3 py-2 text-xs transition-all ${
                  active
                    ? isDark
                      ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-100"
                      : "border-cyan-300 bg-cyan-50 text-cyan-800"
                    : isDark
                      ? "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20"
                      : "border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300"
                }`}
                title={group.description}
              >
                {group.label}
              </button>
            );
          })}
        </div>
        <div
          className={`mt-3 rounded-sm border px-3 py-3 text-xs leading-5 ${
            isDark
              ? "border-white/8 bg-white/[0.03] text-white/60"
              : "border-slate-200 bg-slate-50/80 text-slate-600"
          }`}
        >
          {activeGroup
            ? activeGroup.description
            : "点击分组后会自动切换到对应讲解视角，并高亮相关模块。"}
        </div>
      </div>
    </section>
  );
}
