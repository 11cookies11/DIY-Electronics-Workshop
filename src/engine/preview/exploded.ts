"use client";

import type {
  PreviewScene,
  PreviewView,
  SceneNode,
} from "./types";

function offsetNode(node: SceneNode, offset: [number, number, number]): SceneNode {
  return {
    ...node,
    position: [
      node.position[0] + offset[0],
      node.position[1] + offset[1],
      node.position[2] + offset[2],
    ],
  };
}

function getModuleExplodedOffset(node: SceneNode): [number, number, number] {
  const category = String(node.meta?.category ?? "");

  switch (category) {
    case "core":
      return [0, 12, 0];
    case "communication":
      return [0, 12, 10];
    case "power":
      return [0, -14, 0];
    case "sensor":
      return [10, 6, 0];
    case "actuator":
      return [14, 2, 0];
    default:
      return [0, 4, 0];
  }
}

function getFaceOffset(node: SceneNode): [number, number, number] {
  const face = String(node.meta?.face ?? "");

  switch (face) {
    case "front":
      return [0, 0, 18];
    case "back":
      return [0, 0, -18];
    case "right":
      return [18, 0, 0];
    case "left":
      return [-18, 0, 0];
    case "top":
      return [0, 18, 0];
    case "bottom":
      return [0, -18, 0];
    default:
      return [0, 0, 0];
  }
}

export function applyPreviewView(
  scene: PreviewScene,
  view: PreviewView,
): PreviewScene {
  if (view === "assembled") {
    return {
      ...scene,
      view,
    };
  }

  return {
    ...scene,
    view,
    boardNode: offsetNode(scene.boardNode, [0, 8, 0]),
    moduleNodes: scene.moduleNodes.map((node) =>
      offsetNode(node, getModuleExplodedOffset(node)),
    ),
    screenNodes: scene.screenNodes.map((node) =>
      offsetNode(node, getFaceOffset(node)),
    ),
    portNodes: scene.portNodes.map((node) =>
      offsetNode(node, getFaceOffset(node)),
    ),
  };
}
