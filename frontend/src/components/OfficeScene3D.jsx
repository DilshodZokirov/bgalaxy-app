import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Environment, ContactShadows, Text, Billboard } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { wsUrl } from "../api/client";

const ROOM_SIZE = 28;
const MOVE_SPEED = 5.5;
const HALF = ROOM_SIZE / 2 - 1.2;
const EYE_HEIGHT = 1.65;

/** Warm natural ceramic tile floor (procedural, no external assets). */
function createTileFloorTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const grout = "#8a7d6e";
  const tiles = ["#c4a882", "#b8956a", "#d0b090", "#ba9a78", "#c9ad8e", "#af8f6c"];
  const tileCount = 4;
  const gap = 6;
  const tileSize = (size - gap * (tileCount + 1)) / tileCount;

  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, size, size);

  for (let row = 0; row < tileCount; row++) {
    for (let col = 0; col < tileCount; col++) {
      const x = gap + col * (tileSize + gap);
      const y = gap + row * (tileSize + gap);
      const base = tiles[(row * 3 + col * 2) % tiles.length];
      ctx.fillStyle = base;
      ctx.fillRect(x, y, tileSize, tileSize);

      // Soft variation / stone grain
      for (let i = 0; i < 40; i++) {
        const px = x + Math.random() * tileSize;
        const py = y + Math.random() * tileSize;
        const a = 0.04 + Math.random() * 0.08;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,245,230,${a})` : `rgba(80,60,40,${a})`;
        ctx.fillRect(px, py, 2 + Math.random() * 4, 1 + Math.random() * 3);
      }

      // Edge highlight
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(ROOM_SIZE / 2.2, ROOM_SIZE / 2.2);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const tileFloorMap = typeof document !== "undefined" ? createTileFloorTexture() : null;

function Player({ camDistance, onMove, paused }) {
  const groupRef = useRef();
  const keys = useRef({});
  const lastSentRef = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    const down = (e) => {
      keys.current[e.code] = true;
    };
    const up = (e) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    camera.fov = 42 + camDistance * 2.8;
    camera.updateProjectionMatrix();
  }, [camDistance, camera]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group || paused) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).negate();

    const move = new THREE.Vector3();
    if (keys.current["KeyW"] || keys.current["ArrowUp"]) move.add(forward);
    if (keys.current["KeyS"] || keys.current["ArrowDown"]) move.sub(forward);
    if (keys.current["KeyA"]) move.add(right);
    if (keys.current["ArrowRight"]) move.add(right);
    if (keys.current["KeyD"]) move.sub(right);
    if (keys.current["ArrowLeft"]) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(MOVE_SPEED * delta);
      group.position.x = THREE.MathUtils.clamp(group.position.x + move.x, -HALF, HALF);
      group.position.z = THREE.MathUtils.clamp(group.position.z + move.z, -HALF, HALF);
      group.rotation.y = Math.atan2(move.x, move.z);
    }

    const eyePos = group.position.clone().add(new THREE.Vector3(0, EYE_HEIGHT, 0));
    camera.position.lerp(eyePos, 0.45);

    if (onMove && state.clock.elapsedTime - lastSentRef.current > 0.12) {
      lastSentRef.current = state.clock.elapsedTime;
      onMove(group.position.x, group.position.z, group.rotation.y);
    }
  });

  return <group ref={groupRef} position={[0, 0, 6]} />;
}

function RemotePlayer({ name, x, z, rot }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <group position={[0, 1, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.35, 0.85, 6, 12]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.35} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.82, 0]} castShadow>
          <sphereGeometry args={[0.3, 24, 24]} />
          <meshStandardMaterial color="#fde68a" roughness={0.35} />
        </mesh>
        <Billboard position={[0, 1.5, 0]}>
          <Text fontSize={0.26} color="white" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#0b1220">
            {name}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}

function ModernDesk({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.74, 0]}>
        <boxGeometry args={[1.9, 0.05, 0.9]} />
        <meshStandardMaterial color="#e8eef7" roughness={0.25} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <boxGeometry args={[1.55, 0.68, 0.08]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.05, -0.2]}>
        <boxGeometry args={[0.62, 0.38, 0.03]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#38bdf8" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[0, 0.84, -0.28]}>
        <boxGeometry args={[0.18, 0.22, 0.12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.42, 0.55]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.08, 24]} />
        <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.22, 0.55]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.36, 12]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
    </group>
  );
}

function GlassPanel({ position, args, rotation = 0 }) {
  return (
    <mesh position={position} rotation={[0, rotation, 0]}>
      <boxGeometry args={args} />
      <meshPhysicalMaterial
        color="#dbeafe"
        transparent
        opacity={0.22}
        roughness={0.05}
        metalness={0.1}
        transmission={0.6}
        thickness={0.4}
      />
    </mesh>
  );
}

function Plant({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.36, 16]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#22c55e" roughness={0.7} />
      </mesh>
      <mesh position={[0.12, 0.72, 0.05]} castShadow>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#16a34a" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Lounge({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.45, 1.1]} />
        <meshStandardMaterial color="#334155" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.62, -0.4]} castShadow>
        <boxGeometry args={[2.4, 0.55, 0.28]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.38, 0.85]} castShadow>
        <cylinderGeometry args={[0.45, 0.5, 0.12, 24]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.3} roughness={0.35} />
      </mesh>
    </group>
  );
}

function PendantLight({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.7, 8]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.28, 0.34, 0.18, 24]} />
        <meshStandardMaterial color="#f8fafc" emissive="#fef3c7" emissiveIntensity={0.55} />
      </mesh>
      <pointLight position={[0, -0.55, 0]} color="#fff7ed" intensity={0.55} distance={7} />
    </group>
  );
}

function Room() {
  return (
    <group>
      {/* Floor — natural ceramic tile */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial
          map={tileFloorMap}
          color="#d6c4a8"
          roughness={0.72}
          metalness={0.04}
        />
      </mesh>
      {/* Soft rug under lounge / center path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 3.2]} receiveShadow>
        <planeGeometry args={[4.2, 3.6]} />
        <meshStandardMaterial color="#6b5344" roughness={0.95} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 5.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial color="#f1f5f9" />
      </mesh>

      {/* Soft perimeter walls */}
      <mesh position={[0, 2.6, -ROOM_SIZE / 2]}>
        <boxGeometry args={[ROOM_SIZE, 5.2, 0.18]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.6, ROOM_SIZE / 2]}>
        <boxGeometry args={[ROOM_SIZE, 5.2, 0.18]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>
      <mesh position={[-ROOM_SIZE / 2, 2.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[ROOM_SIZE, 5.2, 0.18]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>
      <mesh position={[ROOM_SIZE / 2, 2.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[ROOM_SIZE, 5.2, 0.18]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.7} />
      </mesh>

      {/* City windows */}
      {[-9, -4.5, 0, 4.5, 9].map((x) => (
        <group key={x}>
          <mesh position={[x, 2.7, -ROOM_SIZE / 2 + 0.1]}>
            <planeGeometry args={[3.2, 3.4]} />
            <meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={0.35} transparent opacity={0.85} />
          </mesh>
          <pointLight position={[x, 2.7, -ROOM_SIZE / 2 + 2]} color="#bae6fd" intensity={0.25} distance={8} />
        </group>
      ))}

      {/* BG wall mark */}
      <Billboard position={[0, 3.4, -ROOM_SIZE / 2 + 0.2]}>
        <Text fontSize={0.9} color="#0f172a" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#e2e8f0">
          BG
        </Text>
      </Billboard>

      {/* Glass dividers */}
      <GlassPanel position={[-3.5, 1.4, -1]} args={[0.08, 2.6, 5.5]} />
      <GlassPanel position={[3.5, 1.4, -1]} args={[0.08, 2.6, 5.5]} />
      <GlassPanel position={[0, 1.4, -6.5]} args={[7.2, 2.6, 0.08]} />

      {/* Workstations */}
      <ModernDesk position={[-7.5, 0, 2]} />
      <ModernDesk position={[-5.2, 0, 2]} />
      <ModernDesk position={[5.2, 0, 2]} />
      <ModernDesk position={[7.5, 0, 2]} />
      <ModernDesk position={[-7.5, 0, -3]} rotation={Math.PI} />
      <ModernDesk position={[-5.2, 0, -3]} rotation={Math.PI} />
      <ModernDesk position={[5.2, 0, -3]} rotation={Math.PI} />
      <ModernDesk position={[7.5, 0, -3]} rotation={Math.PI} />

      {/* Meeting / lounge */}
      <Lounge position={[0, 0, 4.5]} />
      <Plant position={[-10, 0, 8]} />
      <Plant position={[10, 0, 8]} />
      <Plant position={[-10, 0, -8]} />
      <Plant position={[10, 0, -8]} />
      <Plant position={[0, 0, -10]} />

      <PendantLight position={[-6, 4.6, 0]} />
      <PendantLight position={[6, 4.6, 0]} />
      <PendantLight position={[0, 4.6, 3]} />
      <PendantLight position={[0, 4.6, -4]} />

      <ContactShadows position={[0, 0.015, 0]} opacity={0.35} scale={ROOM_SIZE} blur={2.2} far={6} />
    </group>
  );
}

export default function OfficeScene3D({ zoom = 5, companyId, paused = false }) {
  const [, setLocked] = useState(false);
  const [remotePlayers, setRemotePlayers] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    if (paused && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [paused]);

  useEffect(() => {
    if (!companyId) return;
    const socket = new WebSocket(wsUrl(`/ws/office/${companyId}`));
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "roster") {
        const map = {};
        data.players.forEach((p) => {
          map[p.user_id] = p;
        });
        setRemotePlayers(map);
      } else if (data.type === "player-joined" || data.type === "player-moved") {
        setRemotePlayers((prev) => ({ ...prev, [data.user_id]: data }));
      } else if (data.type === "player-left") {
        setRemotePlayers((prev) => {
          const next = { ...prev };
          delete next[data.user_id];
          return next;
        });
      }
    };

    return () => socket.close();
  }, [companyId]);

  function sendMove(x, z, rot) {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "move", x, z, rot }));
    }
  }

  return (
    <Canvas shadows camera={{ position: [0, 4, 10], fov: 55 }} style={{ background: "linear-gradient(#dbeafe, #efe6d8)" }}>
      <fog attach="fog" args={["#e8dfd0", 20, 42]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[8, 14, 6]} intensity={1.0} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, 3.8, 2]} color="#f5e6c8" intensity={0.4} distance={14} />
      <pointLight position={[0, 3.8, -6]} color="#c4b5fd" intensity={0.28} distance={14} />
      <Environment preset="city" />
      <Room />
      <Player camDistance={zoom} onMove={sendMove} paused={paused} />
      {Object.entries(remotePlayers).map(([uid, p]) => (
        <RemotePlayer key={uid} name={p.name} x={p.x} z={p.z} rot={p.rot} />
      ))}
      {!paused && <PointerLockControls onLock={() => setLocked(true)} onUnlock={() => setLocked(false)} />}
      <EffectComposer>
        <Bloom luminanceThreshold={0.45} luminanceSmoothing={0.9} intensity={0.45} mipmapBlur />
        <Vignette offset={0.2} darkness={0.35} />
      </EffectComposer>
    </Canvas>
  );
}
