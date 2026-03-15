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

function getNodeScale(node: SceneNode) {
  const [width, height, depth] = node.size;
  const footprint = Math.max(width, depth);
  const volumeHint = footprint + height * 0.6;

  return {
    footprint,
    vertical: Math.max(1, height / 12),
    spread: Math.max(1, volumeHint / 28),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getModuleExplodedOffset(
  node: SceneNode,
  boardCenter: [number, number, number],
  shellSize: [number, number, number],
): [number, number, number] {
  const category = String(node.meta?.category ?? "");
  const scale = getNodeScale(node);
  const shellRadius = Math.max(shellSize[0], shellSize[1], shellSize[2]) * 0.18;
  const deltaX = node.position[0] - boardCenter[0];
  const deltaZ = node.position[2] - boardCenter[2];
  const spreadX =
    deltaX === 0
      ? 0
      : Math.sign(deltaX) *
        clamp(20 + shellRadius + scale.footprint * 0.45 + Math.abs(deltaX) * 0.45, 18, 74);
  const spreadZ =
    deltaZ === 0
      ? 0
      : Math.sign(deltaZ) *
        clamp(20 + shellRadius + scale.footprint * 0.45 + Math.abs(deltaZ) * 0.45, 18, 74);

  switch (category) {
    case "core":
      return [spreadX * 0.82, 40 + scale.vertical * 7, spreadZ * 0.82];
    case "communication":
      return [
        spreadX * 1.08,
        48 + scale.vertical * 8,
        42 + scale.footprint * 0.34 + spreadZ * 0.74,
      ];
    case "power":
      return [
        spreadX * 0.96,
        -50 - scale.vertical * 8,
        spreadZ * 0.96,
      ];
    case "sensor":
      return [
        40 + scale.footprint * 0.32 + spreadX * 0.96,
        28 + scale.vertical * 6,
        spreadZ * 0.92,
      ];
    case "actuator":
      return [
        50 + scale.footprint * 0.36 + spreadX * 1.04,
        22 + scale.vertical * 6,
        spreadZ * 0.96,
      ];
    case "storage":
      return [
        -38 - scale.footprint * 0.32 + spreadX * 0.94,
        28 + scale.vertical * 6,
        spreadZ * 0.9,
      ];
    default:
      return [
        spreadX * (0.96 + scale.spread * 0.06),
        26 + scale.vertical * 6,
        spreadZ * (0.96 + scale.spread * 0.06),
      ];
  }
}

function getFaceOffset(node: SceneNode, shellSize: [number, number, number]): [number, number, number] {
  const face = String(node.meta?.face ?? "");
  const scale = getNodeScale(node);
  const shellRadius = Math.max(shellSize[0], shellSize[1], shellSize[2]) * 0.22;
  const faceSpread = clamp(44 + shellRadius + scale.footprint * 0.55, 38, 108);
  const faceVertical = clamp(38 + shellRadius + scale.footprint * 0.4, 34, 92);

  switch (face) {
    case "front":
      return [0, 0, faceSpread];
    case "back":
      return [0, 0, -faceSpread];
    case "right":
      return [faceSpread, 0, 0];
    case "left":
      return [-faceSpread, 0, 0];
    case "top":
      return [0, faceVertical, 0];
    case "bottom":
      return [0, -faceVertical, 0];
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
    boardNode: offsetNode(scene.boardNode, [0, 30, 0]),
    moduleNodes: scene.moduleNodes.map((node) =>
      offsetNode(
        node,
        getModuleExplodedOffset(node, scene.boardNode.position, scene.shellNode.size),
      ),
    ),
    screenNodes: scene.screenNodes.map((node) =>
      offsetNode(node, getFaceOffset(node, scene.shellNode.size)),
    ),
    portNodes: scene.portNodes.map((node) =>
      offsetNode(node, getFaceOffset(node, scene.shellNode.size)),
    ),
  };
}
