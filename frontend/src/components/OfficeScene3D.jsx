import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Environment, Grid, ContactShadows, Text, Billboard } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { wsUrl } from "../api/client";

const ROOM_SIZE = 20;
const MOVE_SPEED = 5;
const HALF = ROOM_SIZE / 2 - 1;
const CAM_HEIGHT = 2.6;

const EYE_HEIGHT = 1.65;

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

  // Zoom buttons/keys now control field-of-view (like a first-person scope)
  // instead of camera distance, since there's no "behind the player" anymore.
  useEffect(() => {
    camera.fov = 40 + camDistance * 3;
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

    // True first-person: the camera sits at eye height, exactly at the
    // player's own position — no third-person offset behind them, and (see
    // render below) their own body isn't drawn, so they never see themselves.
    const eyePos = group.position.clone().add(new THREE.Vector3(0, EYE_HEIGHT, 0));
    camera.position.lerp(eyePos, 0.45);

    if (onMove && state.clock.elapsedTime - lastSentRef.current > 0.12) {
      lastSentRef.current = state.clock.elapsedTime;
      onMove(group.position.x, group.position.z, group.rotation.y);
    }
  });

  // Only an invisible position anchor is rendered — no visible body/head, so
  // the local player never sees their own avatar from inside its own eyes.
  return <group ref={groupRef} position={[0, 0, 4]} />;
}


function RemotePlayer({ name, x, z, rot }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <group position={[0, 1, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.38, 0.9, 6, 12]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.35} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.85, 0]} castShadow>
          <sphereGeometry args={[0.32, 24, 24]} />
          <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={0.3} roughness={0.3} />
        </mesh>
        <Billboard position={[0, 1.55, 0]}>
          <Text
            fontSize={0.28}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#05070c"
          >
            {name}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}

function Desk({ position }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[1.6, 0.06, 0.8]} />
        <meshStandardMaterial color="#1a2333" roughness={0.4} metalness={0.2} />
      </mesh>
      {[
        [-0.7, 0.35],
        [0.7, 0.35],
      ].map(([x], i) => (
        <mesh key={i} position={[x, 0.35, 0.3]} castShadow>
          <boxGeometry args={[0.06, 0.7, 0.06]} />
          <meshStandardMaterial color="#0a0e17" />
        </mesh>
      ))}
      <mesh position={[0, 0.98, 0]}>
        <boxGeometry args={[0.5, 0.32, 0.02]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0.42, -0.55]} castShadow>
        <boxGeometry args={[0.5, 0.85, 0.5]} />
        <meshStandardMaterial color="#111827" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Rug({ position, size = [4, 3], color = "#1a2333" }) {
  return (
    <mesh position={[position[0], 0.02, position[1]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function Room() {
  const wallColor = "#0d1220";
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial color="#0e1420" roughness={0.75} metalness={0.15} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[ROOM_SIZE, ROOM_SIZE]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e2938"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2563eb"
        fadeDistance={22}
        fadeStrength={1.5}
        infiniteGrid={false}
      />

      {/* ceiling */}
      <mesh position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial color="#080b12" />
      </mesh>

      <mesh position={[0, 2.5, -ROOM_SIZE / 2]}>
        <boxGeometry args={[ROOM_SIZE, 5, 0.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.5, ROOM_SIZE / 2]}>
        <boxGeometry args={[ROOM_SIZE, 5, 0.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.6} />
      </mesh>
      <mesh position={[-ROOM_SIZE / 2, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[ROOM_SIZE, 5, 0.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.6} />
      </mesh>
      <mesh position={[ROOM_SIZE / 2, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[ROOM_SIZE, 5, 0.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.6} />
      </mesh>

      {/* glowing windows with matching accent lights */}
      {[-6, -2, 2, 6].map((x) => (
        <group key={x}>
          <mesh position={[x, 2.5, -ROOM_SIZE / 2 + 0.11]}>
            <planeGeometry args={[1.6, 2.4]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} />
          </mesh>
          <pointLight position={[x, 2.5, -ROOM_SIZE / 2 + 1.5]} color="#22d3ee" intensity={0.35} distance={6} />
        </group>
      ))}

      {/* BG logo glow on the far wall */}
      <mesh position={[0, 3.2, -ROOM_SIZE / 2 + 0.11]}>
        <circleGeometry args={[0.9, 32]} />
        <meshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={0.7} />
      </mesh>

      <Rug position={[0, 3]} size={[5, 3.5]} color="#161f30" />
      <Desk position={[-4, 0, 1]} />
      <Desk position={[4, 0, 1]} />
      <Desk position={[-4, 0, -4]} />
      <Desk position={[4, 0, -4]} />

      <ContactShadows position={[0, 0.011, 0]} opacity={0.5} scale={ROOM_SIZE} blur={2} far={5} />
    </group>
  );
}

export default function OfficeScene3D({ zoom = 5, companyId, paused = false }) {
  const [locked, setLocked] = useState(false);
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
    <Canvas
      shadows
      camera={{ position: [0, 4, 10], fov: 55 }}
      style={{ background: "linear-gradient(#05070c, #0a0e17)" }}
    >
      <fog attach="fog" args={["#05070c", 12, 26]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={0.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 3.5, 2]} color="#2563eb" intensity={0.6} distance={12} />
      <pointLight position={[0, 3.5, -6]} color="#7c3aed" intensity={0.5} distance={12} />
      <Environment preset="night" />
      <Room />
      <Player camDistance={zoom} onMove={sendMove} paused={paused} />
      {Object.entries(remotePlayers).map(([uid, p]) => (
        <RemotePlayer key={uid} name={p.name} x={p.x} z={p.z} rot={p.rot} />
      ))}
      {!paused && <PointerLockControls onLock={() => setLocked(true)} onUnlock={() => setLocked(false)} />}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.25}
          luminanceSmoothing={0.9}
          intensity={0.9}
          mipmapBlur
        />
        <Vignette offset={0.15} darkness={0.6} />
      </EffectComposer>
    </Canvas>
  );
}
