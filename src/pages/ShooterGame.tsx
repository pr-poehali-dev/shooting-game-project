import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';

const WEAPONS = [
  { id: 1, name: 'Пистолет', damage: 10, price: 0, icon: 'Gun', clipSize: 12, reloadTime: 1.5 },
  { id: 2, name: 'Дробовик', damage: 25, price: 500, icon: 'Target', clipSize: 6, reloadTime: 2.5 },
  { id: 3, name: 'Автомат', damage: 15, price: 1000, icon: 'Crosshair', clipSize: 30, reloadTime: 2 },
  { id: 4, name: 'Снайперская винтовка', damage: 50, price: 2000, icon: 'Scope', clipSize: 5, reloadTime: 3 },
  { id: 5, name: 'Пулемёт', damage: 20, price: 3000, icon: 'Zap', clipSize: 100, reloadTime: 4 },
];

const ACHIEVEMENTS = [
  { id: 1, name: 'Первая кровь', desc: 'Убить первого противника', target: 1, icon: 'Award' },
  { id: 2, name: 'Охотник', desc: 'Убить 10 противников', target: 10, icon: 'Target' },
  { id: 3, name: 'Снайпер', desc: 'Убить 25 противников', target: 25, icon: 'Crosshair' },
  { id: 4, name: 'Убийца', desc: 'Убить 50 противников', target: 50, icon: 'Skull' },
  { id: 5, name: 'Богач', desc: 'Накопить 5000 монет', target: 5000, icon: 'DollarSign' },
  { id: 6, name: 'Мастер перезарядки', desc: 'Перезарядить оружие 20 раз', target: 20, icon: 'RotateCw' },
];

interface Target {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  health: number;
}

interface ControlSettings {
  joystickSize: number;
  fireButtonSize: number;
  sensitivity: number;
  soundVolume: number;
  musicVolume: number;
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

function CameraController({ rotation }: { rotation: { x: number; y: number } }) {
  const { camera } = useThree();

  useFrame(() => {
    camera.rotation.y = rotation.y;
    camera.rotation.x = rotation.x;
  });

  return null;
}

function GameScene({ 
  onTargetHit, 
  cameraRotation,
  difficulty 
}: { 
  onTargetHit: (id: number) => void;
  cameraRotation: { x: number; y: number };
  difficulty: number;
}) {
  const [targets, setTargets] = useState<Target[]>([]);

  useEffect(() => {
    const spawnRate = Math.max(1000, 2000 - difficulty * 200);
    const interval = setInterval(() => {
      setTargets((prev) => {
        if (prev.length < 5 + Math.floor(difficulty / 2)) {
          const speed = 0.03 + difficulty * 0.01;
          const newTarget: Target = {
            id: Date.now(),
            position: [Math.random() * 10 - 5, Math.random() * 2 + 0.5, -8],
            velocity: [(Math.random() - 0.5) * speed, (Math.random() - 0.5) * speed * 0.6, 0],
            health: 100,
          };
          return [...prev, newTarget];
        }
        return prev;
      });
    }, spawnRate);

    return () => clearInterval(interval);
  }, [difficulty]);

  const handleHit = (id: number) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    onTargetHit(id);
  };

