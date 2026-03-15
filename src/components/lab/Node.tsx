"use client";

import { Box, Cylinder, Html, Sphere, shaderMaterial } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import { motion } from "motion/react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { THEME } from "./constants";
import type { SceneModuleNode } from "./scene-schema";

const ScreenMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color(THEME.primary),
    uOpacity: 0.9,
    uIsSelected: false,
  },
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform bool uIsSelected;
  varying vec2 vUv;

  mat3 rotateY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, 0., s, 0., 1., 0., -s, 0., c);
  }

  mat3 rotateX(float a) {
    float c = cos(a), s = sin(a);
    return mat3(1., 0., 0., 0., c, -s, 0., s, c);
  }

  float sdBoxFrame(vec3 p, vec3 b, float e) {
    p = abs(p) - b;
    vec3 q = abs(p + e) - e;
    return min(min(
      length(max(vec3(p.x, q.y, q.z), 0.0)) + min(max(p.x, max(q.y, q.z)), 0.0),
      length(max(vec3(q.x, p.y, q.z), 0.0)) + min(max(q.x, max(p.y, q.z)), 0.0)),
      length(max(vec3(q.x, q.y, p.z), 0.0)) + min(max(q.x, max(q.y, p.z)), 0.0));
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 ro = vec3(0.0, 0.0, 2.0);
    vec3 rd = normalize(vec3(uv, -1.2));
    float t = uTime * 0.8;
    mat3 rot = rotateY(t) * rotateX(t * 0.5);
    vec3 baseColor = uIsSelected ? vec3(1.0, 0.35, 0.35) : uColor;
    float d = 0.0;
    float glow = 0.0;

    for (int i = 0; i < 40; i++) {
      vec3 p = ro + rd * d;
      vec3 pRot = p * rot;
      float dist = sdBoxFrame(pRot, vec3(0.35), 0.012);
      glow += 0.012 / (dist + 0.035);
      if (dist < 0.001 || d > 5.0) break;
      d += dist;
    }

    float grid = (step(0.98, fract(vUv.x * 10.0)) + step(0.98, fract(vUv.y * 10.0))) * 0.05;
    float scanline = sin(vUv.y * 200.0 + uTime * 5.0) * 0.01 + 0.99;
    gl_FragColor = vec4(baseColor * (glow + grid) * scanline, uOpacity);
  }
  `,
);

extend({ ScreenMaterial });

export function Node({
  node,
  isExploded,
  isSelected,
  isHighlighted,
  isDark,
  onClick,
}: {
  node: SceneModuleNode;
  isExploded: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  isDark: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<{ uTime: number; uIsSelected: boolean } | null>(null);
  const targetPos = useMemo(
    () => (isExploded ? node.explodedPosition : node.assembledPosition),
    [node.assembledPosition, node.explodedPosition, isExploded],
  );
  const screenMaterialInstance = useMemo(() => new (ScreenMaterial as unknown as new () => THREE.ShaderMaterial)(), []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetPos[0], 0.05);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetPos[1], 0.05);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetPos[2], 0.05);

      if (isExploded) {
        groupRef.current.rotation.y += 0.005;
        groupRef.current.rotation.x += 0.002;
      } else {
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.08);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.08);
      }
    }

    if (materialRef.current) {
      materialRef.current.uTime = state.clock.getElapsedTime();
      materialRef.current.uIsSelected = isSelected;
    }

    if (screenMaterialInstance) {
      screenMaterialInstance.uniforms.uColor.value = new THREE.Color(isSelected ? THEME.secondary : THEME.primary);
    }
  });

  const screenRotation = (): [number, number, number] => {
    switch (node.id) {
      case "screen_back":
        return [0, Math.PI, 0];
      case "screen_top":
        return [-Math.PI / 2, 0, 0];
      case "screen_bottom":
        return [Math.PI / 2, 0, 0];
      case "screen_left":
        return [0, -Math.PI / 2, 0];
      case "screen_right":
        return [0, Math.PI / 2, 0];
      default:
        return [0, 0, 0];
    }
  };

  const nodeType = node.type.toLowerCase();
  const nodeCategory = node.category?.toLowerCase() ?? "";

  const renderGeometry = () => {
    if (
      nodeType.includes("sensor") ||
      nodeCategory === "sensor"
    ) {
      return (
        <group>
          <Box args={[0.25, 0.06, 0.25]}>
            <meshStandardMaterial color="#2a313b" roughness={0.18} metalness={0.82} />
          </Box>
          <Box args={[0.08, 0.08, 0.08]} position={[0, 0.04, 0]}>
            <meshStandardMaterial
              color={THEME.primary}
              emissive={THEME.primary}
              emissiveIntensity={isSelected || isHighlighted ? 3.8 : 2.8}
            />
          </Box>
        </group>
      );
    }

    if (
      nodeType.includes("controller") ||
      nodeType.includes("mcu") ||
      nodeCategory === "controller"
    ) {
      return (
        <group>
          <Box args={[0.42, 0.05, 0.32]}>
            <meshStandardMaterial color="#1e2732" roughness={0.42} metalness={0.35} />
          </Box>
          <Box args={[0.2, 0.035, 0.18]} position={[0, 0.028, -0.025]}>
            <meshStandardMaterial color="#aeb9c6" roughness={0.18} metalness={0.95} />
          </Box>
          <Box args={[0.08, 0.018, 0.08]} position={[0, 0.055, -0.02]}>
            <meshStandardMaterial color="#0f141b" roughness={0.22} metalness={0.55} />
          </Box>
          <Box args={[0.09, 0.03, 0.07]} position={[0, 0.02, 0.12]}>
            <meshStandardMaterial color="#ced6de" roughness={0.2} metalness={0.92} />
          </Box>
          <Box args={[0.024, 0.01, 0.024]} position={[-0.11, 0.035, 0.07]}>
            <meshStandardMaterial
              color={THEME.primary}
              emissive={THEME.primary}
              emissiveIntensity={isSelected || isHighlighted ? 4.2 : 1.6}
              toneMapped={false}
            />
          </Box>
          {[-0.18, 0.18].map((x) =>
            [...Array(8)].map((_, i) => (
              <group key={`${x}-${i}`} position={[x, 0.002, -0.12 + i * 0.035]}>
                <Box args={[0.022, 0.02, 0.012]}>
                  <meshStandardMaterial color="#11161d" roughness={0.4} metalness={0.4} />
                </Box>
                <Box args={[0.01, 0.01, 0.024]} position={[x > 0 ? 0.012 : -0.012, -0.002, 0]}>
                  <meshStandardMaterial color="#d6a54a" roughness={0.2} metalness={1} />
                </Box>
              </group>
            )),
          )}
          <Box args={[0.14, 0.006, 0.055]} position={[0, 0.03, -0.135]}>
            <meshStandardMaterial color="#4fd8c2" emissive="#1ea896" emissiveIntensity={0.35} />
          </Box>
        </group>
      );
    }

    if (
      nodeType.includes("screen") ||
      nodeType.includes("display") ||
      nodeCategory === "ui"
    ) {
      return (
        <group rotation={screenRotation()}>
          <Box args={[0.9, 0.9, 0.05]}>
            <meshStandardMaterial color="#29313c" roughness={0.42} metalness={0.58} />
          </Box>
          <mesh position={[0, 0, 0.026]}>
            <planeGeometry args={[0.85, 0.85]} />
            <primitive
              object={screenMaterialInstance}
              attach="material"
              ref={materialRef}
            />
          </mesh>
        </group>
      );
    }

    if (
      nodeType.includes("battery") ||
      nodeCategory === "power"
    ) {
      return (
        <group>
          <Box args={[0.4, 0.2, 0.4]}>
            <meshStandardMaterial color="#35302a" />
          </Box>
          <Box args={[0.38, 0.18, 0.38]}>
            <meshStandardMaterial color={THEME.power} emissive={THEME.power} emissiveIntensity={isSelected || isHighlighted ? 5 : 1.8} toneMapped={false} />
          </Box>
        </group>
      );
    }

    if (
      nodeType.includes("speaker") ||
      nodeCategory === "actuator"
    ) {
        return (
          <group>
            <Cylinder args={[0.15, 0.15, 0.1, 32]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color="#3a424d" />
            </Cylinder>
            <Cylinder args={[0.12, 0.12, 0.11, 32]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color="#171c24" />
            </Cylinder>
          </group>
        );
    }

    if (
      nodeType.includes("network") ||
      nodeType.includes("wifi") ||
      nodeType.includes("communication") ||
      nodeCategory === "communication"
    ) {
      return (
        <group>
          <Box args={[0.2, 0.05, 0.2]}>
            <meshStandardMaterial color="#2a313b" />
          </Box>
          <Box args={[0.15, 0.06, 0.15]}>
            <meshStandardMaterial color={THEME.primary} emissive={THEME.primary} emissiveIntensity={isSelected || isHighlighted ? 5 : 1.8} toneMapped={false} />
          </Box>
        </group>
      );
    }

    switch (node.type) {
      case "sensor_module":
        return (
          <group>
            <Box args={[0.25, 0.06, 0.25]}>
              <meshStandardMaterial color="#2a313b" roughness={0.18} metalness={0.82} />
            </Box>
            <Box args={[0.08, 0.08, 0.08]} position={[0, 0.04, 0]}>
              <meshStandardMaterial
                color={THEME.primary}
                emissive={THEME.primary}
                emissiveIntensity={isSelected || isHighlighted ? 3.8 : 2.8}
              />
            </Box>
          </group>
        );
      default:
        return (
          <Sphere args={[0.2]}>
            <meshStandardMaterial color="white" />
          </Sphere>
        );
    }
  };

  return (
    <group
      ref={groupRef}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {renderGeometry()}
      <Html distanceFactor={8} position={[0, 0.8, 0]} center>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isSelected ? 1 : 0, scale: isSelected ? 1.08 : 1 }}
          className="pointer-events-none select-none"
        >
          <div
            className={`rounded px-2 py-1 text-[9px] font-mono backdrop-blur-md ${
              isSelected
                ? isDark
                  ? "border border-emerald-300/70 bg-emerald-500/18 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.18)]"
                  : "border border-emerald-300 bg-white/78 text-emerald-700 shadow-[0_0_22px_rgba(16,185,129,0.16)]"
                : isHighlighted
                  ? isDark
                    ? "border border-cyan-300/55 bg-cyan-400/10 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.16)]"
                    : "border border-cyan-200 bg-white/74 text-cyan-700 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
                : "border border-white/16 bg-black/72 text-white/58"
            }`}
          >
            {node.label ?? node.id}
          </div>
        </motion.div>
      </Html>
    </group>
  );
}
