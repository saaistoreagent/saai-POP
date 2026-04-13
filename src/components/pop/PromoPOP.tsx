'use client';

import { POPGeneratedData } from '@/types/pop';
import { BgTheme } from '@/lib/bgThemes';
import { LayoutId } from '@/lib/layouts';
import BgLayer from './BgLayer';
import { FancyBg } from './Decorations';

interface PromoPOPProps {
  productName: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  eventPeriod?: string;
  productImageUrl?: string;
  catchphrase: string;
  subCopy: string;
  color: POPGeneratedData['color'];
  badgeText?: string;
  bgTheme?: BgTheme;
  bgImage?: string;
  fullImage?: boolean;
  layout?: LayoutId;
}

/** 캐치프레이즈에서 상품명 키워드 제거 */
function cleanCatch(text: string, name: string): string {
  const kws = name.split(/[\s,]+/).filter(w => w.length >= 2);
  let c = text;
  if (kws.filter(k => c.includes(k)).length >= 2) {
    for (const k of kws) c = c.replace(k, '').trim();
    c = c.replace(/^[\s,!·]+/, '').replace(/[\s,]+$/, '').replace(/\s{2,}/g, ' ');
  }
  return c.length >= 3 ? c : text;
}

/** 배지 유형별 색상 */
function getBadgeColors(type: string): { bg: string; border: string } {
  switch (type) {
    case '1+1': return { bg: '#E91E90', border: '#FF69B4' };
    case '2+1': return { bg: '#FF6B00', border: '#FFB366' };
    case '3+1': return { bg: '#00BCD4', border: '#4DD0E1' };
    case '덤증정': return { bg: '#FF4444', border: '#FF8888' };
    default: return { bg: '#FFD700', border: '#FFE44D' };
  }
}

