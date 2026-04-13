'use client';

import { POPShape } from '@/types/pop';

interface CountdownPOPProps {
  count: number;
  color?: string;
  shape?: POPShape;
}

export default function CountdownPOP({ count, color = '#00BCD4', shape = 'normal' }: CountdownPOPProps) {
  if (shape === 'wide') {
    // 가로형: 397x112 — 납작한 배너 스타일
    return (
      <div
        className="w-full h-full relative overflow-hidden flex items-center justify-center gap-3 px-4"
        style={{ backgroundColor: color }}
      >
        {/* 방사형 집중선 */}
        <div
          className="absolute inset-0"
          style={{
            background: `repeating-conic-gradient(${color} 0deg, rgba(255,255,255,0.1) 3deg, ${color} 6deg)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle, transparent 20%, ${color}DD 80%)` }}
        />

        <span className="absolute top-1 left-2 text-sm">💥</span>
        <span className="absolute top-1 right-2 text-sm">💥</span>
        <span className="absolute bottom-1 left-2 text-sm">✨</span>
        <span className="absolute bottom-1 right-2 text-sm">✨</span>

        <p
          className="relative z-10 text-sm font-bold font-pop"
          style={{ color: '#FFD700', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          마지막
        </p>
        <p
          className="relative z-10 font-bold font-pop leading-none"
          style={{
            fontSize: '3.5rem',
            color: '#FFD700',
            textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
            WebkitTextStroke: '1px #000',
          }}
        >
          {count}개
        </p>
      </div>
    );
  }

  // 일반형: 264x224
  return (
    <div
      className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center"
      style={{ backgroundColor: color }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-conic-gradient(${color} 0deg, rgba(255,255,255,0.12) 3deg, ${color} 6deg)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle, transparent 20%, ${color}DD 80%)` }}
      />

      <div className="absolute top-2 left-3 text-base">💥</div>
      <div className="absolute top-2 right-3 text-base">💥</div>
      <div className="absolute bottom-2 left-3 text-base">✨</div>
      <div className="absolute bottom-2 right-3 text-base">✨</div>
      <div className="absolute top-1/2 left-1 -translate-y-1/2 text-sm">⚡</div>
      <div className="absolute top-1/2 right-1 -translate-y-1/2 text-sm">⚡</div>

      <div className="relative z-10 text-center">
        <p
          className="text-sm font-bold font-pop tracking-wider"
          style={{ color: '#FFD700', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          마지막
        </p>
        <p
          className="font-bold font-pop leading-none"
          style={{
            fontSize: '4.5rem',
            color: '#FFD700',
            textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
            WebkitTextStroke: '1px #000',
          }}
        >
          {count}개
        </p>
      </div>
    </div>
  );
}
