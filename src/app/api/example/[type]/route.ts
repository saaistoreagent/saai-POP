import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { renderBadgeSheet, renderShelfSheet, renderBannerSheet } from '@/lib/renderSimplePOP';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * 첫 화면 카드용 예시 이미지를 생성/캐시하고 PNG로 응답.
 * - badge/shelf/banner: Canvas 즉시 렌더 (0원, ~100ms)
 * - poster: Gemini 한 번만 호출 후 디스크에 영구 저장 (~50원, 한 번만)
 */

const SAMPLE = {
  products: [{ name: '카스 500ml', originalPrice: 3200, price: 2500 }],
  badge: '1+1',
};

const POSTER_PROMPT = `Create a Korean convenience store advertisement poster, 5:7 vertical portrait orientation (taller than wide).

The poster MUST contain these EXACT Korean texts, rendered in PERFECTLY ACCURATE Korean characters:
- Top header (white, very large bold): "오늘의 맥주 행사"
- Yellow badge below header (rounded pill, dark text): "1+1"
- Product name (white, bottom area, medium): "카스 500ml"
- Original price (small, white with red strikethrough line): "3,200원"
- Sale price (huge, golden yellow): "2,500원"

Center: a single Cass beer bottle with cold ice effects on dark navy background.
Background: dramatic ice cubes, cold mist, dark navy (#0F172A) gradient, professional beer advertisement style.
ALL Korean characters MUST be perfectly correct. Print-ready, A4 portrait quality.`;

const examplesDir = path.join(process.cwd(), 'public', 'examples');
function ensureDir() {
  if (!fs.existsSync(examplesDir)) fs.mkdirSync(examplesDir, { recursive: true });
}
function pngResponse(buf: Buffer) {
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ type: string }> }) {
  ensureDir();
  const { type } = await ctx.params;

  // 디스크 캐시 확인
  const cachePath = path.join(examplesDir, `${type}.png`);
  if (fs.existsSync(cachePath)) {
    return pngResponse(fs.readFileSync(cachePath));
  }

  try {
    let buf: Buffer | null = null;

    if (type === 'badge') {
      const dataUrl = renderBadgeSheet(SAMPLE.badge, false);
      buf = dataUrlToBuffer(dataUrl);
    } else if (type === 'shelf') {
      const dataUrl = await renderShelfSheet(SAMPLE.products, SAMPLE.badge, false, '#E91E90');
      buf = dataUrlToBuffer(dataUrl);
    } else if (type === 'banner') {
      const dataUrl = await renderBannerSheet(SAMPLE.products, '', SAMPLE.badge, false, '#00BCD4');
      buf = dataUrlToBuffer(dataUrl);
    } else if (type === 'poster') {
      // Gemini 호출 — 한 번만, 디스크 캐시
      if (!GEMINI_API_KEY) return new Response('no api key', { status: 500 });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: POSTER_PROMPT }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
          }),
        }
      );
      if (!res.ok) return new Response(`gemini ${res.status}`, { status: 500 });
      const result = await res.json();
      for (const part of (result.candidates?.[0]?.content?.parts || [])) {
        if (part.inlineData) {
          buf = Buffer.from(part.inlineData.data, 'base64');
          break;
        }
      }
    }

    if (!buf) return new Response('not found', { status: 404 });
    fs.writeFileSync(cachePath, new Uint8Array(buf));
    return pngResponse(buf);
  } catch (e) {
    console.error('[example] error:', e);
    return new Response('error', { status: 500 });
  }
}
