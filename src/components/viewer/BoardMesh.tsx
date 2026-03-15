"use client";

import { Box, RoundedBox } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

export function BoardMesh({ node }: { node: SceneNode }) {
  return (
    <group position={node.position}>
      <RoundedBox args={node.size} radius={Math.min(...node.size) * 0.06} smoothness={4}>
        <meshStandardMaterial color="#24313f" roughness={0.42} metalness={0.28} />
      </RoundedBox>
      <Box
        args={[node.size[0] * 0.42, Math.max(2, node.size[1] * 0.9), node.size[2] * 0.28]}
        position={[0, node.size[1] * 0.45, 0]}
      >
        <meshStandardMaterial color="#475569" roughness={0.24} metalness={0.42} />
      </Box>
      <Box
        args={[node.size[0] * 0.16, Math.max(1.2, node.size[1] * 0.6), node.size[2] * 0.1]}
        position={[node.size[0] * 0.28, node.size[1] * 0.42, -node.size[2] * 0.2]}
      >
        <meshStandardMaterial color="#cbd5e1" roughness={0.16} metalness={0.88} />
      </Box>
    </group>
  );
}
