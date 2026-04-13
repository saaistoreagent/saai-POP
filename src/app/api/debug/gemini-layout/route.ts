import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Gemini가 띠지/선반 포맷을 세로/가로 + 상품 이미지 포함 여부로 잘 그리는지 테스트.
 * 배지는 Canvas로 가기로 결정돼서 여기선 테스트 안 함.
 *
 * /api/debug/gemini-layout?type=banner|shelf&orientation=세로|가로&image=1|0
 */

// 샘플 상품 (고정)
const SAMPLE_NAME = '카스 500ml';
const SAMPLE_ORIG = '3,200원';
const SAMPLE_SALE = '2,500원';
const BG_COLOR_HEX = '#E91E90';

// 샘플 이미지: public/generated 안에 있는 가장 최근 pop 이미지를 사용
function findSampleImage(): string | null {
  const dir = path.join(process.cwd(), 'public', 'generated');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.startsWith('pop-') && f.endsWith('.png'));
  if (files.length === 0) return null;
  return path.join(dir, files[files.length - 1]);
}

function buildPrompt(type: string, orientation: string, withImage: boolean): string {
  const isLandscape = orientation === '가로';
  const ratio = isLandscape
    ? '7:5 horizontal landscape (wider than tall)'
    : '5:7 vertical portrait (TALLER than wide, like A4 paper standing up)';
  const orientStrict = isLandscape
    ? 'CRITICAL: HORIZONTAL/LANDSCAPE orientation. Width > Height.'
    : 'CRITICAL: VERTICAL/PORTRAIT orientation. Height > Width. Like A4 standing up.';

  const imageInstruction = withImage
    ? `
PRODUCT IMAGE:
You are receiving ONE reference product photo as input.
- Use this EXACT product in every cell — preserve label, branding, color, and packaging.
- Place a small version of the product photo in each cell (left side or appropriate position).
- Do NOT generate generic versions. Use the actual photo.
- The photo should be clearly visible but not dominate the text.
`
    : `
NO PRODUCT IMAGE:
- Text only on colored background. No product photos needed.
`;

  if (type === 'banner') {
    const rows = isLandscape ? 3 : 4;
    return `Create a Korean convenience store SHELF BANNER sheet (띠지) on an A4 page. ${ratio}.
${orientStrict}

This is a sheet that the store owner will print and CUT OUT into individual shelf banners.

LAYOUT (strict):
- Exactly ${rows} horizontal banner strips, stacked vertically, filling the entire page.
- All strips MUST be EQUAL HEIGHT.
- Thin dashed WHITE cut lines between each strip.
- Each strip is a separate independent banner — all strips have the SAME content.
- Solid hot pink (${BG_COLOR_HEX}) background for ALL strips, uniformly.

EACH STRIP CONTENT (same for all ${rows} strips):
- ${withImage ? 'Left: small product photo | Center: ' : 'Left: '}"${SAMPLE_NAME} 캔맥주" in bold white Korean text
- Right side: original price "${SAMPLE_ORIG}" in small white with red strikethrough line, and "${SAMPLE_SALE}" in huge bold golden yellow below it
${imageInstruction}
ABSOLUTE RULES:
- Korean text PERFECTLY ACCURATE, every character exact
- Exactly ${rows} strips, no more no less
- Strips HORIZONTAL (wider than tall)
- Solid ${BG_COLOR_HEX} background on ALL strips (no gradients, no variations between strips)
- No extra text (no store brand, no hours, no tagline)

Output: A4 sheet with ${rows} banner strips ready for printing and cutting.`;
  }

  if (type === 'shelf') {
    const cols = 2;
    const rows = isLandscape ? 3 : 4;
    const total = cols * rows;
    return `Create a Korean convenience store SHELF PRICE TAG sheet (선반 가격표) on an A4 page. ${ratio}.
${orientStrict}

This is a sheet that the store owner will print and CUT OUT into individual price tags.

LAYOUT (strict):
- Exactly ${cols} columns × ${rows} rows = ${total} identical price tag cards.
- All cards MUST be EQUAL SIZE, in a perfect grid.
- Thin dashed WHITE cut lines between cards.
- Each card is a separate independent price tag with the SAME content.
- Solid hot pink (${BG_COLOR_HEX}) background for ALL cards, uniformly.

EACH CARD CONTENT (same for all ${total} cards):
- ${withImage ? 'Top: small product photo | Below: ' : 'Top: '}"${SAMPLE_NAME} 캔맥주" in bold white Korean text
- Middle: original price "${SAMPLE_ORIG}" in small white with red strikethrough line
- Bottom: sale price "${SAMPLE_SALE}" in huge bold golden yellow
${imageInstruction}
ABSOLUTE RULES:
- Korean text PERFECTLY ACCURATE
- Exactly ${total} cards in a ${cols}×${rows} grid
- All cards same size, same content
- Solid ${BG_COLOR_HEX} background on ALL cards
- No extra text

Output: A4 sheet with ${total} price tag cards ready for printing and cutting.`;
  }

  return '';
}

