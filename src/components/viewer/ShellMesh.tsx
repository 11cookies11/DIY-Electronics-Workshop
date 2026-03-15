"use client";

import { Box } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

export function ShellMesh({ node }: { node: SceneNode }) {
  return (
    <Box args={node.size} position={node.position}>
      <meshStandardMaterial
        color="#b8c1cc"
        transparent
        opacity={0.18}
        roughness={0.35}
        metalness={0.12}
      />
    </Box>
  );
}
