'use client';

import { POPGeneratedData } from '@/types/pop';
import { BgTheme } from '@/lib/bgThemes';
import BgLayer from './BgLayer';

interface PricePOPProps {
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
}

export default function PricePOP({
  productName, price, originalPrice, eventPeriod, productImageUrl, color, badgeText, bgTheme, bgImage,
}: PricePOPProps) {
  const hasBadge = badgeText && badgeText !== '없음';

  return (
    <div className="w-full h-full overflow-hidden relative" style={{ backgroundColor: color.primary }}>
      {/* 좁은 띠형에는 bgImage 사용 안 함 — CSS 테마만 */}
      <BgLayer theme={bgTheme} />

      <div className="relative z-10 w-full h-full flex items-center">
        {/* 상품 이미지 */}
        <div className="flex-shrink-0 w-[120px] h-full flex items-center justify-center px-2">
          {productImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={productImageUrl} alt={productName}
              className="max-h-[90%] max-w-full object-contain drop-shadow-lg" />
          ) : (
            <div className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${color.accent}44` }}>
              <p className="text-[10px] font-black text-white text-center leading-tight px-1"
                style={{ WebkitTextStroke: '0.3px rgba(0,0,0,0.3)' }}>
                {productName}
              </p>
            </div>
          )}
        </div>

        {/* 상품명 */}
        <div className="flex-shrink-0 w-[180px] px-2">
          <p className="text-lg font-black text-white leading-tight line-clamp-2"
            style={{
              textShadow: '1px 1px 4px rgba(0,0,0,0.5)',
              WebkitTextStroke: '0.8px rgba(0,0,0,0.4)',
            }}>
            {productName}
          </p>
          {eventPeriod && (
            <p className="text-[10px] text-white/70 font-bold mt-0.5"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}>
              {eventPeriod}
            </p>
          )}
        </div>

        {/* 배지 */}
        {hasBadge && (
          <div className="flex-shrink-0 mx-2">
            <div className="rounded-xl px-5 py-2 flex items-center justify-center"
              style={{ backgroundColor: color.accent, boxShadow: '0 3px 10px rgba(0,0,0,0.3)' }}>
              <span className="font-price font-black text-white leading-none"
                style={{
                  fontSize: '2.8rem',
                  textShadow: '2px 2px 0 rgba(0,0,0,0.3)',
                  WebkitTextStroke: '1.5px rgba(0,0,0,0.4)',
                }}>
                {badgeText}
              </span>
            </div>
          </div>
        )}

        {/* 가격 — 오른쪽 끝, 크게 */}
        <div className="flex-1 flex flex-col items-end justify-center pr-4">
          {originalPrice && originalPrice > price && (
            <span className="text-sm text-white/50 line-through font-bold"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              {originalPrice.toLocaleString('ko-KR')}원
            </span>
          )}
          <div className="flex items-baseline gap-0.5">
            <span className="font-black font-price text-yellow-300 leading-none"
              style={{
                fontSize: '3.5rem',
                textShadow: '2px 2px 6px rgba(0,0,0,0.5)',
                WebkitTextStroke: '1.5px rgba(0,0,0,0.6)',
              }}>
              {price.toLocaleString('ko-KR')}
            </span>
            <span className="text-xl font-black font-price text-yellow-300"
              style={{
                textShadow: '1px 1px 4px rgba(0,0,0,0.4)',
                WebkitTextStroke: '1px rgba(0,0,0,0.4)',
              }}>
              원
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
