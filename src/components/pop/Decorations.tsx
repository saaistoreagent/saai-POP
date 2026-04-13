'use client';

/** 화려한 SVG 장식 요소들 — 편의점 POP 스타일 */

export function Starburst({ color, size = 120, className = '' }: { color: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} style={{ position: 'absolute' }}>
      <polygon
        points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35"
        fill={color}
        opacity={0.3}
      />
    </svg>
  );
}

export function CircleBurst({ color, className = '' }: { color: string; className?: string }) {
  return (
    <div className={`absolute ${className}`}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="absolute w-3 h-3 rounded-full" style={{
          backgroundColor: color,
          opacity: 0.4 + Math.random() * 0.3,
          transform: `rotate(${i * 45}deg) translateY(-${20 + Math.random() * 15}px)`,
        }} />
      ))}
    </div>
  );
}

export function DiagonalStripes({ color, opacity = 0.1 }: { color: string; opacity?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="stripes" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="40" stroke={color} strokeWidth="8" opacity={opacity} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#stripes)" />
      </svg>
    </div>
  );
}

export function SparkleGroup({ color, count = 5 }: { color: string; count?: number }) {
  const sparkles = Array.from({ length: count }, (_, i) => ({
    left: `${10 + Math.random() * 80}%`,
    top: `${10 + Math.random() * 80}%`,
    size: 8 + Math.random() * 16,
    delay: i * 0.3,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {sparkles.map((s, i) => (
        <svg key={i} className="absolute animate-pulse" style={{ left: s.left, top: s.top, animationDelay: `${s.delay}s` }}
          width={s.size} height={s.size} viewBox="0 0 24 24">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z" fill={color} opacity={0.6} />
        </svg>
      ))}
    </div>
  );
}

/** 화려한 배경 — 그라데이션 + 패턴 */
export function FancyBg({ primary, accent, style = 'radial' }: { primary: string; accent: string; style?: 'radial' | 'diagonal' | 'wave' }) {
  const bg = (() => {
    switch (style) {
      case 'diagonal':
        return `linear-gradient(135deg, ${primary} 0%, ${adjustBrightness(primary, -20)} 50%, ${accent} 100%)`;
      case 'wave':
        return `radial-gradient(ellipse at 20% 80%, ${accent}88 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, ${primary} 0%, ${adjustBrightness(primary, -30)} 100%)`;
      case 'radial':
      default:
        return `radial-gradient(circle at 30% 30%, ${adjustBrightness(primary, 20)} 0%, ${primary} 40%, ${adjustBrightness(primary, -20)} 100%)`;
    }
  })();

  return <div className="absolute inset-0" style={{ background: bg, zIndex: 0 }} />;
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + percent));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}