export async function GET(request: NextRequest) {
  if (!GEMINI_API_KEY) return new Response('no api key', { status: 500 });

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'banner';
  const orientation = url.searchParams.get('orientation') || '세로';
  const withImage = url.searchParams.get('image') === '1';

  if (type !== 'banner' && type !== 'shelf') {
    return new Response('type must be banner or shelf (badge는 Canvas로 가기로 함)', { status: 400 });
  }

  const prompt = buildPrompt(type, orientation, withImage);
  if (!prompt) return new Response('invalid params', { status: 400 });

  console.log(`[debug-layout] type=${type}, orientation=${orientation}, image=${withImage}`);

  try {
    const parts: Array<Record<string, unknown>> = [];

    // 이미지 첨부 옵션
    if (withImage) {
      const sampleImagePath = findSampleImage();
      if (sampleImagePath) {
        const buf = fs.readFileSync(sampleImagePath);
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: buf.toString('base64'),
          },
        });
      }
    }
    parts.push({ text: prompt });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      return new Response(`gemini error ${res.status}: ${body.slice(0, 300)}`, { status: 500 });
    }

    const result = await res.json();
    for (const part of (result.candidates?.[0]?.content?.parts || [])) {
      if (part.inlineData) {
        const id = `layout-${type}-${orientation}-${withImage ? 'img' : 'noimg'}-${Date.now()}`;
        const dir = path.join(process.cwd(), 'public', 'generated');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${id}.png`), Buffer.from(part.inlineData.data, 'base64'));
        const imageUrl = `/generated/${id}.png`;

        const navLinks = ['banner', 'shelf'].flatMap(t =>
          ['세로', '가로'].flatMap(o =>
            ['0', '1'].map(img => {
              const active = t === type && o === orientation && img === (withImage ? '1' : '0') ? 'active' : '';
              const label = `${t === 'banner' ? '띠지' : '선반'} ${o}${img === '1' ? ' + 이미지' : ''}`;
              return `<a class="${active}" href="?type=${t}&orientation=${o}&image=${img}">${label}</a>`;
            })
          )
        ).join('');

        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Gemini Layout Test</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 900px; margin: 30px auto; padding: 20px; background: #f5f5f5; }
  h1 { font-size: 18px; margin-bottom: 8px; }
  .nav { margin-bottom: 16px; }
  .nav a { display: inline-block; padding: 7px 12px; background: #fff; border: 1px solid #ddd; color: #333; border-radius: 8px; text-decoration: none; margin-right: 6px; margin-bottom: 6px; font-size: 12px; }
  .nav a.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
  .meta { background: #fff; padding: 14px; border-radius: 10px; margin: 16px 0; font-size: 12px; }
  pre { background: #f0f0f0; padding: 10px; border-radius: 6px; font-size: 11px; max-height: 220px; overflow-y: auto; white-space: pre-wrap; }
  img.result { max-width: 100%; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); display: block; margin: 0 auto; }
  .check { background: #fef3c7; padding: 12px; border-radius: 8px; font-size: 13px; margin: 12px 0; }
  .settings { background: #dbeafe; padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-bottom: 12px; }
</style></head>
<body>
  <h1>Gemini 레이아웃 테스트 — ${type === 'banner' ? '띠지' : '선반'} / ${orientation}${withImage ? ' / 이미지 포함' : ''}</h1>
  <div class="settings">
    <strong>배경색 고정:</strong> ${BG_COLOR_HEX} (hot pink) |
    <strong>상품:</strong> ${SAMPLE_NAME} |
    <strong>정상가:</strong> ${SAMPLE_ORIG} |
    <strong>할인가:</strong> ${SAMPLE_SALE}
  </div>
  <div class="nav">${navLinks}</div>
  <div class="check">
    <strong>확인 포인트:</strong>
    <ul>
      <li>줄/카드 개수 정확한가?</li>
      <li>세로/가로 방향 맞는가?</li>
      <li>모든 칸 크기 균일한가?</li>
      <li>절취선이 있는가?</li>
      <li>한글이 정확하고 모든 칸에 동일한가?</li>
      <li>배경색이 ${BG_COLOR_HEX} 핑크로 통일됐는가?</li>
      ${withImage ? '<li><strong>상품 이미지가 각 칸에 잘 들어갔는가?</strong></li>' : ''}
    </ul>
  </div>
  <img class="result" src="${imageUrl}" alt="layout test" />
  <div class="meta" style="margin-top: 16px;">
    <strong>프롬프트:</strong>
    <pre>${prompt.replace(/</g, '&lt;')}</pre>
  </div>
</body></html>`;
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    }
    return new Response('no image in gemini response', { status: 500 });
  } catch (e) {
    return new Response(`error: ${e}`, { status: 500 });
  }
}
