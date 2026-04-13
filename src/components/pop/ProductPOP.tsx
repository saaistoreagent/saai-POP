'use client';

import { POPGeneratedData } from '@/types/pop';
import { BgTheme } from '@/lib/bgThemes';
import { LayoutId } from '@/lib/layouts';
import BgLayer from './BgLayer';
import { FancyBg } from './Decorations';

interface ProductPOPProps {
  productName: string;
  price?: number;
  productImageUrl?: string;
  catchphrase: string;
  subCopy: string;
  color: POPGeneratedData['color'];
  compact?: boolean;
  bgTheme?: BgTheme;
  bgImage?: string;
  layout?: LayoutId;
}

/* 텍스트 — 굵은 외곽선으로 어떤 배경에서든 읽힘 */
const headStyle: React.CSSProperties = {
  textShadow: '0 0 10px rgba(0,0,0,0.5)',
  paintOrder: 'stroke fill',
  WebkitTextStroke: '2.5px rgba(0,0,0,0.6)',
  letterSpacing: '-0.02em',
};
const subStyle: React.CSSProperties = {
  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
  paintOrder: 'stroke fill',
  WebkitTextStroke: '1px rgba(0,0,0,0.4)',
};
const priceStyle: React.CSSProperties = {
  textShadow: '0 2px 10px rgba(0,0,0,0.5)',
  paintOrder: 'stroke fill',
  WebkitTextStroke: '1.5px rgba(0,0,0,0.5)',
};

export default function ProductPOP({
  productName, price, productImageUrl, catchphrase, subCopy, color,
  compact = false, bgTheme, bgImage, layout = 'left-image',
}: ProductPOPProps) {
  const hasImage = !!productImageUrl;
  const glow = color.accent;

  /* ── compact (와이드형) ── */
  if (compact) {
    return (
      <div className="w-full h-full overflow-hidden relative" style={{ backgroundColor: color.primary }}>
        {bgImage ? <BgLayer image={bgImage} /> : <FancyBg primary={color.primary} accent={color.accent} style="diagonal" />}
        <div className="relative z-10 w-full h-full flex items-center">
          {hasImage && (
            <div className="h-full w-[40%] flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImageUrl} alt={productName}
                className="max-h-[90%] max-w-full object-contain"
                style={{ filter: `drop-shadow(0 0 20px ${glow}88) drop-shadow(0 4px 8px rgba(0,0,0,0.4))` }} />
            </div>
          )}
          <div className={`flex-1 flex flex-col justify-center ${hasImage ? 'pr-4' : 'px-6 items-center text-center'}`}>
            <p className="font-black font-pop text-white leading-none" style={{ fontSize: '1.8rem', ...headStyle }}>{catchphrase}</p>
            {!!price && price > 0 && (
              <p className="mt-1 font-black font-pop text-yellow-300" style={{ fontSize: '2rem', ...priceStyle }}>
                {price.toLocaleString('ko-KR')}원
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── 일반형 (561px 높이) — 상품이 주인공 ── */
  return (
    <div className="w-full h-full overflow-hidden relative" style={{ backgroundColor: color.primary }}>
      {/* 배경 */}
      {bgImage ? (
        <BgLayer image={bgImage} />
      ) : (
        <FancyBg primary={color.primary} accent={color.accent} style={layout === 'center-bold' ? 'radial' : 'wave'} />
      )}

      {/* 어두운 오버레이 (텍스트 가독성) */}
      <div className="absolute inset-0 bg-black/25 z-[1]" />

      <div className="relative z-10 w-full h-full flex flex-col">
        {/* 상단: 캐치프레이즈 — 크고 강렬하게 */}
        <div className="px-6 pt-6 pb-2">
          <h1 className="font-black font-pop text-white text-center leading-none"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', ...headStyle }}>
            {catchphrase}
          </h1>
          <p className="mt-2 text-base font-bold text-white/75 text-center" style={subStyle}>{subCopy}</p>
        </div>

        {/* 중앙: 상품 이미지 — 크게 꽉 차게 */}
        <div className="flex-1 flex items-center justify-center relative px-4">
          {hasImage ? (
            <div className="relative flex items-center justify-center w-full h-full">
              {/* 상품 뒤 글로우 — 배경과 어우러지게 */}
              <div className="absolute" style={{
                width: '80%', height: '80%',
                background: `radial-gradient(circle, ${glow}55 0%, ${glow}22 40%, transparent 70%)`,
                filter: 'blur(30px)',
              }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImageUrl} alt={productName}
                className="relative max-h-full max-w-[85%] object-contain"
                style={{ filter: `drop-shadow(0 0 30px ${glow}99) drop-shadow(0 8px 20px rgba(0,0,0,0.5))` }} />
            </div>
          ) : (
            <div className="text-center px-6">
              <p className="font-black font-pop text-white leading-tight" style={{ fontSize: '4rem', ...headStyle }}>{productName}</p>
            </div>
          )}
        </div>

        {/* 하단: 상품명(이미지 있을 때만) + 가격 */}
        <div className="px-6 pb-5 flex items-end justify-between">
          <div className="flex-1 min-w-0">
            {hasImage && <p className="text-xl font-black text-white truncate" style={subStyle}>{productName}</p>}
            {!hasImage && <p className="text-base font-bold text-white/70" style={subStyle}>{subCopy}</p>}
          </div>
          {!!price && price > 0 && (
            <div className="text-right flex-shrink-0">
              <span className="font-black font-pop text-yellow-300"
                style={{ fontSize: '3.5rem', lineHeight: 1, ...priceStyle }}>
                {price.toLocaleString('ko-KR')}
              </span>
              <span className="text-2xl font-black text-yellow-300" style={priceStyle}>원</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
