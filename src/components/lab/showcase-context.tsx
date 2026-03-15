"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getNodePose,
  LAB_NODES,
  PRODUCT_TEMPLATES,
  type LabNode,
  type ProductTemplateId,
} from "./constants";
import { buildLegacyScene } from "./legacy-scene";
import type { SceneJSON } from "./scene-schema";

export type ShowcaseSceneId =
  | "overview"
  | "full-exploded"
  | "mcu-demo"
  | "sensor-demo"
  | "display-demo"
  | "power-demo"
  | "network-demo";

export type HighlightGroupId =
  | "core-control"
  | "sensing"
  | "display"
  | "power"
  | "connectivity";

export type DemoRecipeId =
  | "portable-inspector"
  | "smart-console"
  | "edge-sensor"
  | "immersive-showcase";

export const SHOWCASE_SCENES: Array<{
  id: ShowcaseSceneId;
  label: string;
  description: string;
}> = [
  {
    id: "overview",
    label: "整体概览",
    description: "展示设备合拢后的整机状态，适合做开场介绍。",
  },
  {
    id: "full-exploded",
    label: "完整拆解",
    description: "展开全部模块与连线，帮助客户理解内部结构。",
  },
  {
    id: "mcu-demo",
    label: "主控方案",
    description: "突出 MCU 作为控制核心，展示模块协同关系。",
  },
  {
    id: "sensor-demo",
    label: "传感方案",
    description: "聚焦传感器、主控与数据采集链路。",
  },
  {
    id: "display-demo",
    label: "显示方案",
    description: "突出多屏显示与交互反馈能力。",
  },
  {
    id: "power-demo",
    label: "供电结构",
    description: "展示电池与供电分发链路。",
  },
  {
    id: "network-demo",
    label: "联网能力",
    description: "突出无线连接与远程通信能力。",
  },
];

export const HIGHLIGHT_GROUPS: Array<{
  id: HighlightGroupId;
  label: string;
  description: string;
  nodeIds: string[];
  preferredSceneId: ShowcaseSceneId;
}> = [
  {
    id: "core-control",
    label: "主控核心",
    description: "强调 MCU 在调度屏幕、网络与传感模块时的核心作用。",
    nodeIds: ["mcu", "network", "sensor"],
    preferredSceneId: "mcu-demo",
  },
  {
    id: "sensing",
    label: "传感采集",
    description: "强调传感器输入、数据采集与主控处理链路。",
    nodeIds: ["sensor", "mcu"],
    preferredSceneId: "sensor-demo",
  },
  {
    id: "display",
    label: "显示交互",
    description: "强调前后左右与上下屏幕形成的多面交互体验。",
    nodeIds: [
      "screen_front",
      "screen_back",
      "screen_left",
      "screen_right",
      "screen_top",
      "screen_bottom",
    ],
    preferredSceneId: "display-demo",
  },
  {
    id: "power",
    label: "供电系统",
    description: "强调电池供电、主控配电与功耗链路。",
    nodeIds: ["battery", "mcu", "sensor"],
    preferredSceneId: "power-demo",
  },
  {
    id: "connectivity",
    label: "联网通信",
    description: "强调 WiFi 模块、主控与用户终端之间的通信能力。",
    nodeIds: ["network", "mcu", "screen_front"],
    preferredSceneId: "network-demo",
  },
];

export const DEMO_RECIPES: Array<{
  id: DemoRecipeId;
  label: string;
  description: string;
  templateId: ProductTemplateId;
  sceneId: ShowcaseSceneId;
  highlightGroupId: HighlightGroupId;
  focusNodeId: string;
}> = [
  {
    id: "portable-inspector",
    label: "便携检测仪",
    description: "手持终端形态，突出传感器、屏幕和电池供电。",
    templateId: "handheld-terminal",
    sceneId: "sensor-demo",
    highlightGroupId: "sensing",
    focusNodeId: "sensor",
  },
  {
    id: "smart-console",
    label: "智能控制台",
    description: "工业控制盒形态，突出主控、显示和联网能力。",
    templateId: "industrial-console",
    sceneId: "display-demo",
    highlightGroupId: "core-control",
    focusNodeId: "screen_front",
  },
  {
    id: "edge-sensor",
    label: "边缘采集站",
    description: "传感节点形态，突出联网和供电链路。",
    templateId: "sensor-station",
    sceneId: "network-demo",
    highlightGroupId: "connectivity",
    focusNodeId: "network",
  },
  {
    id: "immersive-showcase",
    label: "多屏体验机",
    description: "沉浸立方体形态，突出多屏交互和结构拆解效果。",
    templateId: "immersive-cube",
    sceneId: "full-exploded",
    highlightGroupId: "display",
    focusNodeId: "screen_front",
  },
];

