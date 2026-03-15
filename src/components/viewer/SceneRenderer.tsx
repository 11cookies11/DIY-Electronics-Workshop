"use client";

import type { PreviewScene } from "@/engine/preview";
import { BoardMesh } from "./BoardMesh";
import { ModuleMesh } from "./ModuleMesh";
import { PortMesh } from "./PortMesh";
import { ScreenMesh } from "./ScreenMesh";
import { ShellMesh } from "./ShellMesh";

export function SceneRenderer({ scene }: { scene: PreviewScene }) {
  return (
    <>
      <ShellMesh node={scene.shellNode} />
      <BoardMesh node={scene.boardNode} />
      {scene.moduleNodes.map((node) => (
        <ModuleMesh key={node.id} node={node} />
      ))}
      {scene.screenNodes.map((node) => (
        <ScreenMesh key={node.id} node={node} />
      ))}
      {scene.portNodes.map((node) => (
        <PortMesh key={node.id} node={node} />
      ))}
    </>
  );
}
