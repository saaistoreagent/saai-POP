'use client';

import { BadgeType, POPShape } from '@/types/pop';

interface BadgePOPProps {
  badgeType: BadgeType;
  color?: string;
  shape?: POPShape;
}

const defaultColors: Record<BadgeType, string> = {
  '없음': '#9CA3AF',
  '1+1': '#E91E90',
  '2+1': '#4CAF50',
  '3+1': '#00BCD4',
};

function darken(hex: string): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function BadgePOP({ badgeType, color, shape = 'normal' }: BadgePOPProps) {
  const bg = color || defaultColors[badgeType];
  const shadow = darken(bg);

  if (shape === 'wide') {
    // 가로형: 397x80 — 납작한 배너 스타일
    return (
      <div
        className="w-full h-full flex items-center justify-center font-badge relative overflow-hidden"
        style={{ backgroundColor: bg }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 2px, transparent 2px, transparent 8px)',
          }}
        />
        <span
          className="relative text-3xl font-bold tracking-tight text-white mr-2"
          style={{ textShadow: `2px 2px 0 ${shadow}` }}
        >
          {badgeType}
        </span>
        <span className="relative text-xs font-bold text-white/60 tracking-[0.1em]">SALE</span>
      </div>
    );
  }

  // 일반형: 264x160
  return (
    <div
      className="w-full h-full flex items-center justify-center font-badge relative overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 2px, transparent 2px, transparent 8px)',
        }}
      />
      <div className="absolute bottom-1 right-2 text-[9px] font-bold text-white/50 tracking-[0.15em]">
        SALE
      </div>
      <span
        className="relative text-5xl font-bold tracking-tight text-white"
        style={{ textShadow: `2px 2px 0 ${shadow}` }}
      >
        {badgeType}
      </span>
    </div>
  );
}
