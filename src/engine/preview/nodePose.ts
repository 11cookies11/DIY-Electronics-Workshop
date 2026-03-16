"use client";

import { getFaceRotation } from "./faceTransform";
import type {
  EulerTuple,
  NodeFace,
  SceneNode,
  TargetDirection,
  TransformPose,
  Vector3Tuple,
} from "./types";

const ZERO_ROTATION: EulerTuple = [0, 0, 0];
const UNIT_SCALE: Vector3Tuple = [1, 1, 1];

function getMountFaceRotation(face: NodeFace): EulerTuple {
  switch (face) {
    case "top":
      return [0, 0, 0];
    case "bottom":
      return [Math.PI, 0, 0];
    case "front":
      return [Math.PI / 2, 0, 0];
    case "back":
      return [-Math.PI / 2, 0, 0];
    case "right":
      return [0, 0, -Math.PI / 2];
    case "left":
      return [0, 0, Math.PI / 2];
    default:
      return ZERO_ROTATION;
  }
}

function getBoardDirectionRotation(targetDirection: TargetDirection): EulerTuple {
  switch (targetDirection) {
    case "deviceFront":
      return [0, 0, 0];
    case "deviceBack":
      return [0, Math.PI, 0];
    case "deviceRight":
      return [0, Math.PI / 2, 0];
    case "deviceLeft":
      return [0, -Math.PI / 2, 0];
    default:
      return ZERO_ROTATION;
  }
}

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

export function createConstrainedPose(
  position: Vector3Tuple,
  constraint: SceneNode["constraints"] | undefined,
  fallbackRotation: EulerTuple = ZERO_ROTATION,
): TransformPose {
  const placement = constraint?.placement;
  const poseConstraint = constraint?.pose;

  if (
    placement?.anchorNodeId === "main-board" &&
    placement.selfMountFace === "bottom"
  ) {
    if (
      placement.anchorFace === "top" &&
      poseConstraint?.functionalFace === "front" &&
      poseConstraint.targetDirection
    ) {
      return createPose(
        position,
        getBoardDirectionRotation(poseConstraint.targetDirection),
      );
    }

    return createPose(position, fallbackRotation);
  }

  if (
    placement?.anchorNodeId === "shell" &&
    poseConstraint?.functionalFace === "front" &&
    poseConstraint.targetDirection === "outward"
  ) {
    return createPose(position, getFaceRotation(placement.anchorFace));
  }

  return createPose(position, fallbackRotation);
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