export default function PromoPOP({
  productName, price, originalPrice, discountPercent, eventPeriod, productImageUrl,
  catchphrase: raw, subCopy, color, badgeText, bgTheme, bgImage, fullImage,
}: PromoPOPProps) {
  const badgeType = badgeText || '없음';
  const hasBadge = badgeType !== '없음';
  const hasImage = !!productImageUrl;
  const catchphrase = cleanCatch(raw, productName);
  const badge = getBadgeColors(badgeType);

  // fullImage 모드: AI가 만든 완성본 그대로 표시
  if (fullImage && bgImage) {
    return (
      <div className="w-full h-full overflow-hidden relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bgImage} alt={productName} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden relative" style={{ backgroundColor: '#0f172a' }}>
      {/* 배경 */}
      {bgImage ? <BgLayer image={bgImage} /> : <FancyBg primary={color.primary} accent={color.accent} style="wave" />}
      {/* 오버레이 */}
      <div className="absolute inset-0 z-[1]"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.05) 65%, rgba(0,0,0,0.55) 100%)' }} />

      <div className="relative z-10 w-full h-full flex flex-col">

        {/* ====== 상단: 캐치프레이즈 ====== */}
        <div className="px-6 pt-5 pb-1 text-center">
          <h1 className="font-pop font-black text-white leading-none"
            style={{
              fontSize: '3rem',
              textShadow: '0 0 20px rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.9)',
              WebkitTextStroke: '2px rgba(0,0,0,0.5)',
              paintOrder: 'stroke fill',
            }}>
            {catchphrase}
          </h1>
        </div>

        {/* ====== 중앙: 이미지 + 정보 (좌우 배치) ====== */}
        <div className="flex-1 flex items-stretch px-4 py-2 gap-2">

          {/* 좌: 상품 이미지 (50%) + 배지 겹침 */}
          <div className="w-[50%] flex items-center justify-center flex-shrink-0 relative">
            {/* 배지 — 이미지 좌상단에 겹치게, 3D 효과 */}
            {hasBadge && (
              <div className="absolute top-1 left-0 z-20">
                <div className="relative">
                  {/* 그림자 레이어 */}
                  <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-xl"
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} />
                  <div className="relative px-5 py-2 rounded-xl"
                    style={{
                      backgroundColor: badge.bg,
                      border: `3px solid ${badge.border}`,
                      boxShadow: `0 0 25px ${badge.bg}88, inset 0 1px 0 rgba(255,255,255,0.3)`,
                    }}>
                    <span className="font-badge font-black text-white leading-none block"
                      style={{
                        fontSize: '3.5rem',
                        textShadow: `3px 3px 0 rgba(0,0,0,0.4), 0 0 15px ${badge.bg}`,
                        WebkitTextStroke: '1.5px rgba(0,0,0,0.3)',
                        paintOrder: 'stroke fill',
                        letterSpacing: '-0.02em',
                      }}>
                      {badgeType}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={productImageUrl} alt={productName}
                className="max-h-[95%] max-w-[95%] object-contain relative z-10"
                style={{ filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.6))' }} />
            ) : (
              <p className="font-pop font-black text-white text-center leading-tight px-4"
                style={{
                  fontSize: '3rem',
                  textShadow: '0 4px 12px rgba(0,0,0,0.8)',
                  WebkitTextStroke: '2px rgba(0,0,0,0.5)',
                  paintOrder: 'stroke fill',
                }}>
                {productName}
              </p>
            )}
          </div>

          {/* 우: 상품정보 + 가격 */}
          <div className="flex-1 flex flex-col justify-center py-2">
            {/* 상품명 */}
            <p className="font-pop font-black text-white leading-tight"
              style={{
                fontSize: '1.7rem',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                WebkitTextStroke: '1.5px rgba(0,0,0,0.4)',
                paintOrder: 'stroke fill',
              }}>
              {productName}
            </p>

            {/* subCopy */}
            <p className="text-sm font-bold mt-1 mb-2"
              style={{ color: '#FFE066', textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}>
              {subCopy}
            </p>

            {/* 정상가 → 초특가 */}
            {!!originalPrice && originalPrice > price && (
              <div className="mb-1">
                <span className="text-base text-white/50 line-through font-bold"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  정상가 {originalPrice.toLocaleString('ko-KR')}원
                </span>
                <span className="ml-2 text-base font-black"
                  style={{ color: '#FF4444', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  ↓
                </span>
              </div>
            )}

            {/* 할인율 */}
            {!!discountPercent && discountPercent > 0 && (
              <span className="inline-block self-start px-3 py-1 rounded-lg font-badge font-black text-white text-xl mb-1"
                style={{ backgroundColor: '#FF4444', boxShadow: '0 2px 8px rgba(255,68,68,0.5)' }}>
                {discountPercent}%
              </span>
            )}

            {/* ★ 가격 ★ */}
            <div className="mt-auto">
              {!!originalPrice && originalPrice > price && (
                <p className="font-pop font-black text-lg mb-0.5"
                  style={{ color: '#FF6B6B', textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}>
                  초특가
                </p>
              )}
              <div className="flex items-baseline">
                <span className="font-price font-black text-yellow-300 leading-none"
                  style={{
                    fontSize: '5rem',
                    textShadow: '0 0 20px rgba(255,215,0,0.4), 3px 3px 0 rgba(0,0,0,0.5), 0 4px 15px rgba(0,0,0,0.8)',
                    WebkitTextStroke: '2px rgba(0,0,0,0.6)',
                    paintOrder: 'stroke fill',
                  }}>
                  {price.toLocaleString('ko-KR')}
                </span>
                <span className="font-price font-black text-yellow-300 text-2xl ml-0.5"
                  style={{
                    textShadow: '2px 2px 0 rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.7)',
                    WebkitTextStroke: '1px rgba(0,0,0,0.4)',
                    paintOrder: 'stroke fill',
                  }}>
                  원
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ====== 하단: 안내 바 (이벤트 기간 있을 때만) ====== */}
        {eventPeriod && (
          <div className="px-5 pb-4">
            <div className="py-2.5 rounded-xl text-center"
              style={{ backgroundColor: badge.bg, boxShadow: `0 0 20px ${badge.bg}66` }}>
              <p className="font-pop text-base font-black text-white"
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>
                {eventPeriod}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
