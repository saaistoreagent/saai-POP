'use client';

import { BgTheme } from '@/lib/bgThemes';

/**
 * POP 배경 레이어
 * AI 생성 이미지 우선 → CSS 테마 fallback
 */
export default function BgLayer({ theme, image }: { theme?: BgTheme; image?: string }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }} />
    );
  }

  if (theme && theme.id !== 'none' && theme.background) {
    return <div className="absolute inset-0" style={{ background: theme.background, zIndex: 0 }} />;
  }

  return null;
}
