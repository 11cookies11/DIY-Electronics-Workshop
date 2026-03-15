"use client";

import { getFaceDescriptor } from "./shellGeometry";
import type { FaceGrid, FaceName, ShellSize } from "./types";

function getFacePlaneSize(shellSize: ShellSize, face: FaceName) {
  if (face === "front" || face === "back") {
    return {
      width: shellSize.width,
      height: shellSize.height,
    };
  }

  if (face === "left" || face === "right") {
    return {
      width: shellSize.depth,
      height: shellSize.height,
    };
  }

  return {
    width: shellSize.width,
    height: shellSize.depth,
  };
}

export function getFaceNormal(
  shellSize: ShellSize,
  face: FaceName,
): [number, number, number] {
  return getFaceDescriptor("cuboid", shellSize, face).normal;
}

export function getFaceRotation(face: FaceName): [number, number, number] {
  switch (face) {
    case "front":
      return [0, 0, 0];
    case "back":
      return [0, Math.PI, 0];
    case "right":
      return [0, Math.PI / 2, 0];
    case "left":
      return [0, -Math.PI / 2, 0];
    case "top":
      return [-Math.PI / 2, 0, 0];
    case "bottom":
      return [Math.PI / 2, 0, 0];
    default:
      return [0, 0, 0];
  }
}

export function faceGridToWorldPosition(
  shellSize: ShellSize,
  face: FaceName,
  grid: FaceGrid,
  gridX: number,
  gridY: number,
  gridW: number,
  gridH: number,
  itemDepth: number,
): [number, number, number] {
  const descriptor = getFaceDescriptor("cuboid", shellSize, face);
  const plane = getFacePlaneSize(shellSize, face);
  const cellW = plane.width / grid.cols;
  const cellH = plane.height / grid.rows;
  const localU = -plane.width / 2 + cellW * (gridX + gridW / 2);
  const localV = plane.height / 2 - cellH * (gridY + gridH / 2);
  const normalOffset = itemDepth / 2;

  return [
    descriptor.center[0] +
      descriptor.axisU[0] * localU +
      descriptor.axisV[0] * localV +
      descriptor.normal[0] * normalOffset,
    descriptor.center[1] +
      descriptor.axisU[1] * localU +
      descriptor.axisV[1] * localV +
      descriptor.normal[1] * normalOffset,
    descriptor.center[2] +
      descriptor.axisU[2] * localU +
      descriptor.axisV[2] * localV +
      descriptor.normal[2] * normalOffset,
  ];
}
