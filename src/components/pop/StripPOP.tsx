'use client';

import { POPGeneratedData } from '@/types/pop';
import { BgTheme } from '@/lib/bgThemes';
import BgLayer from './BgLayer';

interface StripPOPProps {
  productName: string;
  price: number;
  originalPrice?: number;
  productImageUrl?: string;
  color: POPGeneratedData['color'];
  badgeText?: string;
  catchphrase?: string;
  bgTheme?: BgTheme;
  bgImage?: string;
}

export default function StripPOP({
  productName, price, originalPrice, productImageUrl, color, badgeText, catchphrase, bgTheme, bgImage,
}: StripPOPProps) {
  const hasBadge = badgeText && badgeText !== '없음';

  return (
    <div className="w-full h-full overflow-hidden relative" style={{ backgroundColor: color.primary }}>
      {/* 좁은 띠형에는 bgImage 사용 안 함 — CSS 테마만 */}
      <BgLayer theme={bgTheme} />

      <div className="relative z-10 w-full h-full flex items-center">
        {/* 배지 */}
        {hasBadge && (
          <div className="flex-shrink-0 h-full flex items-center justify-center px-6"
            style={{ backgroundColor: `${color.accent}DD` }}>
            <span className="font-black font-pop text-white leading-none"
              style={{
                fontSize: '2.5rem',
                textShadow: '2px 2px 4px rgba(0,0,0,0.4)',
                WebkitTextStroke: '1px rgba(0,0,0,0.4)',
              }}>
              {badgeText}
            </span>
          </div>
        )}

        {/* 상품 이미지 */}
        {productImageUrl && (
          <div className="flex-shrink-0 w-32 h-full flex items-center justify-center px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={productImageUrl} alt={productName}
              className="max-h-[85%] max-w-full object-contain drop-shadow-lg" />
          </div>
        )}

        {/* 문구 + 상품명 */}
        <div className="flex-1 px-4 min-w-0">
          <p className="text-2xl font-black font-pop text-white truncate leading-tight"
            style={{
              textShadow: '2px 2px 6px rgba(0,0,0,0.5)',
              WebkitTextStroke: '1.5px rgba(0,0,0,0.6)',
            }}>
            {catchphrase || productName}
          </p>
          {catchphrase && (
            <p className="text-base text-white/80 truncate font-bold mt-0.5"
              style={{
                textShadow: '1px 1px 3px rgba(0,0,0,0.4)',
                WebkitTextStroke: '0.5px rgba(0,0,0,0.3)',
              }}>
              {productName}
            </p>
          )}
        </div>

        {/* 가격 */}
        <div className="flex-shrink-0 pr-6 text-right">
          {originalPrice && originalPrice > price && (
            <span className="text-xs text-white/50 line-through font-bold block"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              {originalPrice.toLocaleString('ko-KR')}원
            </span>
          )}
          <div className="flex items-baseline gap-0.5">
            <span className="font-black font-pop text-yellow-300 leading-none"
              style={{
                fontSize: '3rem',
                textShadow: '2px 2px 6px rgba(0,0,0,0.5)',
                WebkitTextStroke: '1.5px rgba(0,0,0,0.6)',
              }}>
              {price.toLocaleString('ko-KR')}
            </span>
            <span className="text-base font-black text-yellow-300"
              style={{
                textShadow: '1px 1px 3px rgba(0,0,0,0.4)',
                WebkitTextStroke: '0.5px rgba(0,0,0,0.4)',
              }}>
              원
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
