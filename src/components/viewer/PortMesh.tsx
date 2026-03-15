"use client";

import { Box, Cylinder, RoundedBox } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

const PORT_COLORS: Record<string, string> = {
  usb_c: "#94a3b8",
  rj45: "#64748b",
  audio_jack: "#a1a1aa",
  power_jack: "#a78bfa",
  button_cutout: "#34d399",
  ir_window: "#fb7185",
  port: "#94a3b8",
};

function PortMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.3} metalness={0.55} />;
}

export function PortMesh({ node }: { node: SceneNode }) {
  const type = String(node.meta?.componentType ?? node.type);
  const color = PORT_COLORS[type] ?? PORT_COLORS.port;

  if (type === "audio_jack" || type === "power_jack") {
    return (
      <group position={node.position} rotation={node.rotation}>
        <Cylinder
          args={[
            Math.max(2, Math.min(node.size[0], node.size[1]) * 0.48),
            Math.max(2, Math.min(node.size[0], node.size[1]) * 0.48),
            Math.max(4, node.size[2]),
            24,
          ]}
        >
          <PortMaterial color={color} />
        </Cylinder>
        <Cylinder
          args={[
            Math.max(1, Math.min(node.size[0], node.size[1]) * 0.24),
            Math.max(1, Math.min(node.size[0], node.size[1]) * 0.24),
            Math.max(2, node.size[2] * 0.5),
            20,
          ]}
          position={[0, 0, node.size[2] * 0.18]}
        >
          <meshStandardMaterial color="#64748b" roughness={0.18} metalness={0.4} />
        </Cylinder>
      </group>
    );
  }

  if (type === "usb_c") {
    return (
      <group position={node.position} rotation={node.rotation}>
        <RoundedBox
          args={node.size}
          radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.12}
          smoothness={3}
        >
          <PortMaterial color={color} />
        </RoundedBox>
        <RoundedBox
          args={[node.size[0] * 0.7, node.size[1] * 0.42, node.size[2] * 0.3]}
          radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.08}
          smoothness={3}
          position={[0, 0, node.size[2] * 0.18]}
        >
          <meshStandardMaterial color="#e2e8f0" roughness={0.16} metalness={0.9} />
        </RoundedBox>
      </group>
    );
  }

  if (type === "rj45") {
    return (
      <group position={node.position} rotation={node.rotation}>
        <RoundedBox
          args={node.size}
          radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.06}
          smoothness={3}
        >
          <meshStandardMaterial color={color} roughness={0.28} metalness={0.62} />
        </RoundedBox>
        <Box args={[node.size[0] * 0.76, node.size[1] * 0.4, node.size[2] * 0.18]} position={[0, 0, node.size[2] * 0.32]}>
          <meshStandardMaterial color="#cbd5e1" roughness={0.16} metalness={0.9} />
        </Box>
      </group>
    );
  }

  if (type === "button_cutout") {
    return (
      <group position={node.position} rotation={node.rotation}>
        <RoundedBox
          args={node.size}
          radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.18}
          smoothness={4}
        >
          <meshStandardMaterial color="#10b981" roughness={0.22} metalness={0.18} />
        </RoundedBox>
        <RoundedBox
          args={[node.size[0] * 0.58, node.size[1] * 0.58, node.size[2] * 0.34]}
          radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.14}
          smoothness={4}
          position={[0, 0, node.size[2] * 0.12]}
        >
          <meshStandardMaterial color="#bbf7d0" roughness={0.18} metalness={0.24} />
        </RoundedBox>
      </group>
    );
  }

  if (type === "ir_window") {
    return (
      <group position={node.position} rotation={node.rotation}>
        <RoundedBox
          args={node.size}
          radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.16}
          smoothness={3}
        >
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.24}
            roughness={0.22}
            metalness={0.18}
          />
        </RoundedBox>
        <RoundedBox
          args={[node.size[0] * 0.7, node.size[1] * 0.34, node.size[2] * 0.22]}
          radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.12}
          smoothness={3}
          position={[0, 0, node.size[2] * 0.16]}
        >
          <meshStandardMaterial color="#fecdd3" roughness={0.18} metalness={0.2} />
        </RoundedBox>
      </group>
    );
  }

  return (
    <Box args={node.size} position={node.position} rotation={node.rotation}>
      <PortMaterial color={color} />
    </Box>
  );
}
