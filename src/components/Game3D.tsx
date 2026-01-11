import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WEAPONS, Target, MuzzleFlash, HitEffect, Bonus, POWERUPS } from './GameTypes';

export function WeaponModel({ weapon, isReloading, reloadProgress, isInspecting, inspectProgress }: { weapon: typeof WEAPONS[0]; isReloading: boolean; reloadProgress: number; isInspecting: boolean; inspectProgress: number; }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      if (isInspecting) {
        meshRef.current.position.set(0, 0, -1 + inspectProgress * 0.5);
        meshRef.current.rotation.set(Math.sin(inspectProgress * Math.PI * 2) * 0.5, inspectProgress * Math.PI * 2, Math.cos(inspectProgress * Math.PI * 2) * 0.3);
      } else if (isReloading) {
        meshRef.current.rotation.z = Math.sin(reloadProgress * Math.PI) * 0.5;
        meshRef.current.position.set(0.3, -0.3 + Math.sin(reloadProgress * Math.PI) * 0.2, -0.5);
      } else {
        meshRef.current.rotation.set(0, 0, Math.sin(time * 2) * 0.02);
        meshRef.current.position.set(0.3, -0.3 + Math.sin(time * 4) * 0.01, -0.5);
      }
    }
  });

  return (
    <group ref={meshRef} position={[0.3, -0.3, -0.5]}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[0.05, 0.15, 0.3]} /><meshStandardMaterial color={weapon.color} metalness={0.8} roughness={0.2} /></mesh>
      <mesh position={[0, 0, -0.2]}><cylinderGeometry args={[0.015, 0.015, 0.4, 8]} /><meshStandardMaterial color={weapon.color} metalness={0.9} roughness={0.1} /></mesh>
      <mesh position={[-0.03, -0.05, 0.1]}><boxGeometry args={[0.02, 0.08, 0.15]} /><meshStandardMaterial color="#333333" /></mesh>
      <pointLight position={[0, 0, -0.4]} intensity={isReloading ? 0 : 0.5} color="#ff8800" distance={2} />
    </group>
  );
}

export function MuzzleFlashEffect({ flash }: { flash: MuzzleFlash }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) {
      const age = Date.now() - flash.createdAt;
      const opacity = Math.max(0, 1 - age / 100);
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
      meshRef.current.scale.setScalar(1 + age / 50);
    }
  });
  return <mesh ref={meshRef} position={flash.position}><sphereGeometry args={[0.1, 8, 8]} /><meshBasicMaterial color="#ffaa00" transparent opacity={1} /></mesh>;
}

export function HitParticles({ effect }: { effect: HitEffect }) {
  const particlesRef = useRef<THREE.Points>(null);
  useFrame(() => {
    if (particlesRef.current) {
      const age = Date.now() - effect.createdAt;
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) { positions[i + 1] -= 0.02; }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      const opacity = Math.max(0, 1 - age / 500);
      (particlesRef.current.material as THREE.PointsMaterial).opacity = opacity;
    }
  });
  const particleCount = 20;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = effect.position[0] + (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 1] = effect.position[1] + (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 2] = effect.position[2] + (Math.random() - 0.5) * 0.5;
  }
  return <points ref={particlesRef}><bufferGeometry><bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} /></bufferGeometry><pointsMaterial size={0.05} color="#ff4444" transparent opacity={1} /></points>;
}

export function BonusPickup({ bonus, onCollect }: { bonus: Bonus; onCollect: (id: number, powerupId: number) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const powerup = POWERUPS.find(p => p.id === bonus.powerupId);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = bonus.position[1] + Math.sin(state.clock.getElapsedTime() * 2) * 0.1;
    }
  });
  return (
    <mesh ref={meshRef} position={bonus.position} onClick={() => onCollect(bonus.id, bonus.powerupId)}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color={powerup?.color || '#ffffff'} emissive={powerup?.color || '#ffffff'} emissiveIntensity={0.5} />
    </mesh>
  );
}

export function MovingTarget({ target, onHit }: { target: Target; onHit: (id: number, position: [number, number, number]) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x += target.velocity[0];
      meshRef.current.position.y += target.velocity[1];
      meshRef.current.position.z += target.velocity[2];
      if (Math.abs(meshRef.current.position.x) > 10) target.velocity[0] *= -1;
      if (meshRef.current.position.y < 0.5 || meshRef.current.position.y > 3) target.velocity[1] *= -1;
    }
  });
  const handleClick = () => { if (meshRef.current) { const pos = meshRef.current.position; onHit(target.id, [pos.x, pos.y, pos.z]); } };
  return (
    <mesh ref={meshRef} position={target.position} onClick={handleClick} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <boxGeometry args={[0.5, 1.5, 0.3]} />
      <meshStandardMaterial color={hovered ? '#ff4444' : '#666666'} emissive={hovered ? '#ff0000' : '#000000'} emissiveIntensity={hovered ? 0.5 : 0} />
    </mesh>
  );
}

