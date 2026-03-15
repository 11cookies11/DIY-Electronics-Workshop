"use client";

import { QuadraticBezierLine } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { THEME } from "./constants";
import type { SceneConnection } from "./scene-schema";

export function SignalFlow({
  connection,
  startAssembledPos,
  startExplodedPos,
  endAssembledPos,
  endExplodedPos,
  isExploded,
  isDark,
}: {
  connection: SceneConnection;
  startAssembledPos: [number, number, number];
  startExplodedPos: [number, number, number];
  endAssembledPos: [number, number, number];
  endExplodedPos: [number, number, number];
  isExploded: boolean;
  isDark: boolean;
}) {
  const particleRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<{
    setPoints: (start: number[], end: number[], mid: number[]) => void;
  } | null>(null);

  const currentStart = useRef(
    new THREE.Vector3(...(isExploded ? startExplodedPos : startAssembledPos)),
  );
  const currentEnd = useRef(
    new THREE.Vector3(...(isExploded ? endExplodedPos : endAssembledPos)),
  );
  const targetStart = useMemo(
    () => (isExploded ? startExplodedPos : startAssembledPos),
    [isExploded, startAssembledPos, startExplodedPos],
  );
  const targetEnd = useMemo(
    () => (isExploded ? endExplodedPos : endAssembledPos),
    [endAssembledPos, endExplodedPos, isExploded],
  );

  const color = useMemo(() => {
    if (connection.kind === "power") return THEME.power;
    if (connection.kind === "signal") return THEME.secondary;
    return THEME.primary;
  }, [connection.kind]);

  const speed = useMemo(() => {
    if (connection.kind === "power") return 2;
    if (connection.kind === "signal") return 1.5;
    return 3.5;
  }, [connection.kind]);

  useFrame((state) => {
    currentStart.current.lerp(new THREE.Vector3(...targetStart), 0.05);
    currentEnd.current.lerp(new THREE.Vector3(...targetEnd), 0.05);

    if (lineRef.current) {
      lineRef.current.setPoints(
        currentStart.current.toArray(),
        currentEnd.current.toArray(),
        new THREE.Vector3()
          .addVectors(currentStart.current, currentEnd.current)
          .multiplyScalar(0.5)
          .add(new THREE.Vector3(0, isExploded ? 0.5 : 0.1, 0))
          .toArray(),
      );
    }

    if (particleRef.current) {
      const time = state.clock.getElapsedTime() * speed * 0.4;
      const t = time % 1;
      const mid = new THREE.Vector3().addVectors(currentStart.current, currentEnd.current).multiplyScalar(0.5);
      mid.y += isExploded ? 0.5 : 0.1;

      const pos = new THREE.Vector3();
      const invT = 1 - t;
      pos.addScaledVector(currentStart.current, invT * invT);
      pos.addScaledVector(mid, 2 * invT * t);
      pos.addScaledVector(currentEnd.current, t * t);
      particleRef.current.position.copy(pos);

      const scale = 0.03 + Math.sin(state.clock.getElapsedTime() * 5) * 0.01;
      particleRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group>
      <QuadraticBezierLine
        ref={lineRef as never}
        start={currentStart.current.toArray()}
        end={currentEnd.current.toArray()}
        color={color}
        lineWidth={isDark ? 0.3 : 1.2}
        transparent
        opacity={
          isDark
            ? isExploded
              ? 0.34
              : 0.08
            : isExploded
              ? 0.58
              : 0.18
        }
      />
      <mesh ref={particleRef}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isDark ? 0.82 : 0.95}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
