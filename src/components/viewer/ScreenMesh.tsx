"use client";

import { Box } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

export function ScreenMesh({ node }: { node: SceneNode }) {
  return (
    <Box args={node.size} position={node.position} rotation={node.rotation}>
      <meshStandardMaterial
        color="#67e8f9"
        emissive="#22d3ee"
        emissiveIntensity={1.4}
        roughness={0.18}
        metalness={0.32}
      />
    </Box>
  );
}