  return (
    <>
      <CameraController rotation={cameraRotation} />
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

function VirtualJoystick({ 
  onMove, 
  size 
}: { 
  onMove: (x: number, y: number) => void;
  size: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement>(null);

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    updatePosition(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (isDragging) {
      updatePosition(clientX, clientY);
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const updatePosition = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;
    
    const maxDistance = rect.width / 2;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }
    
    const normalizedX = deltaX / maxDistance;
    const normalizedY = deltaY / maxDistance;
    
    setPosition({ x: deltaX, y: deltaY });
    onMove(normalizedX, -normalizedY);
  };

  return (
    <div
      ref={joystickRef}
      className="relative rounded-full bg-gray-800/50 border-2 border-gray-600"
      style={{ width: size, height: size }}
      onTouchStart={(e) => {
        e.preventDefault();
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      <div
        className="absolute top-1/2 left-1/2 w-1/3 h-1/3 rounded-full bg-red-500/70 transition-transform"
        style={{
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
        }}
      />
    </div>
  );
}

export default function ShooterGame() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'shop' | 'achievements' | 'settings'>('menu');
  const [money, setMoney] = useState(0);
  const [kills, setKills] = useState(0);
  const [reloads, setReloads] = useState(0);
  const [currentWeapon, setCurrentWeapon] = useState(WEAPONS[0]);
  const [ownedWeapons, setOwnedWeapons] = useState([1]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<number[]>([]);
  const [ammo, setAmmo] = useState(WEAPONS[0].clipSize);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [cameraRotation, setCameraRotation] = useState({ x: 0, y: 0 });
  
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const shootSoundRef = useRef<HTMLAudioElement | null>(null);
  const reloadSoundRef = useRef<HTMLAudioElement | null>(null);
  const hitSoundRef = useRef<HTMLAudioElement | null>(null);
  
  const [settings, setSettings] = useState<ControlSettings>({
    joystickSize: 120,
    fireButtonSize: 80,
    sensitivity: 1,
    soundVolume: 0.5,
    musicVolume: 0.3,
  });

  useEffect(() => {
    bgMusicRef.current = new Audio();
    shootSoundRef.current = new Audio();
    reloadSoundRef.current = new Audio();
    hitSoundRef.current = new Audio();

    return () => {
      bgMusicRef.current?.pause();
      shootSoundRef.current?.pause();
      reloadSoundRef.current?.pause();
      hitSoundRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = settings.musicVolume;
      if (gameState === 'playing') {
        bgMusicRef.current.loop = true;
        bgMusicRef.current.play().catch(() => {});
      } else {
        bgMusicRef.current.pause();
      }
    }
  }, [gameState, settings.musicVolume]);

  useEffect(() => {
    ACHIEVEMENTS.forEach((achievement) => {
      if (!unlockedAchievements.includes(achievement.id)) {
        if (achievement.id <= 4 && kills >= achievement.target) {
          setUnlockedAchievements((prev) => [...prev, achievement.id]);
        } else if (achievement.id === 5 && money >= achievement.target) {
          setUnlockedAchievements((prev) => [...prev, achievement.id]);
        } else if (achievement.id === 6 && reloads >= achievement.target) {
          setUnlockedAchievements((prev) => [...prev, achievement.id]);
        }
      }
    });
  }, [kills, money, reloads, unlockedAchievements]);

  useEffect(() => {
    if (kills > 0 && kills % 10 === 0) {
      setDifficulty(Math.min(5, Math.floor(kills / 10) + 1));
    }
  }, [kills]);

  const playSound = (sound: HTMLAudioElement | null, volume: number) => {
    if (sound) {
      sound.currentTime = 0;
      sound.volume = volume * settings.soundVolume;
      sound.play().catch(() => {});
    }
  };

  const handleShoot = useCallback(() => {
    if (isReloading || ammo <= 0) return;
    
    setAmmo((prev) => prev - 1);
    playSound(shootSoundRef.current, 0.3);
  }, [isReloading, ammo, settings.soundVolume]);

  const handleReload = useCallback(() => {
    if (isReloading || ammo === currentWeapon.clipSize) return;
    
    setIsReloading(true);
    setReloadProgress(0);
    setReloads((prev) => prev + 1);
    playSound(reloadSoundRef.current, 0.4);
    
    const startTime = Date.now();
    const duration = currentWeapon.reloadTime * 1000;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setReloadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setIsReloading(false);
        setAmmo(currentWeapon.clipSize);
        setReloadProgress(0);
      }
    }, 50);
  }, [isReloading, ammo, currentWeapon, settings.soundVolume]);

  const handleTargetHit = () => {
    const reward = 50 + Math.floor(Math.random() * 30);
    setMoney((prev) => prev + reward);
    setKills((prev) => prev + 1);
    playSound(hitSoundRef.current, 0.5);
  };

  const buyWeapon = (weapon: typeof WEAPONS[0]) => {
    if (money >= weapon.price && !ownedWeapons.includes(weapon.id)) {
      setMoney((prev) => prev - weapon.price);
      setOwnedWeapons((prev) => [...prev, weapon.id]);
      setCurrentWeapon(weapon);
      setAmmo(weapon.clipSize);
    }
  };

  const handleJoystickMove = (x: number, y: number) => {
    setCameraRotation((prev) => ({
      x: Math.max(-Math.PI / 4, Math.min(Math.PI / 4, prev.x + y * 0.02 * settings.sensitivity)),
      y: prev.y - x * 0.02 * settings.sensitivity,
    }));
  };

  if (gameState === 'menu') {
    return (
      <div className="h-screen w-full bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-gray-800/90 border-red-500/30">
          <h1 className="text-5xl font-bold text-center mb-2 text-red-500">SHOOTER</h1>
          <p className="text-center text-gray-400 mb-8">3D мобильный тир</p>
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
            <Button
              onClick={() => setGameState('settings')}
              className="w-full h-14 text-xl bg-blue-600 hover:bg-blue-700"
            >
              <Icon name="Settings" className="mr-2" size={24} />
              Настройки
            </Button>
          </div>
          <div className="mt-8 p-4 bg-gray-900/50 rounded-lg space-y-2">
            <div className="flex justify-between text-lg">
              <span className="text-yellow-400">💰 Деньги:</span>
              <span className="text-white font-bold">{money}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-red-400">☠️ Убийства:</span>
              <span className="text-white font-bold">{kills}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-blue-400">🎯 Уровень:</span>
              <span className="text-white font-bold">{difficulty}</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (gameState === 'settings') {
    return (
      <div className="h-screen w-full bg-gradient-to-b from-gray-900 to-black p-4 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-blue-500">Настройки</h2>
            <Button onClick={() => setGameState('menu')} variant="outline">
              <Icon name="ArrowLeft" size={20} />
            </Button>
          </div>
          
          <div className="space-y-6">
            <Card className="p-6 bg-gray-800/90">
              <h3 className="text-xl font-bold text-white mb-4">Управление</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 mb-2 block">Размер джойстика: {settings.joystickSize}px</label>
                  <Slider
                    value={[settings.joystickSize]}
                    onValueChange={([value]) => setSettings({ ...settings, joystickSize: value })}
                    min={80}
                    max={160}
                    step={10}
                  />
                </div>
                
                <div>
                  <label className="text-gray-300 mb-2 block">Размер кнопки стрельбы: {settings.fireButtonSize}px</label>
                  <Slider
                    value={[settings.fireButtonSize]}
                    onValueChange={([value]) => setSettings({ ...settings, fireButtonSize: value })}
                    min={60}
                    max={120}
                    step={10}
                  />
                </div>
                
                <div>
                  <label className="text-gray-300 mb-2 block">Чувствительность: {settings.sensitivity.toFixed(1)}x</label>
                  <Slider
                    value={[settings.sensitivity * 10]}
                    onValueChange={([value]) => setSettings({ ...settings, sensitivity: value / 10 })}
                    min={5}
                    max={20}
                    step={1}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gray-800/90">
              <h3 className="text-xl font-bold text-white mb-4">Звук</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 mb-2 block">Громкость звуков: {Math.round(settings.soundVolume * 100)}%</label>
                  <Slider
                    value={[settings.soundVolume * 100]}
                    onValueChange={([value]) => setSettings({ ...settings, soundVolume: value / 100 })}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
                
                <div>
                  <label className="text-gray-300 mb-2 block">Громкость музыки: {Math.round(settings.musicVolume * 100)}%</label>
                  <Slider
                    value={[settings.musicVolume * 100]}
                    onValueChange={([value]) => setSettings({ ...settings, musicVolume: value / 100 })}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
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
                        <p className="text-gray-400 text-sm">
                          Урон: {weapon.damage} | Магазин: {weapon.clipSize} | Перезарядка: {weapon.reloadTime}с
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {owned ? (
                        <Button
                          onClick={() => {
                            setCurrentWeapon(weapon);
                            setAmmo(weapon.clipSize);
                          }}
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
              let current = 0;
              if (achievement.id <= 4) current = kills;
              else if (achievement.id === 5) current = money;
              else if (achievement.id === 6) current = reloads;
              
              const progress = Math.min(100, (current / achievement.target) * 100);
              
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
                      <p className="text-gray-500 text-xs mt-1">{current} / {achievement.target}</p>
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
        <Card className="p-3 bg-gray-900/90 border-blue-500/50">
          <div className="text-blue-400 text-sm">🎯 Уровень {difficulty}</div>
        </Card>
        <Card className="p-3 bg-gray-900/90 border-green-500/50">
          <div className="text-green-400 text-sm">🔫 {currentWeapon.name}</div>
          <div className="text-white text-lg font-bold">{ammo} / {currentWeapon.clipSize}</div>
        </Card>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <Button onClick={() => setGameState('menu')} className="bg-red-600 hover:bg-red-700">
          <Icon name="Menu" size={24} />
        </Button>
      </div>

      {isReloading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <Card className="p-4 bg-gray-900/90">
            <div className="text-yellow-400 text-xl mb-2 text-center">Перезарядка...</div>
            <div className="w-48 bg-gray-700 rounded-full h-3">
              <div
                className="bg-yellow-500 h-3 rounded-full transition-all"
                style={{ width: `${reloadProgress}%` }}
              />
            </div>
          </Card>
        </div>
      )}

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div className="text-green-500 text-4xl font-bold">+</div>
      </div>

      <div className="absolute bottom-6 left-6 z-10">
        <VirtualJoystick 
          onMove={handleJoystickMove} 
          size={settings.joystickSize}
        />
      </div>

      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-3">
        <button
          onTouchStart={handleShoot}
          onClick={handleShoot}
          disabled={isReloading || ammo <= 0}
          className="rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-600 flex items-center justify-center shadow-lg"
          style={{ width: settings.fireButtonSize, height: settings.fireButtonSize }}
        >
          <Icon name="Crosshair" size={settings.fireButtonSize * 0.5} className="text-white" />
        </button>
        <button
          onClick={handleReload}
          disabled={isReloading || ammo === currentWeapon.clipSize}
          className="rounded-full bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 disabled:bg-gray-600 flex items-center justify-center shadow-lg"
          style={{ width: settings.fireButtonSize * 0.75, height: settings.fireButtonSize * 0.75 }}
        >
          <Icon name="RotateCw" size={settings.fireButtonSize * 0.4} className="text-white" />
        </button>
      </div>

      <Canvas camera={{ position: [0, 2, 5], fov: 75 }}>
        <GameScene 
          onTargetHit={handleTargetHit} 
          cameraRotation={cameraRotation}
          difficulty={difficulty}
        />
      </Canvas>
    </div>
  );
}
