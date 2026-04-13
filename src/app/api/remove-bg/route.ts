import { NextRequest } from 'next/server';
import { removeBackground } from '@imgly/background-removal-node';

/** 이미지 배경 제거 API — base64 in, base64 out */
export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();
    if (!imageBase64) return Response.json({ error: 'imageBase64 필요' }, { status: 400 });

    // base64 → Buffer → Blob
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([new Uint8Array(buffer)], { type: 'image/png' });

    // 배경 제거
    const result = await removeBackground(blob, { output: { format: 'image/png' } });
    const resultBuffer = Buffer.from(await result.arrayBuffer());
    const resultBase64 = `data:image/png;base64,${resultBuffer.toString('base64')}`;

    return Response.json({ imageBase64: resultBase64 });
  } catch (e) {
    console.error('[remove-bg] error:', e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
