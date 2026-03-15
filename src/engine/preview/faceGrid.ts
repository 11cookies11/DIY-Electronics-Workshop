"use client";

import type {
  FaceGrid,
  FaceName,
  FacePlacedItem,
  GridCell,
} from "./types";
import { faceGridToWorldPosition, getFaceRotation } from "./faceTransform";

const DEFAULT_SCREEN_GRID = {
  cols: 3,
  rows: 3,
};

const DEFAULT_PORT_GRID = {
  cols: 4,
  rows: 2,
};

function createGridCell(): GridCell {
  return {
    occupied: false,
  };
}

export function createFaceGrid(
  face: FaceName,
  cols: number,
  rows: number,
): FaceGrid {
  return {
    face,
    cols,
    rows,
    cells: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => createGridCell()),
    ),
  };
}

function canPlace(
  grid: FaceGrid,
  gridX: number,
  gridY: number,
  gridW: number,
  gridH: number,
) {
  if (gridX < 0 || gridY < 0) {
    return false;
  }

  if (gridX + gridW > grid.cols || gridY + gridH > grid.rows) {
    return false;
  }

  for (let y = gridY; y < gridY + gridH; y += 1) {
    for (let x = gridX; x < gridX + gridW; x += 1) {
      if (grid.cells[y]?.[x]?.occupied) {
        return false;
      }
    }
  }

  return true;
}

function occupy(
  grid: FaceGrid,
  itemId: string,
  gridX: number,
  gridY: number,
  gridW: number,
  gridH: number,
) {
  for (let y = gridY; y < gridY + gridH; y += 1) {
    for (let x = gridX; x < gridX + gridW; x += 1) {
      grid.cells[y][x] = {
        occupied: true,
        moduleId: itemId,
      };
    }
  }
}

export function placeMainScreen(
  face: FaceName,
  shellSize: { width: number; height: number; depth: number },
) {
  if (face === "bottom") {
    throw new Error("v1 涓嶆敮鎸佹妸涓诲睆鏀惧湪 bottom 闈€?");
  }

  const grid = createFaceGrid(face, DEFAULT_SCREEN_GRID.cols, DEFAULT_SCREEN_GRID.rows);
  const gridW = 2;
  const gridH = 2;
  const gridX = 0;
  const gridY = 0;

  occupy(grid, "main-screen", gridX, gridY, gridW, gridH);

  return {
    grid,
    item: {
      id: `screen:${face}`,
      type: "screen" as const,
      face,
      gridX,
      gridY,
      gridW,
      gridH,
      worldPosition: faceGridToWorldPosition(
        shellSize,
        face,
        grid,
        gridX,
        gridY,
        gridW,
        gridH,
        4,
      ),
      rotation: getFaceRotation(face),
      sizeMm: [54, 4, 34] as [number, number, number],
    },
  };
}

export function placePorts(
  faces: FaceName[],
  shellSize: { width: number; height: number; depth: number },
): FacePlacedItem[] {
  const grouped = faces.reduce<Record<FaceName, number>>(
    (acc, face) => {
      acc[face] += 1;
      return acc;
    },
    {
      front: 0,
      back: 0,
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  );

  return Object.entries(grouped).flatMap(([faceName, count]) => {
    const face = faceName as FaceName;
    const grid = createFaceGrid(face, DEFAULT_PORT_GRID.cols, DEFAULT_PORT_GRID.rows);
    const items: FacePlacedItem[] = [];

    for (let index = 0; index < count; index += 1) {
      const gridX = index % grid.cols;
      const gridY = Math.floor(index / grid.cols);

      if (!canPlace(grid, gridX, gridY, 1, 1)) {
        throw new Error(`鏃犳硶鍦?${face} 闈㈡斁缃鍙?${index + 1}`);
      }

      occupy(grid, `port:${face}:${index}`, gridX, gridY, 1, 1);
      items.push({
        id: `port:${face}:${index}`,
        type: "port",
        face,
        gridX,
        gridY,
        gridW: 1,
        gridH: 1,
        worldPosition: faceGridToWorldPosition(
          shellSize,
          face,
          grid,
          gridX,
          gridY,
          1,
          1,
          8,
        ),
        rotation: getFaceRotation(face),
        sizeMm: [12, 8, 8],
      });
    }

    return items;
  });
}
