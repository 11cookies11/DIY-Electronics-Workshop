"use client";

import { RoundedBox } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

export function BoardMesh({ node }: { node: SceneNode }) {
  return (
    <group position={node.position} rotation={node.rotation}>
      <RoundedBox
        args={node.size}
        radius={Math.min(...node.size) * 0.06}
        smoothness={4}
      >
        <meshStandardMaterial color="#6f8ea3" roughness={0.28} metalness={0.12} />
      </RoundedBox>
    </group>
  );
}
