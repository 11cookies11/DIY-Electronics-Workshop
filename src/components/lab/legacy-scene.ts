"use client";

import {
  CONNECTIONS,
  getNodePose,
  isNodeVisible,
  LAB_NODES,
  type ProductTemplateId,
} from "./constants";
import type { ShowcaseSceneId } from "./showcase-context";
import type { SceneConnection, SceneJSON, SceneModuleNode } from "./scene-schema";

type LegacySceneOptions = {
  templateId: ProductTemplateId;
  isExploded: boolean;
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  activeSceneId: ShowcaseSceneId;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  theme?: "light" | "dark";
};

function toLegacyNodeType(nodeId: string, label: string) {
  if (nodeId.includes("screen")) {
    return "screen_panel";
  }
  if (nodeId === "mcu") {
    return "controller_board";
  }
  if (nodeId === "sensor") {
    return "sensor_module";
  }
  if (nodeId === "battery") {
    return "battery_pack";
  }
  if (nodeId === "speaker") {
    return "speaker_module";
  }
  if (nodeId === "network") {
    return "network_module";
  }

  return label;
}

function toLegacyCategory(nodeId: string): SceneModuleNode["category"] {
  if (nodeId.includes("screen")) {
    return "ui";
  }
  if (nodeId === "mcu") {
    return "controller";
  }
  if (nodeId === "sensor") {
    return "sensor";
  }
  if (nodeId === "battery") {
    return "power";
  }
  if (nodeId === "speaker") {
    return "actuator";
  }
  if (nodeId === "network") {
    return "communication";
  }

  return "visual";
}

function toLegacyConnectionKind(kind: "data" | "power" | "control"): SceneConnection["kind"] {
  if (kind === "control") {
    return "signal";
  }
  return kind;
}

export function buildLegacyScene(options: LegacySceneOptions): SceneJSON {
  const visibleNodes = LAB_NODES.filter((node) =>
    isNodeVisible(options.templateId, node.id),
  );

  const modules: SceneModuleNode[] = visibleNodes.map((node) => {
    const pose = getNodePose(node, options.templateId);

    return {
      id: node.id,
      type: toLegacyNodeType(node.id, node.label),
      label: node.label,
      category: toLegacyCategory(node.id),
      sceneRole: node.type === "screen" ? "display" : node.id === "mcu" ? "core" : "io",
      assembledPosition: pose.assembledPos,
      explodedPosition: pose.explodedPos,
    };
  });

  const connections: SceneConnection[] = CONNECTIONS.filter(
    (connection) =>
      isNodeVisible(options.templateId, connection.from) &&
      isNodeVisible(options.templateId, connection.to),
  ).map((connection) => ({
    id: connection.id,
    from: connection.from,
    to: connection.to,
    kind: toLegacyConnectionKind(connection.flowType),
  }));

  return {
    view: options.isExploded ? "exploded" : "assembled",
    template: options.templateId,
    theme: options.theme,
    focus: options.selectedNodeId,
    highlights: options.highlightedNodeIds,
    modules,
    connections,
    camera: {
      position: options.cameraPosition,
      target: options.cameraTarget,
    },
  };
}
