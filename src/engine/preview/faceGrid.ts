"use client";

import type {
  FaceGrid,
  FaceName,
  FacePlacedItem,
  GridCell,
  PreviewInput,
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

function getFaceDimensions(
  face: FaceName,
  shellSize: { width: number; height: number; depth: number },
) {
  switch (face) {
    case "front":
    case "back":
      return {
        width: shellSize.width,
        height: shellSize.height,
      };
    case "left":
    case "right":
      return {
        width: shellSize.depth,
        height: shellSize.height,
      };
    case "top":
    case "bottom":
      return {
        width: shellSize.width,
        height: shellSize.depth,
      };
  }
}

function resolveScreenSize(
  screen: NonNullable<PreviewInput["mainScreen"]>,
): { width: number; height: number; depth: number } {
  const defaults =
    screen.type === "touch_display"
      ? { width: 62, height: 38, depth: 5 }
      : { width: 54, height: 34, depth: 4 };

  return {
    width: screen.sizeMm?.width ?? defaults.width,
    height: screen.sizeMm?.height ?? defaults.height,
    depth: screen.sizeMm?.depth ?? defaults.depth,
  };
}

function resolvePortSize(
  port: NonNullable<PreviewInput["ports"]>[number],
): { width: number; height: number; depth: number } {
  const defaults = (() => {
    switch (port.type) {
      case "rj45":
        return { width: 18, height: 13, depth: 16 };
      case "audio_jack":
      case "power_jack":
        return { width: 12, height: 10, depth: 12 };
      case "button_cutout":
        return { width: 10, height: 10, depth: 6 };
      case "ir_window":
        return { width: 10, height: 8, depth: 6 };
      case "usb_c":
      default:
        return { width: 12, height: 8, depth: 8 };
    }
  })();

  return {
    width: port.sizeMm?.width ?? defaults.width,
    height: port.sizeMm?.height ?? defaults.height,
    depth: port.sizeMm?.depth ?? defaults.depth,
  };
}

export function placeMainScreen(
  screen: NonNullable<PreviewInput["mainScreen"]>,
  shellSize: { width: number; height: number; depth: number },
) {
  const face = screen.face;

  if (face === "bottom") {
    throw new Error("v1 does not allow the main screen on the bottom face");
  }

  const grid = createFaceGrid(face, DEFAULT_SCREEN_GRID.cols, DEFAULT_SCREEN_GRID.rows);
  const screenSize = resolveScreenSize(screen);
  const faceSize = getFaceDimensions(face, shellSize);
  const gridW = Math.min(
    grid.cols,
    Math.max(1, Math.round((screenSize.width / faceSize.width) * grid.cols)),
  );
  const gridH = Math.min(
    grid.rows,
    Math.max(1, Math.round((screenSize.height / faceSize.height) * grid.rows)),
  );
  const gridX = Math.max(0, Math.floor((grid.cols - gridW) / 2));
  const gridY = Math.max(0, Math.floor((grid.rows - gridH) / 2));

  occupy(grid, "main-screen", gridX, gridY, gridW, gridH);

  return {
    grid,
    item: {
      id: `screen:${face}`,
      type: "screen" as const,
      componentType: screen.type ?? "display_panel",
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
        screenSize.depth,
      ),
      rotation: getFaceRotation(face),
      sizeMm: [screenSize.width, screenSize.depth, screenSize.height] as [
        number,
        number,
        number,
      ],
    },
  };
}

export function placePorts(
  ports: NonNullable<PreviewInput["ports"]>,
  shellSize: { width: number; height: number; depth: number },
): FacePlacedItem[] {
  const grouped = ports.reduce<Record<FaceName, typeof ports>>(
    (acc, port) => {
      acc[port.face].push(port);
      return acc;
    },
    {
      front: [],
      back: [],
      left: [],
      right: [],
      top: [],
      bottom: [],
    },
  );

  return Object.entries(grouped).flatMap(([faceName, facePorts]) => {
    const face = faceName as FaceName;
    const grid = createFaceGrid(face, DEFAULT_PORT_GRID.cols, DEFAULT_PORT_GRID.rows);
    const items: FacePlacedItem[] = [];

    for (let index = 0; index < facePorts.length; index += 1) {
      const port = facePorts[index];
      const portSize = resolvePortSize(port);
      const faceSize = getFaceDimensions(face, shellSize);
      const gridW = Math.min(
        grid.cols,
        Math.max(1, Math.round((portSize.width / faceSize.width) * grid.cols)),
      );
      const gridH = Math.min(
        grid.rows,
        Math.max(1, Math.round((portSize.height / faceSize.height) * grid.rows)),
      );
      const gridX = index % grid.cols;
      const gridY = Math.floor(index / grid.cols);

      if (!canPlace(grid, gridX, gridY, gridW, gridH)) {
        throw new Error(`cannot place port ${index + 1} on face ${face}`);
      }

      occupy(grid, `port:${face}:${index}`, gridX, gridY, gridW, gridH);
      items.push({
        id: `port:${face}:${index}`,
        type: "port",
        componentType: port.type ?? "usb_c",
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
          portSize.depth,
        ),
        rotation: getFaceRotation(face),
        sizeMm: [portSize.width, portSize.depth, portSize.height],
      });
    }

    return items;
  });
}
