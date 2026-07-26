import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, RoundedBox, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

function formatValue(value, formatter) {
  if (typeof formatter === "function") return formatter(value);
  if (Number.isInteger(value)) return String(value);
  return Number(value).toLocaleString("uz-UZ");
}

function BarMesh({ x, height, color, label, valueLabel, hovered, onHover, onLeave }) {
  const ref = useRef();
  const targetY = height / 2;

  useFrame((_, dt) => {
    if (!ref.current) return;
    const goal = hovered ? 1.08 : 1;
    ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, goal, Math.min(1, dt * 8));
    ref.current.position.y = targetY * ref.current.scale.y;
  });

  return (
    <group position={[x, 0, 0]}>
      <RoundedBox
        ref={ref}
        args={[0.55, Math.max(height, 0.08), 0.55]}
        radius={0.06}
        smoothness={3}
        position={[0, targetY, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover?.();
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onLeave?.();
        }}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.35}
          metalness={0.35}
          emissive={color}
          emissiveIntensity={hovered ? 0.35 : 0.12}
        />
      </RoundedBox>
      <Text
        position={[0, -0.22, 0.4]}
        rotation={[-Math.PI / 2.4, 0, 0]}
        fontSize={0.16}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
      >
        {label}
      </Text>
      {hovered && (
        <Text position={[0, height + 0.35, 0]} fontSize={0.2} color="#f8fafc" anchorX="center" anchorY="bottom">
          {valueLabel}
        </Text>
      )}
    </group>
  );
}

function Scene({ points, color, valueFormatter }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...points.map((p) => Number(p.value) || 0));
  const span = Math.max(points.length - 1, 1);
  const startX = -span * 0.45;

  const bars = useMemo(
    () =>
      points.map((p, i) => {
        const value = Number(p.value) || 0;
        const height = 0.25 + (value / max) * 2.4;
        return {
          key: `${p.label}-${i}`,
          x: startX + i * 0.9,
          height,
          label: String(p.label || "").slice(0, 8),
          valueLabel: formatValue(value, valueFormatter),
          color,
        };
      }),
    [points, max, startX, color, valueFormatter]
  );

  return (
    <>
      <color attach="background" args={["#070b14"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 8, 3]} intensity={1.15} castShadow />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} color="#38bdf8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[5.2, 48]} />
        <meshStandardMaterial color="#0b1220" roughness={0.9} metalness={0.1} />
      </mesh>
      <gridHelper args={[8, 12, "#1e293b", "#111827"]} position={[0, 0.01, 0]} />
      {bars.map((bar, i) => (
        <BarMesh
          key={bar.key}
          {...bar}
          hovered={hover === i}
          onHover={() => setHover(i)}
          onLeave={() => setHover(null)}
        />
      ))}
      <ContactShadows position={[0, 0.02, 0]} opacity={0.45} scale={10} blur={2.2} far={4} />
      <Environment preset="city" />
      <OrbitControls
        enablePan={false}
        minPolarAngle={0.7}
        maxPolarAngle={1.35}
        minDistance={4}
        maxDistance={9}
        autoRotate
        autoRotateSpeed={0.55}
        target={[0, 0.9, 0]}
      />
    </>
  );
}

export default function Wh3DBarChart({
  data = [],
  dataKey = "events",
  color = "#38bdf8",
  height = 260,
  valueFormatter,
}) {
  const points = (data || []).map((row) => ({
    label: row.label,
    value: row[dataKey],
  }));

  if (!points.length) {
    return <p className="wh-empty-inline">3D grafik uchun maʼlumot yoʻq.</p>;
  }

  return (
    <div className="wh-3d-chart" style={{ height }}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [3.2, 2.8, 5.2], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <Scene points={points} color={color} valueFormatter={valueFormatter} />
        </Suspense>
      </Canvas>
      <div className="wh-3d-hint">Sichqoncha bilan aylantiring · ustunga boring</div>
    </div>
  );
}