export type ShowcaseState = {
  isExploded: boolean;
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  activeHighlightGroupId: HighlightGroupId | null;
  activeSceneId: ShowcaseSceneId;
  activeTemplateId: ProductTemplateId;
  activeDemoRecipeId: DemoRecipeId | null;
  isSettingsOpen: boolean;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
};

type ShowcaseContextValue = ShowcaseState & {
  renderScene: SceneJSON;
  setExploded: (value: boolean) => void;
  toggleExploded: () => void;
  selectNode: (nodeId: string | null) => void;
  focusNode: (nodeId: string | null) => void;
  highlightNodes: (nodeIds: string[]) => void;
  applyHighlightGroup: (groupId: HighlightGroupId | null) => void;
  applyDemoRecipe: (recipeId: DemoRecipeId) => void;
  applyRandomDemoRecipe: () => void;
  clearHighlights: () => void;
  setActiveScene: (sceneId: ShowcaseSceneId) => void;
  showScene: (sceneId: ShowcaseSceneId) => void;
  setTemplate: (templateId: ProductTemplateId) => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  resetShowcase: () => void;
};

const scenePresets: Record<
  ShowcaseSceneId,
  Pick<
    ShowcaseState,
    | "isExploded"
    | "selectedNodeId"
    | "highlightedNodeIds"
    | "activeHighlightGroupId"
    | "activeSceneId"
    | "cameraPosition"
    | "cameraTarget"
  >
> = {
  overview: {
    isExploded: false,
    selectedNodeId: null,
    highlightedNodeIds: [],
    activeHighlightGroupId: null,
    activeSceneId: "overview",
    cameraPosition: [4.8, 4.6, 5.6],
    cameraTarget: [0, 0, 0],
  },
  "full-exploded": {
    isExploded: true,
    selectedNodeId: null,
    highlightedNodeIds: [],
    activeHighlightGroupId: null,
    activeSceneId: "full-exploded",
    cameraPosition: [5.4, 5.1, 6.2],
    cameraTarget: [0, 0.2, 0],
  },
  "mcu-demo": {
    isExploded: true,
    selectedNodeId: "mcu",
    highlightedNodeIds: ["mcu", "network", "sensor"],
    activeHighlightGroupId: "core-control",
    activeSceneId: "mcu-demo",
    cameraPosition: [1.8, 1.6, 2.6],
    cameraTarget: [-0.6, 0.4, 0],
  },
  "sensor-demo": {
    isExploded: true,
    selectedNodeId: "sensor",
    highlightedNodeIds: ["sensor", "mcu"],
    activeHighlightGroupId: "sensing",
    activeSceneId: "sensor-demo",
    cameraPosition: [2.3, 1.8, 2.7],
    cameraTarget: [0.6, 0.4, 0],
  },
  "display-demo": {
    isExploded: true,
    selectedNodeId: "screen_front",
    highlightedNodeIds: [
      "screen_front",
      "screen_back",
      "screen_left",
      "screen_right",
      "screen_top",
      "screen_bottom",
    ],
    activeHighlightGroupId: "display",
    activeSceneId: "display-demo",
    cameraPosition: [0.6, 1.5, 4.4],
    cameraTarget: [0, 0, 2.5],
  },
  "power-demo": {
    isExploded: true,
    selectedNodeId: "battery",
    highlightedNodeIds: ["battery", "mcu", "sensor"],
    activeHighlightGroupId: "power",
    activeSceneId: "power-demo",
    cameraPosition: [1.8, -0.1, 3.3],
    cameraTarget: [0, -1.2, 0],
  },
  "network-demo": {
    isExploded: true,
    selectedNodeId: "network",
    highlightedNodeIds: ["network", "mcu", "screen_front"],
    activeHighlightGroupId: "connectivity",
    activeSceneId: "network-demo",
    cameraPosition: [-2.6, 2.2, 2.8],
    cameraTarget: [-1.2, 1.2, 0],
  },
};

const templateCameraPresets: Record<
  ProductTemplateId,
  { cameraPosition: [number, number, number]; cameraTarget: [number, number, number] }
