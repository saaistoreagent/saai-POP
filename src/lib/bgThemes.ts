/**
 * POP 배경 테마 — CSS로 구현, 레퍼런스 이미지 스타일
 * AI가 상품에 맞는 테마를 자동 선택
 */

export interface BgTheme {
  id: string;
  name: string;
  /** CSS background 속성 */
  background: string;
  /** 텍스트가 잘 보이도록 오버레이 색상 */
  overlay: string;
  /** 이 테마에서 텍스트 색상 (밝은 배경이면 어두운색, 어두운 배경이면 밝은색) */
  textColor: string;
}

export const bgThemes: BgTheme[] = [
  {
    id: 'ice',
    name: '얼음/시원',
    background: `
      radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.4) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 80%, rgba(147,197,253,0.3) 0%, transparent 50%),
      radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 20%),
      radial-gradient(circle at 70% 60%, rgba(255,255,255,0.6) 0%, transparent 15%),
      radial-gradient(circle at 50% 40%, rgba(255,255,255,0.5) 0%, transparent 10%),
      linear-gradient(180deg, #E0F2FE 0%, #BAE6FD 50%, #7DD3FC 100%)
    `,
    overlay: 'rgba(224,242,254,0.5)',
    textColor: '#0C4A6E',
  },
  {
    id: 'fire',
    name: '불꽃/핫',
    background: `
      radial-gradient(ellipse at 50% 100%, rgba(234,88,12,0.6) 0%, transparent 60%),
      radial-gradient(ellipse at 30% 70%, rgba(239,68,68,0.4) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 30%, rgba(251,146,60,0.3) 0%, transparent 50%),
      radial-gradient(circle at 40% 60%, rgba(253,224,71,0.4) 0%, transparent 30%),
      linear-gradient(180deg, #1C1917 0%, #44403C 30%, #78350F 70%, #92400E 100%)
    `,
    overlay: 'rgba(28,25,23,0.4)',
    textColor: '#FFFFFF',
  },
  {
    id: 'nature',
    name: '자연/산뜻',
    background: `
      radial-gradient(ellipse at 20% 80%, rgba(34,197,94,0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 30%, rgba(74,222,128,0.2) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(187,247,208,0.3) 0%, transparent 60%),
      linear-gradient(180deg, #ECFDF5 0%, #D1FAE5 50%, #A7F3D0 100%)
    `,
    overlay: 'rgba(236,253,245,0.5)',
    textColor: '#064E3B',
  },
  {
    id: 'sweet',
    name: '달콤/핑크',
    background: `
      radial-gradient(ellipse at 30% 20%, rgba(236,72,153,0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(244,114,182,0.2) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(253,242,248,0.5) 0%, transparent 60%),
      radial-gradient(circle at 20% 60%, rgba(249,168,212,0.3) 0%, transparent 30%),
      linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 30%, #FBCFE8 70%, #F9A8D4 100%)
    `,
    overlay: 'rgba(253,242,248,0.4)',
    textColor: '#831843',
  },
  {
    id: 'premium',
    name: '프리미엄/다크',
    background: `
      radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(161,98,7,0.1) 0%, transparent 50%),
      linear-gradient(180deg, #0F172A 0%, #1E293B 50%, #334155 100%)
    `,
    overlay: 'rgba(15,23,42,0.3)',
    textColor: '#FFFFFF',
  },
  {
    id: 'summer',
    name: '여름/열대',
    background: `
      radial-gradient(ellipse at 70% 20%, rgba(251,191,36,0.4) 0%, transparent 50%),
      radial-gradient(ellipse at 20% 80%, rgba(14,165,233,0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 70%, rgba(34,211,238,0.2) 0%, transparent 50%),
      linear-gradient(180deg, #FEF3C7 0%, #FDE68A 30%, #93C5FD 70%, #60A5FA 100%)
    `,
    overlay: 'rgba(254,243,199,0.4)',
    textColor: '#78350F',
  },
  {
    id: 'warm',
    name: '따뜻/가을',
    background: `
      radial-gradient(ellipse at 30% 30%, rgba(217,119,6,0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 70%, rgba(180,83,9,0.2) 0%, transparent 50%),
      linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 30%, #FDE68A 70%, #FCD34D 100%)
    `,
    overlay: 'rgba(255,251,235,0.4)',
    textColor: '#78350F',
  },
  {
    id: 'electric',
    name: '전기/에너지',
    background: `
      radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 20% 30%, rgba(59,130,246,0.3) 0%, transparent 40%),
      radial-gradient(ellipse at 80% 70%, rgba(236,72,153,0.2) 0%, transparent 40%),
      repeating-linear-gradient(0deg, transparent 0px, transparent 40px, rgba(139,92,246,0.05) 40px, rgba(139,92,246,0.05) 41px),
      linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)
    `,
    overlay: 'rgba(15,23,42,0.3)',
    textColor: '#FFFFFF',
  },
  {
    id: 'yellow',
    name: '행사/노랑',
    background: `
      radial-gradient(ellipse at 50% 50%, rgba(253,224,71,0.5) 0%, transparent 70%),
      linear-gradient(180deg, #FEF9C3 0%, #FDE047 50%, #FACC15 100%)
    `,
    overlay: 'rgba(254,249,195,0.3)',
    textColor: '#713F12',
  },
  {
    id: 'none',
    name: '없음',
    background: '',
    overlay: '',
    textColor: '',
  },
];

export function getTheme(id: string): BgTheme {
  return bgThemes.find(t => t.id === id) || bgThemes[bgThemes.length - 1];
}
