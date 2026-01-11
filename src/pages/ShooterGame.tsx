import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const WEAPONS = [
  { id: 1, name: 'Пистолет', damage: 10, price: 0, icon: 'Gun' },
  { id: 2, name: 'Дробовик', damage: 25, price: 500, icon: 'Target' },
  { id: 3, name: 'Автомат', damage: 15, price: 1000, icon: 'Crosshair' },
  { id: 4, name: 'Снайперская винтовка', damage: 50, price: 2000, icon: 'Scope' },
  { id: 5, name: 'Пулемёт', damage: 20, price: 3000, icon: 'Zap' },
];

const ACHIEVEMENTS = [
  { id: 1, name: 'Первая кровь', desc: 'Убить первого противника', target: 1, icon: 'Award' },
  { id: 2, name: 'Охотник', desc: 'Убить 10 противников', target: 10, icon: 'Target' },
  { id: 3, name: 'Снайпер', desc: 'Убить 25 противников', target: 25, icon: 'Crosshair' },
  { id: 4, name: 'Убийца', desc: 'Убить 50 противников', target: 50, icon: 'Skull' },
  { id: 5, name: 'Богач', desc: 'Накопить 5000 монет', target: 5000, icon: 'DollarSign' },
];

interface Target {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  health: number;
}

