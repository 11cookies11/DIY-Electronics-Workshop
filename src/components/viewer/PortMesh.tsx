"use client";

import { Box } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

export function PortMesh({ node }: { node: SceneNode }) {
  return (
    <Box args={node.size} position={node.position} rotation={node.rotation}>
      <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.55} />
    </Box>
  );
}
