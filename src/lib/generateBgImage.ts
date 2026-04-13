/**
 * POP 이미지 생성 파이프라인
 * 1단계: Canvas로 러프 합성본 (상품+텍스트+배지)
 * 2단계: FLUX img2img로 광고 포스터 스타일 보정
 */

import { composePOPImage } from './composePOP';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

interface GeneratePOPImageOptions {
  bgPrompt: string;
  productName: string;
  price: number;
  catchphrase: string;
  subCopy: string;
  badgeType?: string;
  productImageUrl?: string | null;
  bgColor: string;
  accentColor: string;
}

export async function generatePOPImage(options: GeneratePOPImageOptions): Promise<string | null> {
  if (!REPLICATE_API_TOKEN) return null;

  try {
    // 1단계: Canvas로 러프 합성본 생성 (794x1123, A4 비율)
    console.log('[pop-img] 1단계: Canvas 합성본 생성...');
    const compositeBuffer = await composePOPImage({
      width: 794,
      height: 1123,
      productName: options.productName,
      price: options.price,
      catchphrase: options.catchphrase,
      subCopy: options.subCopy,
      badgeType: options.badgeType,
      productImageUrl: options.productImageUrl,
      bgColor: options.bgColor,
      accentColor: options.accentColor,
    });

    const compositeBase64 = `data:image/png;base64,${compositeBuffer.toString('base64')}`;
    console.log('[pop-img] 합성본 크기:', compositeBuffer.length, 'bytes');

    // 2단계: FLUX img2img로 스타일 보정
    console.log('[pop-img] 2단계: FLUX img2img 스타일 보정...');
    const fluxPrompt = `${options.bgPrompt}, professional Korean convenience store sale advertisement poster, GS25 CU style POP design, bold vivid colors, dynamic visual effects around product, eye-catching retail promotion material, high quality print ready, clean product showcase with dramatic lighting`;

    const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt: fluxPrompt,
          image: compositeBase64,
          prompt_strength: 0.25,  // 매우 낮게: 원본 레이아웃+텍스트 최대한 유지, 스타일만 살짝 보정
          num_outputs: 1,
          aspect_ratio: '3:4',
          output_format: 'png',
        },
      }),
    });

    if (createRes.ok) {
      const result = await createRes.json();
      console.log('[pop-img] FLUX output type:', typeof result.output, Array.isArray(result.output) ? 'array' : '');
      const imageUrl = Array.isArray(result.output) ? result.output[0] : (typeof result.output === 'string' ? result.output : null);
      if (imageUrl && imageUrl.startsWith('http')) {
        console.log('[pop-img] FLUX img2img 성공! URL:', imageUrl.slice(0, 80));
        const imgRes = await fetch(imageUrl);
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
        }
      }
    }

    // img2img 실패 시 → Canvas 합성본 그대로 반환 (스타일 보정 없이)
    console.log('[pop-img] FLUX 실패, Canvas 합성본 반환');
    return compositeBase64;
  } catch (e) {
    console.error('[pop-img] error:', e);
    return null;
  }
}

// 기존 호환: bgPrompt만으로 배경 생성 (txt2img, strip/price 등 작은 POP용)
export async function generateBgImage(bgPrompt: string, productImageUrl?: string | null): Promise<string | null> {
  if (!REPLICATE_API_TOKEN || !bgPrompt) return null;

  const prompt = `${bgPrompt}, radiating energy from center, empty center area, no text, no letters, vivid saturated colors, professional advertisement background`;

  try {
    const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: { prompt, num_outputs: 1, aspect_ratio: '3:4', output_format: 'png' },
      }),
    });

    if (!createRes.ok) return null;
    const result = await createRes.json();
    const imageUrl = result.output?.[0];
    if (!imageUrl) return null;

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buffer = await imgRes.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
  } catch {
    return null;
  }
}