> = {
  "immersive-cube": {
    cameraPosition: [5.4, 5.1, 6.2],
    cameraTarget: [0, 0.2, 0],
  },
  "handheld-terminal": {
    cameraPosition: [4.1, 2.8, 5.1],
    cameraTarget: [0, -0.05, 0.15],
  },
  "industrial-console": {
    cameraPosition: [4.8, 3.1, 5.6],
    cameraTarget: [0.1, -0.1, 0],
  },
  "sensor-station": {
    cameraPosition: [4.3, 3.4, 5.7],
    cameraTarget: [0, 0.1, 0],
  },
};

const initialState: ShowcaseState = {
  isExploded: true,
  selectedNodeId: null,
  highlightedNodeIds: [],
  activeHighlightGroupId: null,
  activeSceneId: "full-exploded",
  activeTemplateId: "immersive-cube",
  activeDemoRecipeId: null,
  isSettingsOpen: false,
  cameraPosition: [5.4, 5.1, 6.2],
  cameraTarget: [0, 0.2, 0],
};

const ShowcaseContext = createContext<ShowcaseContextValue | undefined>(
  undefined,
);

function normalizeNodeIds(nodeIds: string[]) {
  return Array.from(new Set(nodeIds.filter(Boolean)));
}

function getNodeFocus(
  nodeId: string,
  isExploded: boolean,
  templateId: ProductTemplateId,
) {
  const node = LAB_NODES.find((entry) => entry.id === nodeId);
  if (!node) {
    return null;
  }

  const pose = getNodePose(node, templateId);
  const [x, y, z] = isExploded ? pose.explodedPos : pose.assembledPos;

  return {
    cameraTarget: [x, y, z] as [number, number, number],
    cameraPosition: [x + 2.1, y + 1.4, z + 2.5] as [number, number, number],
  };
}

function buildDemoState(recipeId: DemoRecipeId, prev: ShowcaseState): ShowcaseState {
  const recipe = DEMO_RECIPES.find((entry) => entry.id === recipeId);
  if (!recipe) {
    return prev;
  }

  const scenePreset = scenePresets[recipe.sceneId];
  const focus = getNodeFocus(
    recipe.focusNodeId,
    scenePreset.isExploded,
    recipe.templateId,
  );
  const templateCamera = templateCameraPresets[recipe.templateId];

  return {
    ...prev,
    ...scenePreset,
    activeTemplateId: recipe.templateId,
    activeHighlightGroupId: recipe.highlightGroupId,
    activeDemoRecipeId: recipe.id,
    highlightedNodeIds: normalizeNodeIds([
      ...scenePreset.highlightedNodeIds,
      ...(
        HIGHLIGHT_GROUPS.find((group) => group.id === recipe.highlightGroupId)
          ?.nodeIds ?? []
      ),
    ]),
    selectedNodeId: recipe.focusNodeId,
    cameraPosition:
      focus?.cameraPosition ?? templateCamera.cameraPosition,
    cameraTarget:
      focus?.cameraTarget ?? templateCamera.cameraTarget,
  };
}

