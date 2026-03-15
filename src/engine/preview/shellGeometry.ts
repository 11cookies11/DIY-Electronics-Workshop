"use client";

import type { FaceDescriptor, FaceName, ShellGeometry, ShellSize, ShellType } from "./types";

function createFaceDescriptor(
  face: FaceName,
  center: [number, number, number],
  normal: [number, number, number],
  axisU: [number, number, number],
  axisV: [number, number, number],
): FaceDescriptor {
  return {
    face,
    center,
    normal,
    axisU,
    axisV,
  };
}

export function normalizeShellSize(type: ShellType, size: ShellSize): ShellSize {
  if (type === "cube") {
    const edge = Math.max(size.width, size.height, size.depth);
    return {
      width: edge,
      height: edge,
      depth: edge,
    };
  }

  return size;
}

export function buildShellGeometry(
  type: ShellType,
  shellSize: ShellSize,
): ShellGeometry {
  const size = normalizeShellSize(type, shellSize);
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;
  const halfDepth = size.depth / 2;

  return {
    type,
    size,
    center: [0, 0, 0],
    faces: {
      front: createFaceDescriptor(
        "front",
        [0, 0, halfDepth],
        [0, 0, 1],
        [1, 0, 0],
        [0, 1, 0],
      ),
      back: createFaceDescriptor(
        "back",
        [0, 0, -halfDepth],
        [0, 0, -1],
        [-1, 0, 0],
        [0, 1, 0],
      ),
      right: createFaceDescriptor(
        "right",
        [halfWidth, 0, 0],
        [1, 0, 0],
        [0, 0, -1],
        [0, 1, 0],
      ),
      left: createFaceDescriptor(
        "left",
        [-halfWidth, 0, 0],
        [-1, 0, 0],
        [0, 0, 1],
        [0, 1, 0],
      ),
      top: createFaceDescriptor(
        "top",
        [0, halfHeight, 0],
        [0, 1, 0],
        [1, 0, 0],
        [0, 0, -1],
      ),
      bottom: createFaceDescriptor(
        "bottom",
        [0, -halfHeight, 0],
        [0, -1, 0],
        [1, 0, 0],
        [0, 0, 1],
      ),
    },
  };
}

export function getFaceDescriptor(
  type: ShellType,
  shellSize: ShellSize,
  face: FaceName,
) {
  return buildShellGeometry(type, shellSize).faces[face];
}