export function CameraController({ rotation }: { rotation: { x: number; y: number } }) {
  const { camera } = useThree();
  useFrame(() => { camera.rotation.y = rotation.y; camera.rotation.x = rotation.x; });
  return null;
}

export function GameScene({ 
  onTargetHit, 
  onBonusCollect,
  cameraRotation, 
  difficulty, 
  currentWeapon, 
  isReloading, 
  reloadProgress,
  isInspecting,
  inspectProgress,
  mapId,
  isSurvivalMode,
  currentWave
}: { 
  onTargetHit: (id: number, position: [number, number, number]) => void;
  onBonusCollect: (id: number, powerupId: number) => void;
  cameraRotation: { x: number; y: number };
  difficulty: number;
  currentWeapon: typeof WEAPONS[0];
  isReloading: boolean;
  reloadProgress: number;
  isInspecting: boolean;
  inspectProgress: number;
  mapId: number;
  isSurvivalMode: boolean;
  currentWave: number;
}) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [muzzleFlashes, setMuzzleFlashes] = useState<MuzzleFlash[]>([]);
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);

  const MAPS = [
    { groundColor: '#2a2a2a', skyColor: '#1a1a1a' },
    { groundColor: '#3a3a3a', skyColor: '#2a2a2a' },
    { groundColor: '#1a3a1a', skyColor: '#0a1a0a' },
    { groundColor: '#d4a574', skyColor: '#b08555' },
  ];
  const currentMap = MAPS[mapId - 1] || MAPS[0];

  useEffect(() => {
    const targetCount = isSurvivalMode ? (5 + currentWave * 2) : (5 + Math.floor(difficulty / 2));
    const spawnRate = isSurvivalMode ? Math.max(500, 1500 - currentWave * 100) : Math.max(1000, 2000 - difficulty * 200);
    const interval = setInterval(() => {
      setTargets((prev) => {
        if (prev.length < targetCount) {
          const speed = isSurvivalMode ? (0.04 + currentWave * 0.015) : (0.03 + difficulty * 0.01);
          return [...prev, { id: Date.now(), position: [Math.random() * 10 - 5, Math.random() * 2 + 0.5, -8], velocity: [(Math.random() - 0.5) * speed, (Math.random() - 0.5) * speed * 0.6, 0] }];
        }
        return prev;
      });
    }, spawnRate);
    return () => clearInterval(interval);
  }, [difficulty, isSurvivalMode, currentWave]);

  useEffect(() => {
    const bonusInterval = setInterval(() => {
      if (Math.random() < 0.05 && bonuses.length < 2) {
        const powerupId = Math.floor(Math.random() * 3) + 1;
        setBonuses((prev) => [...prev, { id: Date.now(), position: [Math.random() * 8 - 4, 1, Math.random() * -6 - 2], powerupId }]);
      }
    }, 5000);
    return () => clearInterval(bonusInterval);
  }, [bonuses.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setMuzzleFlashes((prev) => prev.filter((f) => now - f.createdAt < 100));
      setHitEffects((prev) => prev.filter((e) => now - e.createdAt < 500));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleHit = (id: number, position: [number, number, number]) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    setHitEffects((prev) => [...prev, { id: Date.now(), position, createdAt: Date.now() }]);
    onTargetHit(id, position);
  };

  const handleBonusCollect = (id: number, powerupId: number) => {
    setBonuses((prev) => prev.filter((b) => b.id !== id));
    onBonusCollect(id, powerupId);
  };

  const addMuzzleFlash = () => { setMuzzleFlashes((prev) => [...prev, { id: Date.now(), position: [0.3, -0.1, -0.9], createdAt: Date.now() }]); };
  useEffect(() => { (window as any).triggerMuzzleFlash = addMuzzleFlash; }, []);

  return (
    <>
      <CameraController rotation={cameraRotation} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[30, 30]} /><meshStandardMaterial color={currentMap.groundColor} /></mesh>
      <mesh position={[0, 5, -15]}><planeGeometry args={[30, 10]} /><meshStandardMaterial color={currentMap.skyColor} /></mesh>
      {targets.map((target) => <MovingTarget key={target.id} target={target} onHit={handleHit} />)}
      {bonuses.map((bonus) => <BonusPickup key={bonus.id} bonus={bonus} onCollect={handleBonusCollect} />)}
      {muzzleFlashes.map((flash) => <MuzzleFlashEffect key={flash.id} flash={flash} />)}
      {hitEffects.map((effect) => <HitParticles key={effect.id} effect={effect} />)}
      <WeaponModel weapon={currentWeapon} isReloading={isReloading} reloadProgress={reloadProgress / 100} isInspecting={isInspecting} inspectProgress={inspectProgress} />
    </>
  );
}
