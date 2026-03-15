"use client";

import { Box } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

export function BoardMesh({ node }: { node: SceneNode }) {
  return (
    <Box args={node.size} position={node.position}>
      <meshStandardMaterial color="#24313f" roughness={0.42} metalness={0.28} />
    </Box>
  );
}
