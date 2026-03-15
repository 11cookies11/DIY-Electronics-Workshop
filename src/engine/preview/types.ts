"use client";

export type FaceName =
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom";

export type ShellType = "cube" | "cuboid";

export type ModuleCategory =
  | "core"
  | "power"
  | "communication"
  | "storage"
  | "sensor"
  | "actuator"
  | "interface"
  | "thermal"
  | "mechanical"
  | "other";

export type ModuleShape = "board" | "chip" | "box" | "panel";

export type PreferredZone =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "edge"
  | "any";

export type BoardZone = PreferredZone;

export interface ShellSize {
  width: number;
  height: number;
  depth: number;
}

export interface PreviewInput {
  shell: ShellType;
  shellSize: ShellSize;
  board: {
    placement: "center";
    sizeMm?: {
      width?: number;
      depth?: number;
      thickness?: number;
    };
    grid?: {
      cols?: number;
      rows?: number;
    };
  };
  mainScreen?: {
    face: FaceName;
    type?: "display_panel" | "touch_display";
    sizeMm?: {
      width: number;
      height: number;
      depth: number;
    };
  };
  ports?: Array<{
    face: FaceName;
    type?:
      | "usb_c"
      | "rj45"
      | "audio_jack"
      | "power_jack"
      | "button_cutout"
      | "ir_window";
    sizeMm?: {
      width: number;
      height: number;
      depth: number;
    };
  }>;
  modules: Array<
    | string
    | {
        id: string;
        sizeOverride?: {
          width?: number;
          height?: number;
          depth?: number;
        };
      }
  >;
}

export type PreviewView = "assembled" | "exploded";

export interface ModuleDefinition {
  id: string;
  category: ModuleCategory;
  gridW: number;
  gridH: number;
  sizeMm: {
    width: number;
    height: number;
    depth: number;
  };
  preferredZone: PreferredZone;
  shape: ModuleShape;
}

export interface ResolvedModuleDefinition extends ModuleDefinition {
  sourceId: string;
}

export interface GridCell {
  occupied: boolean;
  moduleId?: string;
}

export interface BoardGrid {
  cols: number;
  rows: number;
  cells: GridCell[][];
}

export interface FaceGrid {
  face: FaceName;
  cols: number;
  rows: number;
  cells: GridCell[][];
}

export interface BoardPlacedModule {
  id: string;
  type: string;
  zone: BoardZone;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  worldPosition: [number, number, number];
  sizeMm: [number, number, number];
}

export interface FacePlacedItem {
  id: string;
  type: "screen" | "port";
  componentType?: string;
  face: FaceName;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  worldPosition: [number, number, number];
  rotation: [number, number, number];
  sizeMm: [number, number, number];
}

export interface SceneNode {
  id: string;
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number, number];
  meta?: Record<string, unknown>;
}

export interface PreviewScene {
  view?: PreviewView;
  shellNode: SceneNode;
  boardNode: SceneNode;
  moduleNodes: SceneNode[];
  screenNodes: SceneNode[];
  portNodes: SceneNode[];
}

export interface FaceDescriptor {
  face: FaceName;
  center: [number, number, number];
  normal: [number, number, number];
  axisU: [number, number, number];
  axisV: [number, number, number];
}

export interface ShellGeometry {
  type: ShellType;
  size: ShellSize;
  center: [number, number, number];
  faces: Record<FaceName, FaceDescriptor>;
}

export interface BoardSpec {
  center: [number, number, number];
  width: number;
  depth: number;
  thickness: number;
  topY: number;
  cols: number;
  rows: number;
}
