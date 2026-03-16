"use client";

import type { EulerTuple, SceneNode, TransformPose, Vector3Tuple } from "./types";

const ZERO_ROTATION: EulerTuple = [0, 0, 0];
const UNIT_SCALE: Vector3Tuple = [1, 1, 1];

export function createPose(
  position: Vector3Tuple,
  rotation: EulerTuple = ZERO_ROTATION,
  scale: Vector3Tuple = UNIT_SCALE,
): TransformPose {
  return {
    position,
    rotation,
    scale,
  };
}

export function getNodePose(node: SceneNode): TransformPose {
  return (
    node.pose ?? {
      position: node.position,
      rotation: node.rotation ?? ZERO_ROTATION,
      scale: UNIT_SCALE,
    }
  );
}

export function getNodePosition(node: SceneNode): Vector3Tuple {
  return getNodePose(node).position;
}

export function getNodeRotation(node: SceneNode): EulerTuple {
  return getNodePose(node).rotation;
}

export function withNodePose(node: SceneNode, pose: TransformPose): SceneNode {
  return {
    ...node,
    pose,
    position: pose.position,
    rotation: pose.rotation,
  };
}
