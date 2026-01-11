import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';
import { WEAPONS, ACHIEVEMENTS, MAPS, POWERUPS, ActivePowerup, ControlSettings, saveProgress, loadProgress } from '@/components/GameTypes';
import { GameScene } from '@/components/Game3D';
import { VirtualJoystick } from '@/components/VirtualJoystick';

export default function ShooterGame() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'shop' | 'achievements' | 'settings' | 'mapselect'>('menu');
  const [gameMode, setGameMode] = useState<'classic' | 'survival'>('classic');
  const [money, setMoney] = useState(0);
  const [kills, setKills] = useState(0);
  const [reloads, setReloads] = useState(0);
  const [survivalWave, setSurvivalWave] = useState(0);
  const [currentWeapon, setCurrentWeapon] = useState(WEAPONS[0]);
  const [ownedWeapons, setOwnedWeapons] = useState([1]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<number[]>([]);
  const [ammo, setAmmo] = useState(WEAPONS[0].clipSize);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [cameraRotation, setCameraRotation] = useState({ x: 0, y: 0 });
  const [cameraPosition, setCameraPosition] = useState({ x: 0, z: 5 });
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectProgress, setInspectProgress] = useState(0);
  const [selectedMapId, setSelectedMapId] = useState(1);
  const [activePowerups, setActivePowerups] = useState<ActivePowerup[]>([]);
  const [survivalKills, setSurvivalKills] = useState(0);
  const [survivalTargetKills, setSurvivalTargetKills] = useState(10);
  const [settings, setSettings] = useState<ControlSettings>({ joystickSize: 120, fireButtonSize: 80, sensitivity: 1, soundVolume: 0.5, musicVolume: 0.3 });

  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const shootSoundRef = useRef<HTMLAudioElement | null>(null);
  const reloadSoundRef = useRef<HTMLAudioElement | null>(null);
  const hitSoundRef = useRef<HTMLAudioElement | null>(null);
  const speedMultiplier = activePowerups.some(p => p.id === 3) ? 2 : 1;

  useEffect(() => {
    const progress = loadProgress();
    if (progress) {
      setMoney(progress.money); setKills(progress.kills); setReloads(progress.reloads); setSurvivalWave(progress.survivalWave || 0);
      setOwnedWeapons(progress.ownedWeapons); setUnlockedAchievements(progress.unlockedAchievements); setSettings(progress.settings);
      const weapon = WEAPONS.find((w) => w.id === progress.currentWeaponId) || WEAPONS[0];
      setCurrentWeapon(weapon); setAmmo(weapon.clipSize);
    }
    bgMusicRef.current = new Audio(); shootSoundRef.current = new Audio(); reloadSoundRef.current = new Audio(); hitSoundRef.current = new Audio();
    return () => { bgMusicRef.current?.pause(); shootSoundRef.current?.pause(); reloadSoundRef.current?.pause(); hitSoundRef.current?.pause(); };
  }, []);

  useEffect(() => {
    saveProgress({ money, kills, reloads, ownedWeapons, unlockedAchievements, currentWeaponId: currentWeapon.id, settings, survivalWave });
  }, [money, kills, reloads, ownedWeapons, unlockedAchievements, currentWeapon, settings, survivalWave]);

  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = settings.musicVolume;
      if (gameState === 'playing') { bgMusicRef.current.loop = true; bgMusicRef.current.play().catch(() => {}); } else { bgMusicRef.current.pause(); }
    }
  }, [gameState, settings.musicVolume]);

  useEffect(() => {
    ACHIEVEMENTS.forEach((achievement) => {
      if (!unlockedAchievements.includes(achievement.id)) {
        if (achievement.id <= 4 && kills >= achievement.target) setUnlockedAchievements((prev) => [...prev, achievement.id]);
        else if (achievement.id === 5 && money >= achievement.target) setUnlockedAchievements((prev) => [...prev, achievement.id]);
        else if (achievement.id === 6 && reloads >= achievement.target) setUnlockedAchievements((prev) => [...prev, achievement.id]);
        else if (achievement.id === 7 && survivalWave >= achievement.target) setUnlockedAchievements((prev) => [...prev, achievement.id]);
      }
    });
  }, [kills, money, reloads, survivalWave, unlockedAchievements]);

  useEffect(() => { if (kills > 0 && kills % 10 === 0) setDifficulty(Math.min(5, Math.floor(kills / 10) + 1)); }, [kills]);

  useEffect(() => {
    if (gameMode === 'survival' && survivalKills >= survivalTargetKills) {
      setSurvivalKills(0);
      setSurvivalWave((prev) => prev + 1);
      setSurvivalTargetKills((prev) => prev + 5);
    }
  }, [survivalKills, survivalTargetKills, gameMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActivePowerups((prev) => prev.filter(p => p.expiresAt > now));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const playSound = (sound: HTMLAudioElement | null, volume: number) => { if (sound) { sound.currentTime = 0; sound.volume = volume * settings.soundVolume; sound.play().catch(() => {}); } };

  const handleShoot = useCallback(() => {
    if (isReloading || ammo <= 0 || isInspecting) return;
    setAmmo((prev) => prev - 1);
    playSound(shootSoundRef.current, 0.3);
    if ((window as any).triggerMuzzleFlash) (window as any).triggerMuzzleFlash();
  }, [isReloading, ammo, settings.soundVolume, isInspecting]);

  const handleReload = useCallback(() => {
    if (isReloading || ammo === currentWeapon.clipSize || isInspecting) return;
    setIsReloading(true); setReloadProgress(0); setReloads((prev) => prev + 1);
    playSound(reloadSoundRef.current, 0.4);
    const startTime = Date.now();
    const duration = (currentWeapon.reloadTime * 1000) / speedMultiplier;
    const interval = setInterval(() => {
      const progress = Math.min(100, ((Date.now() - startTime) / duration) * 100);
      setReloadProgress(progress);
      if (progress >= 100) { clearInterval(interval); setIsReloading(false); setAmmo(currentWeapon.clipSize); setReloadProgress(0); }
    }, 50);
  }, [isReloading, ammo, currentWeapon, settings.soundVolume, speedMultiplier, isInspecting]);

  const handleInspect = () => {
    if (isReloading || isInspecting) return;
    setIsInspecting(true); setInspectProgress(0);
    const startTime = Date.now();
    const duration = 2000;
    const interval = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startTime) / duration);
      setInspectProgress(progress);
      if (progress >= 1) { clearInterval(interval); setIsInspecting(false); setInspectProgress(0); }
    }, 50);
  };

  const handleTargetHit = () => {
    const moneyMultiplier = activePowerups.some(p => p.id === 1) ? 2 : 1;
    setMoney((prev) => prev + ((50 + Math.floor(Math.random() * 30)) * moneyMultiplier));
    setKills((prev) => prev + 1);
    if (gameMode === 'survival') setSurvivalKills((prev) => prev + 1);
    playSound(hitSoundRef.current, 0.5);
  };

  const handleBonusCollect = (id: number, powerupId: number) => {
    const now = Date.now();
    const powerup = POWERUPS.find(p => p.id === powerupId);
    if (powerup) {
      setActivePowerups((prev) => [...prev.filter(p => p.id !== powerupId), { id: powerupId, expiresAt: now + powerup.duration }]);
    }
  };

  const buyWeapon = (weapon: typeof WEAPONS[0]) => {
    if (money >= weapon.price && !ownedWeapons.includes(weapon.id)) {
      setMoney((prev) => prev - weapon.price); setOwnedWeapons((prev) => [...prev, weapon.id]);
      setCurrentWeapon(weapon); setAmmo(weapon.clipSize);
    }
  };

  const handleJoystickMove = (x: number, y: number) => {
    const moveSpeed = 0.1 * settings.sensitivity;
    setCameraPosition((prev) => ({
      x: Math.max(-8, Math.min(8, prev.x + x * moveSpeed)),
      z: Math.max(-2, Math.min(10, prev.z - y * moveSpeed))
    }));
  };

  const startGame = (mode: 'classic' | 'survival') => {
    setGameMode(mode);
    if (mode === 'survival') { setSurvivalWave(1); setSurvivalKills(0); setSurvivalTargetKills(10); }
    setGameState('mapselect');
  };

  if (gameState === 'menu') {
    return (
      <div className="h-screen w-full bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-gray-800/90 border-red-500/30">
          <h1 className="text-5xl font-bold text-center mb-2 text-red-500">SHOOTER 3D</h1>
          <p className="text-center text-gray-400 mb-8">Мобильный тир</p>
          <div className="space-y-3">
            <Button onClick={() => startGame('classic')} className="w-full h-14 text-xl bg-red-600 hover:bg-red-700"><Icon name="Play" className="mr-2" size={24} />Классический режим</Button>
            <Button onClick={() => startGame('survival')} className="w-full h-14 text-xl bg-orange-600 hover:bg-orange-700"><Icon name="Shield" className="mr-2" size={24} />Режим выживания</Button>
            <Button onClick={() => setGameState('shop')} className="w-full h-14 text-xl bg-yellow-600 hover:bg-yellow-700"><Icon name="ShoppingCart" className="mr-2" size={24} />Магазин оружия</Button>
            <Button onClick={() => setGameState('achievements')} className="w-full h-14 text-xl bg-purple-600 hover:bg-purple-700"><Icon name="Award" className="mr-2" size={24} />Достижения</Button>
            <Button onClick={() => setGameState('settings')} className="w-full h-14 text-xl bg-blue-600 hover:bg-blue-700"><Icon name="Settings" className="mr-2" size={24} />Настройки</Button>
          </div>
          <div className="mt-8 p-4 bg-gray-900/50 rounded-lg space-y-2">
            <div className="flex justify-between text-lg"><span className="text-yellow-400">💰 Деньги:</span><span className="text-white font-bold">{money}</span></div>
            <div className="flex justify-between text-lg"><span className="text-red-400">☠️ Убийства:</span><span className="text-white font-bold">{kills}</span></div>
            <div className="flex justify-between text-lg"><span className="text-blue-400">🎯 Уровень:</span><span className="text-white font-bold">{difficulty}</span></div>
            {survivalWave > 0 && <div className="flex justify-between text-lg"><span className="text-orange-400">🛡️ Макс волна:</span><span className="text-white font-bold">{survivalWave}</span></div>}
          </div>
        </Card>
      </div>
    );
  }

  if (gameState === 'mapselect') {
    return (
      <div className="h-screen w-full bg-gradient-to-b from-gray-900 to-black p-4 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-green-500">Выбор карты</h2>
            <Button onClick={() => setGameState('menu')} variant="outline"><Icon name="ArrowLeft" size={20} /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MAPS.map((map) => (
              <Card key={map.id} className={`p-6 cursor-pointer hover:border-green-500 transition-all ${selectedMapId === map.id ? 'border-green-500 border-2' : 'border-gray-700'}`} onClick={() => setSelectedMapId(map.id)}>
                <Icon name={map.icon as any} size={48} className="text-green-500 mb-3" />
                <h3 className="text-2xl font-bold text-white mb-2">{map.name}</h3>
                <p className="text-gray-400">{map.desc}</p>
              </Card>
            ))}
          </div>
          <Button onClick={() => setGameState('playing')} className="w-full h-14 text-xl bg-green-600 hover:bg-green-700 mt-6"><Icon name="Check" className="mr-2" size={24} />Начать игру</Button>
        </div>
      </div>
    );
  }

  if (gameState === 'settings') {
    return (
      <div className="h-screen w-full bg-gradient-to-b from-gray-900 to-black p-4 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-blue-500">Настройки</h2>
            <Button onClick={() => setGameState('menu')} variant="outline"><Icon name="ArrowLeft" size={20} /></Button>
          </div>
          <div className="space-y-6">
            <Card className="p-6 bg-gray-800/90">
              <h3 className="text-xl font-bold text-white mb-4">Управление</h3>
              <div className="space-y-4">
                <div><label className="text-gray-300 mb-2 block">Размер джойстика: {settings.joystickSize}px</label><Slider value={[settings.joystickSize]} onValueChange={([value]) => setSettings({ ...settings, joystickSize: value })} min={80} max={160} step={10} /></div>
                <div><label className="text-gray-300 mb-2 block">Размер кнопки стрельбы: {settings.fireButtonSize}px</label><Slider value={[settings.fireButtonSize]} onValueChange={([value]) => setSettings({ ...settings, fireButtonSize: value })} min={60} max={120} step={10} /></div>
                <div><label className="text-gray-300 mb-2 block">Чувствительность: {settings.sensitivity.toFixed(1)}x</label><Slider value={[settings.sensitivity * 10]} onValueChange={([value]) => setSettings({ ...settings, sensitivity: value / 10 })} min={5} max={20} step={1} /></div>
              </div>
            </Card>
            <Card className="p-6 bg-gray-800/90">
              <h3 className="text-xl font-bold text-white mb-4">Звук</h3>
              <div className="space-y-4">
                <div><label className="text-gray-300 mb-2 block">Громкость звуков: {Math.round(settings.soundVolume * 100)}%</label><Slider value={[settings.soundVolume * 100]} onValueChange={([value]) => setSettings({ ...settings, soundVolume: value / 100 })} min={0} max={100} step={5} /></div>
                <div><label className="text-gray-300 mb-2 block">Громкость музыки: {Math.round(settings.musicVolume * 100)}%</label><Slider value={[settings.musicVolume * 100]} onValueChange={([value]) => setSettings({ ...settings, musicVolume: value / 100 })} min={0} max={100} step={5} /></div>
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
            <Button onClick={() => setGameState('menu')} variant="outline"><Icon name="ArrowLeft" size={20} /></Button>
          </div>
          <div className="mb-4 p-4 bg-gray-800 rounded-lg"><div className="text-2xl text-yellow-400">💰 Деньги: {money}</div></div>
          <div className="space-y-3">
            {WEAPONS.map((weapon) => {
              const owned = ownedWeapons.includes(weapon.id);
              const canBuy = money >= weapon.price;
              return (
                <Card key={weapon.id} className={`p-4 ${currentWeapon.id === weapon.id ? 'border-green-500 border-2' : 'border-gray-700'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Icon name={weapon.icon as any} size={32} className="text-red-500" />
                      <div><h3 className="text-xl font-bold text-white">{weapon.name}</h3><p className="text-gray-400 text-sm">Урон: {weapon.damage} | Магазин: {weapon.clipSize} | Перезарядка: {weapon.reloadTime}с</p></div>
                    </div>
                    <div className="text-right">
                      {owned ? <Button onClick={() => { setCurrentWeapon(weapon); setAmmo(weapon.clipSize); }} disabled={currentWeapon.id === weapon.id} className="bg-green-600 hover:bg-green-700">{currentWeapon.id === weapon.id ? 'Используется' : 'Выбрать'}</Button> : <Button onClick={() => buyWeapon(weapon)} disabled={!canBuy} className="bg-yellow-600 hover:bg-yellow-700">💰 {weapon.price}</Button>}
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
            <Button onClick={() => setGameState('menu')} variant="outline"><Icon name="ArrowLeft" size={20} /></Button>
          </div>
          <div className="space-y-3">
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = unlockedAchievements.includes(achievement.id);
              let current = 0;
              if (achievement.id <= 4) current = kills;
              else if (achievement.id === 5) current = money;
              else if (achievement.id === 6) current = reloads;
              else if (achievement.id === 7) current = survivalWave;
              const progress = Math.min(100, (current / achievement.target) * 100);
              return (
                <Card key={achievement.id} className={`p-4 ${unlocked ? 'border-purple-500 border-2' : 'border-gray-700'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon name={achievement.icon as any} size={32} className={unlocked ? 'text-purple-500' : 'text-gray-600'} />
                    <div className="flex-1">
                      <h3 className={`text-xl font-bold ${unlocked ? 'text-purple-400' : 'text-gray-500'}`}>{achievement.name}</h3>
                      <p className="text-gray-400 text-sm">{achievement.desc}</p>
                      <p className="text-gray-500 text-xs mt-1">{current} / {achievement.target}</p>
                    </div>
                    {unlocked && <Icon name="CheckCircle" size={24} className="text-green-500" />}
                  </div>
                  {!unlocked && <div className="w-full bg-gray-700 rounded-full h-2 mt-2"><div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const handleScreenTouch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const deltaX = (touch.clientX - centerX) / rect.width;
      const deltaY = (touch.clientY - centerY) / rect.height;
      setCameraRotation((prev) => ({
        x: Math.max(-Math.PI / 3, Math.min(Math.PI / 3, deltaY * Math.PI / 2)),
        y: deltaX * Math.PI
      }));
    }
  }, []);

  return (
    <div className="h-screen w-full relative bg-black" onTouchMove={handleScreenTouch}>
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <Card className="p-3 bg-gray-900/90 border-yellow-500/50"><div className="text-yellow-400 text-xl font-bold">💰 {money}</div></Card>
        <Card className="p-3 bg-gray-900/90 border-red-500/50"><div className="text-red-400 text-xl font-bold">☠️ {kills}</div></Card>
        {gameMode === 'survival' && (
          <Card className="p-3 bg-gray-900/90 border-orange-500/50">
            <div className="text-orange-400 text-sm">🛡️ Волна {survivalWave}</div>
            <div className="text-white text-xs">{survivalKills} / {survivalTargetKills}</div>
          </Card>
        )}
        {gameMode === 'classic' && <Card className="p-3 bg-gray-900/90 border-blue-500/50"><div className="text-blue-400 text-sm">🎯 Уровень {difficulty}</div></Card>}
        <Card className="p-3 bg-gray-900/90 border-green-500/50"><div className="text-green-400 text-sm">🔫 {currentWeapon.name}</div><div className="text-white text-lg font-bold">{ammo} / {currentWeapon.clipSize}</div></Card>
      </div>

      {activePowerups.length > 0 && (
        <div className="absolute top-4 right-20 z-10 space-y-2">
          {activePowerups.map((ap) => {
            const powerup = POWERUPS.find(p => p.id === ap.id);
            const remaining = Math.ceil((ap.expiresAt - Date.now()) / 1000);
            return (
              <Card key={ap.id} className="p-2 bg-gray-900/90" style={{ borderColor: powerup?.color }}>
                <div className="flex items-center gap-2">
                  <Icon name={powerup?.icon as any} size={20} style={{ color: powerup?.color }} />
                  <span className="text-white text-sm">{remaining}с</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="absolute top-4 right-4 z-10"><Button onClick={() => setGameState('menu')} className="bg-red-600 hover:bg-red-700"><Icon name="Menu" size={24} /></Button></div>

      {isReloading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <Card className="p-4 bg-gray-900/90">
            <div className="text-yellow-400 text-xl mb-2 text-center">Перезарядка...</div>
            <div className="w-48 bg-gray-700 rounded-full h-3"><div className="bg-yellow-500 h-3 rounded-full transition-all" style={{ width: `${reloadProgress}%` }} /></div>
          </Card>
        </div>
      )}

      {isInspecting && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <Card className="p-4 bg-gray-900/90">
            <div className="text-blue-400 text-xl text-center">Осмотр оружия</div>
          </Card>
        </div>
      )}

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div className="relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-0.5 bg-green-500"></div>
            <div className="w-0.5 h-8 bg-green-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-10"><VirtualJoystick onMove={handleJoystickMove} size={settings.joystickSize} /></div>

      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-3">
        <button onTouchStart={handleShoot} onClick={handleShoot} disabled={isReloading || ammo <= 0 || isInspecting} className="rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-600 flex items-center justify-center shadow-lg transition-all active:scale-95" style={{ width: settings.fireButtonSize, height: settings.fireButtonSize }}><Icon name="Crosshair" size={settings.fireButtonSize * 0.5} className="text-white" /></button>
        <button onClick={handleReload} disabled={isReloading || ammo === currentWeapon.clipSize || isInspecting} className="rounded-full bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 disabled:bg-gray-600 flex items-center justify-center shadow-lg transition-all active:scale-95" style={{ width: settings.fireButtonSize * 0.75, height: settings.fireButtonSize * 0.75 }}><Icon name="RotateCw" size={settings.fireButtonSize * 0.4} className="text-white" /></button>
        <button onClick={handleInspect} disabled={isReloading || isInspecting} className="rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-600 flex items-center justify-center shadow-lg transition-all active:scale-95" style={{ width: settings.fireButtonSize * 0.75, height: settings.fireButtonSize * 0.75 }}><Icon name="Eye" size={settings.fireButtonSize * 0.4} className="text-white" /></button>
      </div>

      <Canvas camera={{ position: [0, 2, 5], fov: 75 }}>
        <GameScene 
          onTargetHit={handleTargetHit} 
          onBonusCollect={handleBonusCollect}
          cameraRotation={cameraRotation}
          cameraPosition={cameraPosition}
          difficulty={difficulty} 
          currentWeapon={currentWeapon} 
          isReloading={isReloading} 
          reloadProgress={reloadProgress}
          isInspecting={isInspecting}
          inspectProgress={inspectProgress}
          mapId={selectedMapId}
          isSurvivalMode={gameMode === 'survival'}
          currentWave={survivalWave}
        />
      </Canvas>
    </div>
  );
}