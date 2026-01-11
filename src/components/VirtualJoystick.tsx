import { useState, useRef } from 'react';

export function VirtualJoystick({ onMove, size }: { onMove: (x: number, y: number) => void; size: number; }) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement>(null);

  const updatePosition = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;
    const maxDistance = rect.width / 2;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > maxDistance) { deltaX = (deltaX / distance) * maxDistance; deltaY = (deltaY / distance) * maxDistance; }
    setPosition({ x: deltaX, y: deltaY });
    onMove(deltaX / maxDistance, -(deltaY / maxDistance));
  };

  return (
    <div ref={joystickRef} className="relative rounded-full bg-gray-800/50 border-2 border-gray-600" style={{ width: size, height: size }}
      onTouchStart={(e) => { e.preventDefault(); setIsDragging(true); updatePosition(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchMove={(e) => { e.preventDefault(); if (isDragging) updatePosition(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchEnd={() => { setIsDragging(false); setPosition({ x: 0, y: 0 }); onMove(0, 0); }}
      onMouseDown={(e) => { setIsDragging(true); updatePosition(e.clientX, e.clientY); }}
      onMouseMove={(e) => { if (isDragging) updatePosition(e.clientX, e.clientY); }}
      onMouseUp={() => { setIsDragging(false); setPosition({ x: 0, y: 0 }); onMove(0, 0); }}
      onMouseLeave={() => { setIsDragging(false); setPosition({ x: 0, y: 0 }); onMove(0, 0); }}>
      <div className="absolute top-1/2 left-1/2 w-1/3 h-1/3 rounded-full bg-red-500/70 transition-transform" style={{ transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` }} />
    </div>
  );
}
