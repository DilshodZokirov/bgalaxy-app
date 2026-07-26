import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, Float, Line, OrbitControls, Stars, Text } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

const MODULES = [
  { id: "office", label: "Virtual Ofis", hint: "3D muhitda jamoa", color: "#3b82f6", orbit: 4.2, speed: 0.18, size: 0.42, phase: 0 },
  { id: "chat", label: "Chat", hint: "Real-vaqt aloqa", color: "#22d3ee", orbit: 5.1, speed: 0.14, size: 0.36, phase: 1.1 },
  { id: "ziyo", label: "AI Ziyo", hint: "Shaxsiy yordamchi", color: "#a78bfa", orbit: 6.0, speed: 0.11, size: 0.48, phase: 2.2 },
  { id: "tasks", label: "Vazifalar", hint: "Jamoa ishlari", color: "#34d399", orbit: 6.9, speed: 0.09, size: 0.34, phase: 3.4 },
  { id: "meetings", label: "Uchrashuvlar", hint: "Video qo'ng'iroqlar", color: "#f59e0b", orbit: 7.8, speed: 0.075, size: 0.4, phase: 4.5 },
  { id: "warehouse", label: "Ombor", hint: "Mahsulotlar oqimi", color: "#fb7185", orbit: 8.7, speed: 0.06, size: 0.38, phase: 5.6 },
];

function CoreStar() {
  const mesh = useRef();
  const glow = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = 1 + Math.sin(t * 1.6) * 0.05;
    if (mesh.current) mesh.current.scale.setScalar(s);
    if (glow.current) {
      glow.current.material.opacity = 0.22 + Math.sin(t * 2.1) * 0.06;
      glow.current.scale.setScalar(1.8 + Math.sin(t * 1.4) * 0.15);
    }
  });

  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[1.05, 64, 64]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#2563eb"
          emissiveIntensity={1.4}
          roughness={0.25}
          metalness={0.55}
        />
      </mesh>
      <mesh ref={glow}>
        <sphereGeometry args={[1.55, 32, 32]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <Billboard position={[0, 1.9, 0]}>
        <Text
          fontSize={0.55}
          color="#f8fafc"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#0b1220"
          letterSpacing={0.08}
        >
          BG
        </Text>
      </Billboard>
      <pointLight color="#60a5fa" intensity={3.2} distance={18} />
      <pointLight color="#c4b5fd" intensity={1.4} distance={12} position={[0, 1.5, 0]} />
    </group>
  );
}

function OrbitRing({ radius, color }) {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push([Math.cos(a) * radius, 0, Math.sin(a) * radius]);
    }
    return pts;
  }, [radius]);

  return (
    <group rotation={[-0.55, 0, 0]}>
      <Line points={points} color={color} transparent opacity={0.2} lineWidth={1} />
    </group>
  );
}

function Planet({ mod, active, onSelect, onHover }) {
  const group = useRef();
  const body = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    const t = state.clock.elapsedTime * mod.speed + mod.phase;
    const x = Math.cos(t) * mod.orbit;
    const z = Math.sin(t) * mod.orbit;
    const y = Math.sin(t * 1.4) * 0.35;
    if (group.current) group.current.position.set(x, y, z);
    if (body.current) {
      body.current.rotation.y += 0.01;
      const target = hovered || active ? 1.25 : 1;
      const s = THREE.MathUtils.lerp(body.current.scale.x, target, 0.12);
      body.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.35}>
        <mesh
          ref={body}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(mod);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            onHover(mod);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            onHover(null);
            document.body.style.cursor = "auto";
          }}
        >
          <sphereGeometry args={[mod.size, 32, 32]} />
          <meshStandardMaterial
            color={mod.color}
            emissive={mod.color}
            emissiveIntensity={hovered || active ? 1.1 : 0.55}
            roughness={0.35}
            metalness={0.4}
          />
        </mesh>
        <mesh scale={1.35}>
          <sphereGeometry args={[mod.size, 24, 24]} />
          <meshBasicMaterial color={mod.color} transparent opacity={hovered || active ? 0.22 : 0.1} depthWrite={false} />
        </mesh>
      </Float>
      {(hovered || active) && (
        <Billboard position={[0, mod.size + 0.55, 0]}>
          <Text
            fontSize={0.28}
            color="#f8fafc"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.015}
            outlineColor="#020617"
          >
            {mod.label}
          </Text>
        </Billboard>
      )}
      <pointLight color={mod.color} intensity={hovered || active ? 1.2 : 0.45} distance={3.5} />
    </group>
  );
}

function Dust() {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(900);
    for (let i = 0; i < 300; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={300} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#93c5fd" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function SceneContent({ selectedId, onSelect, onHover }) {
  return (
    <>
      <color attach="background" args={["#030712"]} />
      <fog attach="fog" args={["#030712", 14, 38]} />
      <ambientLight intensity={0.25} />
      <Stars radius={90} depth={50} count={3500} factor={3.5} saturation={0} fade speed={0.6} />
      <Dust />
      <CoreStar />
      {MODULES.map((m) => (
        <OrbitRing key={`ring-${m.id}`} radius={m.orbit} color={m.color} />
      ))}
      {MODULES.map((m) => (
        <Planet
          key={m.id}
          mod={m}
          active={selectedId === m.id}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      <OrbitControls
        enablePan={false}
        minDistance={7}
        maxDistance={18}
        minPolarAngle={0.7}
        maxPolarAngle={1.55}
        autoRotate
        autoRotateSpeed={0.45}
      />
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.85} intensity={1.15} mipmapBlur />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0004, 0.0006)}
        />
        <Vignette offset={0.2} darkness={0.75} />
      </EffectComposer>
    </>
  );
}

export { MODULES };

export default function GalaxyHubScene({ selectedId, onSelect, onHover }) {
  return (
    <Canvas camera={{ position: [0, 4.5, 12], fov: 48 }} dpr={[1, 1.75]}>
      <SceneContent selectedId={selectedId} onSelect={onSelect} onHover={onHover} />
    </Canvas>
  );
}
