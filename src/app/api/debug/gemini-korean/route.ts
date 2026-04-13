import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Gemini-3.1-flash-image-preview가 한글 텍스트를 정확히 그릴 수 있는지 직접 테스트.
 * 브라우저에서 GET /api/debug/gemini-korean?test=1 형태로 호출.
 *
 * test=1: 짧은 한글 한 줄
 * test=2: 캐치프레이즈 + 상품명 + 가격
 * test=3: 다중 텍스트 (배지 + 캐치 + 가격)
 * test=4: 직접 프롬프트 (?prompt= 로 전달)
 */

const TEST_PROMPTS: Record<string, string> = {
  '1': `Create a Korean convenience store advertisement poster, 5:7 vertical portrait.
The poster MUST contain this Korean text written in large, bold, accurate Korean characters at the top:

"맥주 4캔 1만원!"

Background: dark navy with cold ice effects, beer bottles arranged at the center.
The Korean text must be PERFECTLY rendered, every character must be exactly correct.
Korean text color: bright yellow (#FFD700).
Print quality, professional advertisement.`,

  '2': `Create a Korean convenience store advertisement poster, 5:7 vertical portrait.

The poster MUST contain these Korean texts, all rendered in PERFECT, ACCURATE Korean characters:

Title (top, large white text): "골라담는 4캔 1만원"
Product name (bottom-left, white): "카스 500ml"
Price (bottom-right, large yellow): "2,500원"

Background: dark navy with ice effects, a single Cass beer bottle at the center.
Every Korean character must be EXACTLY correct, no garbled or substituted characters.
Print quality, A4 portrait.`,

  '3': `Create a Korean convenience store sale poster, 5:7 vertical portrait.

Required Korean texts (must all be PERFECTLY accurate):
- Header (white, very large): "역대급 맥주 행사"
- Yellow badge (top-right, pill shape, dark text): "1+1"
- Product name (white, medium): "테라 500ml"
- Original price (small, white, strikethrough): "3,000원"
- Sale price (yellow, huge): "1,500원"

Center: a single Terra beer bottle with cold ice effects on dark background.
EVERY Korean character must be exactly correct. No errors. No garbled text. No substitution with similar-looking characters.
Print-ready, professional quality.`,
};

export async function GET(request: NextRequest) {
  if (!GEMINI_API_KEY) return Response.json({ error: 'no api key' }, { status: 500 });

  const url = new URL(request.url);
  const testId = url.searchParams.get('test') || '1';
  const customPrompt = url.searchParams.get('prompt');

  const prompt = customPrompt || TEST_PROMPTS[testId];
  if (!prompt) return Response.json({ error: 'invalid test id' }, { status: 400 });

  console.log(`[debug] Gemini 한글 테스트 #${testId}`);
  console.log(`[debug] prompt:\n${prompt}\n`);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[debug] gemini ${res.status}:`, body.slice(0, 500));
      return Response.json({ error: `gemini ${res.status}`, body: body.slice(0, 500) }, { status: 500 });
    }

    const result = await res.json();
    for (const part of (result.candidates?.[0]?.content?.parts || [])) {
      if (part.inlineData) {
        const id = `gemini-korean-test-${testId}-${Date.now()}`;
        const dir = path.join(process.cwd(), 'public', 'generated');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, `${id}.png`);
        fs.writeFileSync(filePath, Buffer.from(part.inlineData.data, 'base64'));
        const imageUrl = `/generated/${id}.png`;
        console.log(`[debug] saved: ${imageUrl}`);

        // 브라우저에서 보기 좋게 HTML로 응답
        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Gemini Korean Test #${testId}</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
  h1 { font-size: 18px; }
  .meta { background: #fff; padding: 16px; border-radius: 12px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
  pre { background: #f0f0f0; padding: 12px; border-radius: 8px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; }
  img { width: 100%; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
  .nav a { display: inline-block; padding: 8px 14px; background: #3b82f6; color: white; border-radius: 8px; text-decoration: none; margin-right: 8px; font-size: 13px; }
  .check { background: #fef3c7; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 13px; }
</style></head>
<body>
  <h1>Gemini 한글 렌더링 테스트 #${testId}</h1>
  <div class="nav">
    <a href="?test=1">테스트 1 (한 줄)</a>
    <a href="?test=2">테스트 2 (3개 텍스트)</a>
    <a href="?test=3">테스트 3 (5개 텍스트 + 배지)</a>
  </div>
  <div class="meta">
    <strong>요청 프롬프트:</strong>
    <pre>${prompt.replace(/</g, '&lt;')}</pre>
  </div>
  <div class="check">
    <strong>확인 포인트:</strong>
    <ul>
      <li>요청한 한글이 정확하게 박혔는지</li>
      <li>글자가 깨지거나 다른 글자로 바뀌었는지</li>
      <li>한자/일본 가나/이상한 기호가 섞였는지</li>
      <li>띄어쓰기·받침이 맞는지</li>
    </ul>
  </div>
  <img src="${imageUrl}" alt="Gemini result" />
</body></html>`;
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    }
    return Response.json({ error: 'no image in response', raw: result }, { status: 500 });
  } catch (e) {
    console.error('[debug] error:', e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
