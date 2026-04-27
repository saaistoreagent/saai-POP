/**
 * OpenAI gpt-image-2 — Gemini 대체 (포스터 한글 직접 렌더)
 * size/quality 인자로 비용 조절. 레퍼런스 이미지 있으면 /v1/images/edits, 없으면 /v1/images/generations.
 */
import { buildPrompt, type GeminiPOPOptions } from './generateGeminiPOP';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export type OpenAIQuality = 'low' | 'medium' | 'high' | 'auto';
export type OpenAISize = '1024x1024' | '1024x1536' | '1536x1024' | 'auto';

export interface OpenAIPOPOptions extends GeminiPOPOptions {
  quality?: OpenAIQuality;
  size?: OpenAISize;
}

function pickSize(options: OpenAIPOPOptions): OpenAISize {
  if (options.size) return options.size;
  const isLandscape = options.direction?.includes('가로') || false;
  return isLandscape ? '1536x1024' : '1024x1536';
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);/)?.[1] || 'image/png';
  const bytes = Buffer.from(b64, 'base64');
  return new Blob([bytes], { type: mime });
}

export async function generateOpenAIPOP(options: OpenAIPOPOptions): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    console.error('[openai] OPENAI_API_KEY missing');
    return null;
  }

  const prompt = buildPrompt(options);
  const quality = options.quality || 'low';
  const size = pickSize(options);

  console.log('[openai] type:', options.popType, 'quality:', quality, 'size:', size, 'product:', options.products[0]?.name);

  const images = options.productImages?.filter(img => img.startsWith('data:')) ||
    (options.productImageBase64?.startsWith('data:') ? [options.productImageBase64] : []);

  try {
    let res: Response;

    if (images.length > 0) {
      // edits 엔드포인트 — multipart/form-data
      const form = new FormData();
      form.append('model', 'gpt-image-2');
      form.append('prompt', prompt);
      form.append('size', size);
      form.append('quality', quality);
      form.append('n', '1');
      for (let i = 0; i < images.length; i++) {
        form.append('image[]', dataUrlToBlob(images[i]), `ref-${i}.png`);
      }
      res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: form,
      });
    } else {
      res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-image-2',
          prompt,
          size,
          quality,
          n: 1,
        }),
      });
    }

    if (!res.ok) {
      const err = await res.text();
      console.error('[openai] error:', res.status, err.slice(0, 500));
      return null;
    }

    const data = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      console.error('[openai] no b64 in response:', JSON.stringify(data).slice(0, 300));
      return null;
    }

    if (data.usage) {
      console.log('[openai] usage:', JSON.stringify(data.usage));
    }

    return `data:image/png;base64,${b64}`;
  } catch (e) {
    console.error('[openai] error:', e);
    return null;
  }
}