function MovingTarget({ target, onHit }: { target: Target; onHit: (id: number) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x += target.velocity[0];
      meshRef.current.position.y += target.velocity[1];
      meshRef.current.position.z += target.velocity[2];

      if (Math.abs(meshRef.current.position.x) > 10) {
        target.velocity[0] *= -1;
      }
      if (meshRef.current.position.y < 0.5 || meshRef.current.position.y > 3) {
        target.velocity[1] *= -1;
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={target.position}
      onClick={() => onHit(target.id)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[0.5, 1.5, 0.3]} />
      <meshStandardMaterial color={hovered ? '#ff4444' : '#666666'} />
    </mesh>
  );
}

function GameScene({ onTargetHit }: { onTargetHit: (id: number) => void }) {
  const [targets, setTargets] = useState<Target[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTargets((prev) => {
        if (prev.length < 5) {
          const newTarget: Target = {
            id: Date.now(),
            position: [Math.random() * 10 - 5, Math.random() * 2 + 0.5, -8],
            velocity: [(Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.03, 0],
            health: 100,
          };
          return [...prev, newTarget];
        }
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleHit = (id: number) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    onTargetHit(id);
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh position={[0, 5, -15]}>
        <planeGeometry args={[30, 10]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {targets.map((target) => (
        <MovingTarget key={target.id} target={target} onHit={handleHit} />
      ))}
    </>
  );
}

export default function ShooterGame() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'shop' | 'achievements'>('menu');
  const [money, setMoney] = useState(0);
  const [kills, setKills] = useState(0);
  const [currentWeapon, setCurrentWeapon] = useState(WEAPONS[0]);
  const [ownedWeapons, setOwnedWeapons] = useState([1]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<number[]>([]);

  useEffect(() => {
    ACHIEVEMENTS.forEach((achievement) => {
      if (!unlockedAchievements.includes(achievement.id)) {
        if (achievement.id <= 4 && kills >= achievement.target) {
          setUnlockedAchievements((prev) => [...prev, achievement.id]);
        } else if (achievement.id === 5 && money >= achievement.target) {
          setUnlockedAchievements((prev) => [...prev, achievement.id]);
        }
      }
    });
  }, [kills, money, unlockedAchievements]);

  const handleTargetHit = () => {
    const reward = 50 + Math.floor(Math.random() * 30);
    setMoney((prev) => prev + reward);
    setKills((prev) => prev + 1);
  };

  const buyWeapon = (weapon: typeof WEAPONS[0]) => {
    if (money >= weapon.price && !ownedWeapons.includes(weapon.id)) {
      setMoney((prev) => prev - weapon.price);
      setOwnedWeapons((prev) => [...prev, weapon.id]);
      setCurrentWeapon(weapon);
    }
  };

  if (gameState === 'menu') {
    return (
      <div className="h-screen w-full bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-gray-800/90 border-red-500/30">
          <h1 className="text-5xl font-bold text-center mb-2 text-red-500">SHOOTER</h1>
          <p className="text-center text-gray-400 mb-8">3D тир</p>
          <div className="space-y-3">
            <Button
              onClick={() => setGameState('playing')}
              className="w-full h-14 text-xl bg-red-600 hover:bg-red-700"
            >
              <Icon name="Play" className="mr-2" size={24} />
              Начать игру
            </Button>
            <Button
              onClick={() => setGameState('shop')}
              className="w-full h-14 text-xl bg-yellow-600 hover:bg-yellow-700"
            >
              <Icon name="ShoppingCart" className="mr-2" size={24} />
              Магазин оружия
            </Button>
            <Button
              onClick={() => setGameState('achievements')}
              className="w-full h-14 text-xl bg-purple-600 hover:bg-purple-700"
            >
              <Icon name="Award" className="mr-2" size={24} />
              Достижения
            </Button>
          </div>
          <div className="mt-8 p-4 bg-gray-900/50 rounded-lg">
            <div className="flex justify-between text-lg">
              <span className="text-yellow-400">💰 Деньги:</span>
              <span className="text-white font-bold">{money}</span>
            </div>
            <div className="flex justify-between text-lg mt-2">
              <span className="text-red-400">☠️ Убийства:</span>
              <span className="text-white font-bold">{kills}</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (gameState === 'shop') {
    return (
      <div className="h-screen w-full bg-gradient-to-b from-gray-900 to-black p-4 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-yellow-500">Магазин оружия</h2>
            <Button onClick={() => setGameState('menu')} variant="outline">
              <Icon name="ArrowLeft" size={20} />
            </Button>
          </div>
          <div className="mb-4 p-4 bg-gray-800 rounded-lg">
            <div className="text-2xl text-yellow-400">💰 Деньги: {money}</div>
          </div>
          <div className="space-y-3">
            {WEAPONS.map((weapon) => {
              const owned = ownedWeapons.includes(weapon.id);
              const canBuy = money >= weapon.price;
              return (
                <Card
                  key={weapon.id}
                  className={`p-4 ${
                    currentWeapon.id === weapon.id ? 'border-green-500 border-2' : 'border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Icon name={weapon.icon as any} size={32} className="text-red-500" />
                      <div>
                        <h3 className="text-xl font-bold text-white">{weapon.name}</h3>
                        <p className="text-gray-400">Урон: {weapon.damage}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {owned ? (
                        <Button
                          onClick={() => setCurrentWeapon(weapon)}
                          disabled={currentWeapon.id === weapon.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {currentWeapon.id === weapon.id ? 'Используется' : 'Выбрать'}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => buyWeapon(weapon)}
                          disabled={!canBuy}
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          💰 {weapon.price}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'achievements') {
    return (
      <div className="h-screen w-full bg-gradient-to-b from-gray-900 to-black p-4 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-purple-500">Достижения</h2>
            <Button onClick={() => setGameState('menu')} variant="outline">
              <Icon name="ArrowLeft" size={20} />
            </Button>
          </div>
          <div className="space-y-3">
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = unlockedAchievements.includes(achievement.id);
              const progress =
                achievement.id <= 4
                  ? Math.min(100, (kills / achievement.target) * 100)
                  : Math.min(100, (money / achievement.target) * 100);
              return (
                <Card
                  key={achievement.id}
                  className={`p-4 ${unlocked ? 'border-purple-500 border-2' : 'border-gray-700'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon
                      name={achievement.icon as any}
                      size={32}
                      className={unlocked ? 'text-purple-500' : 'text-gray-600'}
                    />
                    <div className="flex-1">
                      <h3
                        className={`text-xl font-bold ${unlocked ? 'text-purple-400' : 'text-gray-500'}`}
                      >
                        {achievement.name}
                      </h3>
                      <p className="text-gray-400 text-sm">{achievement.desc}</p>
                    </div>
                    {unlocked && <Icon name="CheckCircle" size={24} className="text-green-500" />}
                  </div>
                  {!unlocked && (
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative bg-black">
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <Card className="p-3 bg-gray-900/90 border-yellow-500/50">
          <div className="text-yellow-400 text-xl font-bold">💰 {money}</div>
        </Card>
        <Card className="p-3 bg-gray-900/90 border-red-500/50">
          <div className="text-red-400 text-xl font-bold">☠️ {kills}</div>
        </Card>
        <Card className="p-3 bg-gray-900/90 border-green-500/50">
          <div className="text-green-400 text-sm">🔫 {currentWeapon.name}</div>
        </Card>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <Button onClick={() => setGameState('menu')} className="bg-red-600 hover:bg-red-700">
          <Icon name="Menu" size={24} />
        </Button>
      </div>

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div className="text-green-500 text-4xl">+</div>
      </div>

      <Canvas camera={{ position: [0, 2, 5], fov: 75 }}>
        <GameScene onTargetHit={handleTargetHit} />
      </Canvas>
    </div>
  );
}
