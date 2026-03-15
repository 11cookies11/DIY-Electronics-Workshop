"use client";

import { Circle, RoundedBox } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

export function ScreenMesh({ node }: { node: SceneNode }) {
  const type = String(node.meta?.componentType ?? node.type);
  const isRoundLike = node.size[0] === node.size[1] && node.size[0] <= 40;

  if (type === "touch_display" && isRoundLike) {
    const radius = Math.min(node.size[0], node.size[2]) * 0.48;

    return (
      <group position={node.position} rotation={node.rotation}>
        <Circle args={[radius, 40]}>
          <meshStandardMaterial color="#64748b" roughness={0.24} metalness={0.42} />
        </Circle>
        <Circle args={[radius * 0.82, 40]} position={[0, 0, node.size[2] * 0.08]}>
          <meshStandardMaterial
            color="#67e8f9"
            emissive="#22d3ee"
            emissiveIntensity={1.2}
            roughness={0.12}
            metalness={0.22}
          />
        </Circle>
      </group>
    );
  }

  return (
    <group position={node.position} rotation={node.rotation}>
      <RoundedBox
        args={node.size}
        radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.08}
        smoothness={4}
      >
        <meshStandardMaterial color="#475569" roughness={0.24} metalness={0.32} />
      </RoundedBox>
      <RoundedBox
        args={[node.size[0] * 0.88, Math.max(2, node.size[1] * 0.38), node.size[2] * 0.84]}
        radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.06}
        smoothness={4}
        position={[0, 0, node.size[2] * 0.06]}
      >
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={type === "touch_display" ? 1.5 : 1.15}
          roughness={0.1}
          metalness={0.22}
        />
      </RoundedBox>
      {type === "touch_display" ? (
        <RoundedBox
          args={[node.size[0] * 0.94, Math.max(1.5, node.size[1] * 0.16), node.size[2] * 0.9]}
          radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.05}
          smoothness={4}
          position={[0, 0, node.size[2] * 0.12]}
        >
          <meshStandardMaterial color="#e0f2fe" transparent opacity={0.16} roughness={0.04} metalness={0.1} />
        </RoundedBox>
      ) : null}
    </group>
  );
}
