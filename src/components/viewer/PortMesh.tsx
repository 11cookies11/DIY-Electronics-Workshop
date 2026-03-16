"use client";

import { Box, Cylinder, RoundedBox } from "@react-three/drei";
import type { SceneNode } from "@/engine/preview";

const PORT_COLORS: Record<string, string> = {
  usb_c: "#c7d9e8",
  rj45: "#a8c0d4",
  audio_jack: "#d4d4d8",
  power_jack: "#d8b4fe",
  button_cutout: "#86efac",
  button_array: "#86efac",
  ir_window: "#fda4af",
  port: "#c7d9e8",
};

function PortMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.2} metalness={0.18} />;
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
          <meshStandardMaterial color="#eef2f7" roughness={0.14} metalness={0.18} />
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
          <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0.22} />
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
          <meshStandardMaterial color={color} roughness={0.18} metalness={0.2} />
        </RoundedBox>
        <Box args={[node.size[0] * 0.76, node.size[1] * 0.4, node.size[2] * 0.18]} position={[0, 0, node.size[2] * 0.32]}>
          <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0.22} />
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
          <meshStandardMaterial color="#86efac" roughness={0.16} metalness={0.08} />
        </RoundedBox>
        <RoundedBox
          args={[node.size[0] * 0.58, node.size[1] * 0.58, node.size[2] * 0.34]}
          radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.14}
          smoothness={4}
          position={[0, 0, node.size[2] * 0.12]}
        >
          <meshStandardMaterial color="#f0fdf4" roughness={0.14} metalness={0.06} />
        </RoundedBox>
      </group>
    );
  }

  if (type === "button_array") {
    return (
      <group position={node.position} rotation={node.rotation}>
        <RoundedBox
          args={node.size}
          radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.12}
          smoothness={4}
        >
          <meshStandardMaterial color="#d9f99d" roughness={0.18} metalness={0.06} />
        </RoundedBox>
        {[-0.28, 0, 0.28].map((offset) => (
          <RoundedBox
            key={offset}
            args={[node.size[0] * 0.18, node.size[1] * 0.5, node.size[2] * 0.36]}
            radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.1}
            smoothness={4}
            position={[node.size[0] * offset, 0, node.size[2] * 0.16]}
          >
            <meshStandardMaterial color="#f7fee7" roughness={0.14} metalness={0.04} />
          </RoundedBox>
        ))}
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
            emissiveIntensity={0.16}
            roughness={0.16}
            metalness={0.08}
          />
        </RoundedBox>
        <RoundedBox
          args={[node.size[0] * 0.7, node.size[1] * 0.34, node.size[2] * 0.22]}
          radius={Math.min(node.size[0], node.size[1], node.size[2]) * 0.12}
          smoothness={3}
          position={[0, 0, node.size[2] * 0.16]}
        >
          <meshStandardMaterial color="#fff1f2" roughness={0.14} metalness={0.06} />
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
