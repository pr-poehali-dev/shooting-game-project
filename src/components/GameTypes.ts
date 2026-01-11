export const WEAPONS = [
  { id: 1, name: 'Пистолет', damage: 10, price: 0, icon: 'Gun', clipSize: 12, reloadTime: 1.5, color: '#888888' },
  { id: 2, name: 'Дробовик', damage: 25, price: 500, icon: 'Target', clipSize: 6, reloadTime: 2.5, color: '#8B4513' },
  { id: 3, name: 'Автомат', damage: 15, price: 1000, icon: 'Crosshair', clipSize: 30, reloadTime: 2, color: '#2F4F4F' },
  { id: 4, name: 'Снайперская винтовка', damage: 50, price: 2000, icon: 'Scope', clipSize: 5, reloadTime: 3, color: '#1C1C1C' },
  { id: 5, name: 'Пулемёт', damage: 20, price: 3000, icon: 'Zap', clipSize: 100, reloadTime: 4, color: '#556B2F' },
];

export const ACHIEVEMENTS = [
  { id: 1, name: 'Первая кровь', desc: 'Убить первого противника', target: 1, icon: 'Award' },
  { id: 2, name: 'Охотник', desc: 'Убить 10 противников', target: 10, icon: 'Target' },
  { id: 3, name: 'Снайпер', desc: 'Убить 25 противников', target: 25, icon: 'Crosshair' },
  { id: 4, name: 'Убийца', desc: 'Убить 50 противников', target: 50, icon: 'Skull' },
  { id: 5, name: 'Богач', desc: 'Накопить 5000 монет', target: 5000, icon: 'DollarSign' },
  { id: 6, name: 'Мастер перезарядки', desc: 'Перезарядить оружие 20 раз', target: 20, icon: 'RotateCw' },
  { id: 7, name: 'Выживший', desc: 'Пройти волну 5 в режиме выживания', target: 5, icon: 'Shield' },
];

export const MAPS = [
  { id: 1, name: 'Пустошь', desc: 'Классическая арена', groundColor: '#2a2a2a', skyColor: '#1a1a1a', icon: 'Mountain' },
  { id: 2, name: 'Городские руины', desc: 'Заброшенный город', groundColor: '#3a3a3a', skyColor: '#2a2a2a', icon: 'Building' },
  { id: 3, name: 'Лес', desc: 'Темный лес', groundColor: '#1a3a1a', skyColor: '#0a1a0a', icon: 'Trees' },
  { id: 4, name: 'Пустыня', desc: 'Песчаная буря', groundColor: '#d4a574', skyColor: '#b08555', icon: 'Sun' },
];

export const POWERUPS = [
  { id: 1, name: 'Двойные деньги', desc: 'x2 награда за 30 сек', duration: 30000, color: '#ffd700', icon: 'DollarSign' },
  { id: 2, name: 'Бессмертие', desc: 'Неуязвимость 15 сек', duration: 15000, color: '#00ff00', icon: 'Shield' },
  { id: 3, name: 'Быстрая перезарядка', desc: 'x2 скорость на 30 сек', duration: 30000, color: '#00aaff', icon: 'Zap' },
];

export interface Target { id: number; position: [number, number, number]; velocity: [number, number, number]; }
export interface ControlSettings { joystickSize: number; fireButtonSize: number; sensitivity: number; soundVolume: number; musicVolume: number; }
export interface GameProgress { money: number; kills: number; reloads: number; ownedWeapons: number[]; unlockedAchievements: number[]; currentWeaponId: number; settings: ControlSettings; survivalWave: number; }
export interface MuzzleFlash { id: number; position: [number, number, number]; createdAt: number; }
export interface HitEffect { id: number; position: [number, number, number]; createdAt: number; }
export interface ActivePowerup { id: number; expiresAt: number; }
export interface Bonus { id: number; position: [number, number, number]; powerupId: number; }

export function saveProgress(progress: GameProgress) { localStorage.setItem('shooter3d-progress', JSON.stringify(progress)); }
export function loadProgress(): GameProgress | null { const saved = localStorage.getItem('shooter3d-progress'); if (saved) { try { return JSON.parse(saved); } catch { return null; } } return null; }