export function ShowcaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShowcaseState>(initialState);

  const value = useMemo<ShowcaseContextValue>(
    () => {
      const renderScene = buildLegacyScene({
        templateId: state.activeTemplateId,
        isExploded: state.isExploded,
        selectedNodeId: state.selectedNodeId,
        highlightedNodeIds: state.highlightedNodeIds,
        activeSceneId: state.activeSceneId,
        cameraPosition: state.cameraPosition,
        cameraTarget: state.cameraTarget,
      });

      return {
        ...state,
        renderScene,
        setExploded: (value) =>
          setState((prev) => ({
            ...prev,
            activeDemoRecipeId: null,
            isExploded: value,
            activeSceneId:
              prev.activeSceneId === "overview" ||
              prev.activeSceneId === "full-exploded"
                ? value
                  ? "full-exploded"
                  : "overview"
                : prev.activeSceneId,
          })),
        toggleExploded: () =>
          setState((prev) => ({
            ...prev,
            activeDemoRecipeId: null,
            isExploded: !prev.isExploded,
            activeSceneId:
              prev.activeSceneId === "overview" ||
              prev.activeSceneId === "full-exploded"
                ? prev.isExploded
                  ? "overview"
                  : "full-exploded"
                : prev.activeSceneId,
          })),
        selectNode: (nodeId) =>
          setState((prev) => ({
            ...prev,
            activeDemoRecipeId: null,
            selectedNodeId: nodeId,
            activeHighlightGroupId: null,
            highlightedNodeIds: nodeId
              ? normalizeNodeIds([...prev.highlightedNodeIds, nodeId])
              : prev.highlightedNodeIds,
          })),
        focusNode: (nodeId) =>
          setState((prev) => {
            if (!nodeId) {
              return {
                ...prev,
                activeDemoRecipeId: null,
                selectedNodeId: null,
              };
            }

            const focus = getNodeFocus(nodeId, prev.isExploded, prev.activeTemplateId);
            if (!focus) {
              return prev;
            }

            return {
              ...prev,
              activeDemoRecipeId: null,
              selectedNodeId: nodeId,
              activeHighlightGroupId: null,
              highlightedNodeIds: normalizeNodeIds([
                ...prev.highlightedNodeIds,
                nodeId,
              ]),
              cameraPosition: focus.cameraPosition,
              cameraTarget: focus.cameraTarget,
            };
          }),
        highlightNodes: (nodeIds) =>
          setState((prev) => ({
            ...prev,
            activeDemoRecipeId: null,
            activeHighlightGroupId: null,
            highlightedNodeIds: normalizeNodeIds(nodeIds),
          })),
        applyHighlightGroup: (groupId) =>
          setState((prev) => {
            if (!groupId) {
              return {
                ...prev,
                activeDemoRecipeId: null,
                activeHighlightGroupId: null,
                highlightedNodeIds: [],
              };
            }

            const group = HIGHLIGHT_GROUPS.find((entry) => entry.id === groupId);
            if (!group) {
              return prev;
            }

            const scenePreset = scenePresets[group.preferredSceneId];
            const focus = group.nodeIds[0]
              ? getNodeFocus(group.nodeIds[0], scenePreset.isExploded, prev.activeTemplateId)
              : null;

            return {
              ...prev,
              ...scenePreset,
              activeDemoRecipeId: null,
              activeHighlightGroupId: groupId,
              highlightedNodeIds: normalizeNodeIds(group.nodeIds),
              selectedNodeId: group.nodeIds[0] ?? prev.selectedNodeId,
              cameraPosition: focus?.cameraPosition ?? scenePreset.cameraPosition,
              cameraTarget: focus?.cameraTarget ?? scenePreset.cameraTarget,
            };
          }),
        applyDemoRecipe: (recipeId) =>
          setState((prev) => buildDemoState(recipeId, prev)),
      applyRandomDemoRecipe: () =>
        setState((prev) => {
            const candidates = DEMO_RECIPES.filter(
              (recipe) => recipe.id !== prev.activeDemoRecipeId,
            );
            const nextRecipe =
              candidates[Math.floor(Math.random() * candidates.length)] ??
              DEMO_RECIPES[0];
          return buildDemoState(nextRecipe.id, prev);
        }),
        clearHighlights: () =>
          setState((prev) => ({
            ...prev,
            activeDemoRecipeId: null,
            activeHighlightGroupId: null,
            highlightedNodeIds: [],
          })),
        setActiveScene: (sceneId) =>
          setState((prev) => ({
            ...prev,
            activeDemoRecipeId: null,
            activeSceneId: sceneId,
          })),
        showScene: (sceneId) =>
          setState((prev) => ({
            ...prev,
            activeDemoRecipeId: null,
            ...scenePresets[sceneId],
          })),
        setTemplate: (templateId) =>
          setState((prev) => {
            const templateCamera = templateCameraPresets[templateId];
            const focus = prev.selectedNodeId
              ? getNodeFocus(prev.selectedNodeId, prev.isExploded, templateId)
              : null;

            return {
              ...prev,
              activeDemoRecipeId: null,
              activeTemplateId: templateId,
              cameraPosition: focus?.cameraPosition ?? templateCamera.cameraPosition,
              cameraTarget: focus?.cameraTarget ?? templateCamera.cameraTarget,
            };
          }),
        openSettings: () =>
          setState((prev) => ({
            ...prev,
            isSettingsOpen: true,
          })),
        closeSettings: () =>
          setState((prev) => ({
            ...prev,
            isSettingsOpen: false,
          })),
        toggleSettings: () =>
          setState((prev) => ({
            ...prev,
            isSettingsOpen: !prev.isSettingsOpen,
          })),
        resetShowcase: () => setState(initialState),
      };
    },
    [state],
  );

  return (
    <ShowcaseContext.Provider value={value}>
      {children}
    </ShowcaseContext.Provider>
  );
}

export function useShowcase() {
  const context = useContext(ShowcaseContext);
  if (!context) {
    throw new Error("useShowcase must be used within ShowcaseProvider");
  }

  return context;
}

export function isNodeHighlighted(
  highlightedNodeIds: string[],
  node: Pick<LabNode, "id">,
) {
  return highlightedNodeIds.includes(node.id);
}

export { PRODUCT_TEMPLATES };
