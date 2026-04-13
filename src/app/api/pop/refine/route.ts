import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * 포스터 채팅 수정 — 이전 이미지 + 자연어 요청을 Gemini image-to-image에 던져 새 이미지 생성.
 * 무료 카테고리(배지/선반/띠지)는 이 라우트를 쓰지 않음.
 */
export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) return Response.json({ error: 'no api key' }, { status: 500 });

  const { previousImage, instruction } = await request.json();
  if (!previousImage || !instruction) {
    return Response.json({ error: 'previousImage와 instruction이 필요해요' }, { status: 400 });
  }

  console.log('[refine] instruction:', instruction);

  // 이전 이미지가 URL이면 fetch해서 base64로 변환, data URL이면 그대로
  let imgBase64: string;
  let mimeType = 'image/png';
  if (previousImage.startsWith('data:')) {
    const [meta, data] = previousImage.split(',');
    mimeType = meta.match(/data:(.*?);/)?.[1] || 'image/png';
    imgBase64 = data;
  } else if (previousImage.startsWith('/')) {
    // public URL
    const filePath = path.join(process.cwd(), 'public', previousImage.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) return Response.json({ error: 'image not found' }, { status: 404 });
    imgBase64 = fs.readFileSync(filePath).toString('base64');
  } else {
    return Response.json({ error: 'invalid previousImage' }, { status: 400 });
  }

  const prompt = `You are editing an existing Korean convenience store POP (Point of Purchase) advertisement image. It could be a poster, badge sheet, shelf price tag sheet, or shelf banner.

The user wants this change applied to the image:
"${instruction}"

CRITICAL RULES:
- Apply the requested change to the previous image, but keep everything else the same.
- If the change involves Korean text, render the Korean characters PERFECTLY and ACCURATELY. No garbled, substituted, or missing characters.
- Preserve the existing layout, aspect ratio, mood, lighting, and product placement unless the user explicitly asks to change them.
- The output should remain suitable for A4 print (keep the same orientation — portrait or landscape — as the input).
- Return ONLY the edited image, no extra text.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: imgBase64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error('[refine] gemini error:', res.status, body.slice(0, 300));
      return Response.json({ error: `gemini ${res.status}` }, { status: 500 });
    }

    const result = await res.json();
    for (const part of (result.candidates?.[0]?.content?.parts || [])) {
      if (part.inlineData) {
        const id = `pop-refined-${Date.now()}`;
        const dir = path.join(process.cwd(), 'public', 'generated');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${id}.png`), Buffer.from(part.inlineData.data, 'base64'));
        return Response.json({
          imageUrl: `/generated/${id}.png`,
          imageBase64: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        });
      }
    }
    return Response.json({ error: 'no image returned' }, { status: 500 });
  } catch (e) {
    console.error('[refine] error:', e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
