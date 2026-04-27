/**
 * Gemini 2.5 Flash — 배경+상품 이미지만 생성 (텍스트 없이)
 * Canvas가 한글 텍스트를 정확하게 덮어씀
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface ProductInfo {
  name: string;
  originalPrice?: number | null;
  price?: number | null;
  badge?: string | null;
}

export interface GeminiPOPOptions {
  popType: 'poster' | 'badge' | 'shelf' | 'banner';
  products: ProductInfo[];
  badgeType?: string;
  direction?: string;
  catchphrase?: string;
  bgColor?: string;
  productImageBase64?: string | null;
  productImages?: string[]; // 여러 장
  /** 한글 텍스트를 Gemini가 직접 그리도록 — Canvas overlay 안 씀 */
  embedKoreanText?: boolean;
}

export function buildPrompt(options: GeminiPOPOptions): string {
  const { popType, products, badgeType, direction, productImageBase64, productImages, embedKoreanText, catchphrase, bgColor } = options;
  const main = products[0];
  const isLandscape = direction?.includes('가로') || false;
  // A4 비율: portrait는 ~0.707 (5:7), landscape는 ~1.414 (7:5)
  const ratio = isLandscape ? '7:5 horizontal landscape (wider than tall)' : '5:7 vertical portrait (TALLER than wide, like a phone screen or A4 paper standing up)';
  const orientationStrict = isLandscape
    ? 'CRITICAL: The image MUST be HORIZONTAL/LANDSCAPE orientation. Width MUST be LARGER than height.'
    : 'CRITICAL: The image MUST be VERTICAL/PORTRAIT orientation. HEIGHT MUST BE LARGER THAN WIDTH. Like an A4 paper standing up. NOT square. NOT landscape.';
  const uploadedCount = productImages?.filter(img => img.startsWith('data:')).length || (productImageBase64 ? 1 : 0);

  switch (popType) {
    case 'poster': {
      const productList = products.filter(p => p.name).map(p => p.name).join(', ');
      const validProds = products.filter(p => p.name);
      const prodBadges = validProds.filter(p => p.badge && p.badge.trim());

      const mainTextLine = catchphrase
        ? `Main headline (large, bold, white, on a calm/dark area — top or center): "${catchphrase}"`
        : '(no headline)';
      const perProductBadgeLine = prodBadges.length > 0
        ? `Per-product small highlight badges (render each badge as a small pill/tag near its matching product — bright yellow or red background, dark text, clearly smaller than the main headline):\n${prodBadges.map(p => `  - Next to "${p.name}": "${p.badge}"`).join('\n')}`
        : '';

      const textLine = [mainTextLine, perProductBadgeLine].filter(Boolean).join('\n');

      const productLine = validProds.length === 1
        ? `Show "${main.name}" as the main subject. Position and scale: you decide what looks best for an advertisement — it can be center, bottom, side, on a surface, etc. Just balance with the text area.`
        : `Show all ${validProds.length} products together as ONE cohesive scene (shared lighting/background, NOT a grid or split panels). Arrange them naturally — gathered, overlapping, or grouped.`;

      return `Create a Korean convenience store advertisement poster. ${ratio} format.
${orientationStrict}

═══ ABSOLUTE RULES ═══

1. **ONLY render the Korean text I provide below. Do NOT add any other Korean text.**
   - No invented prices, product names, store brands (7-ELEVEN/GS25/CU/이마트24), addresses, phone numbers, hours, taglines, or fine print.
   - Product packaging may show its own natural brand/name text (it's part of the product photo, not poster text) — that's fine.
   - If no text is provided below, generate the image with NO Korean text at all.

2. Every Korean character in the image must match the provided text EXACTLY, character-for-character.

═══ KOREAN TEXT TO RENDER ═══
${textLine}

Use a strong bold Korean display font (Black Han Sans, Jalnan, Gmarket Sans, Do Hyeon style — thick, advertisement-style).

═══ PRODUCTS ═══
${productLine}
${uploadedCount > 0
  ? `You are receiving ${uploadedCount} reference photo(s). Use them as the actual product(s) — preserve label, branding, color, packaging EXACTLY. Do NOT generate generic versions.`
  : `Generate realistic photos of: ${productList}.`}

═══ STYLE ═══
${direction
  ? `Follow this user-provided mood/style direction strictly: "${direction}"`
  : `Clean background that matches the products. Professional advertising quality.`}
Print-ready A4 quality. Ensure good contrast where text sits so Korean is clearly readable.

═══ REMINDER ═══
- Korean text: only the exact string above. Every character exact. No extras.`;
    }

    case 'badge':
      return `Create a grid of colored rectangles on white background.
${isLandscape ? '5 columns x 3 rows = 15' : '4 columns x 5 rows = 20'} identical rectangles.
Each rectangle: ${badgeType === '1+1' ? 'hot pink (#E91E90)' : badgeType === '2+1' ? 'green (#4CAF50)' : badgeType === '3+1' ? 'cyan (#00BCD4)' : 'red (#DC2626)'} solid color.
With "${badgeType || '1+1'}" written in large bold white text in each.
Thin gray dotted lines between rectangles (cut guides).
A4 ${ratio} page. Clean, simple, print-ready.`;

    case 'shelf': {
      if (embedKoreanText) {
        const cols = 2;
        const rows = isLandscape ? 3 : 4;
        const total = cols * rows;
        const bg = bgColor || '#E91E90';
        const validProds = products.filter(p => p.name);
        const usingPhotos = uploadedCount > 0;

        // 상품 1개 → 모든 카드가 같음. 여러 개 → 카드마다 다름.
        const cellContent = validProds.length === 1 || validProds.length > total
          ? `All ${total} cards show the SAME product: "${main.name}".
Each card content:
${usingPhotos ? '- Small product photo on top (from the provided reference)' : ''}
- Product name "${main.name}" in bold white Korean (medium size)
${main.originalPrice && main.price && main.originalPrice > main.price ? `- Original price "${main.originalPrice.toLocaleString('ko-KR')}원" in small white with red strikethrough` : ''}
${main.price ? `- Sale price "${main.price.toLocaleString('ko-KR')}원" in huge bold golden yellow (#FFD700)` : ''}`
          : `Each card shows a DIFFERENT product from this list (in order, filling ${total} cards — repeat if fewer products than cards):
${validProds.map((p, i) => {
  const parts = [`Card ${i + 1}: "${p.name}"`];
  if (p.originalPrice && p.price && p.originalPrice > p.price) parts.push(`original "${p.originalPrice.toLocaleString('ko-KR')}원" (strikethrough)`);
  if (p.price) parts.push(`sale "${p.price.toLocaleString('ko-KR')}원"`);
  return `  - ${parts.join(', ')}`;
}).join('\n')}`;

        return `Create a Korean convenience store SHELF PRICE TAG sheet (선반 가격표) on an A4 page. ${ratio}.
${orientationStrict}

This is a sheet to be printed and cut into individual price tags.

═══ LAYOUT (STRICT) ═══
- EXACTLY ${cols} columns × ${rows} rows = ${total} cards, filling the full page
- All cards EQUAL SIZE in a perfect grid
- Thin dashed WHITE cut lines between cards (vertical and horizontal)
- Solid background color ${bg} on ALL cards uniformly

═══ CARD CONTENT ═══
${cellContent}

${usingPhotos
  ? `═══ PRODUCT PHOTO ═══
You are receiving ${uploadedCount} reference product photo(s).
Use the photo(s) as the actual product(s) — preserve label, branding, packaging EXACTLY.
Place a small version of the photo in each card (top area), keeping the card layout clean.`
  : ''}

${direction ? `═══ VISUAL MOOD ═══\nApply this visual atmosphere to the whole sheet: "${direction}"\nYou can add subtle background effects/textures to enhance the mood, but cards must remain readable.` : ''}

═══ ABSOLUTE RULES ═══
- Korean text PERFECTLY ACCURATE, every character exact
- EXACTLY ${total} cards, no more no less
- Do NOT add any text I did not specify (no store brand, no hours, no taglines, no invented prices)
- Do NOT invent products or change the ones I listed
- Each card must be clearly separated by cut lines
- Print-ready quality, A4 sheet`;
      }

      return `Create a sheet of small product cards on white background.
${isLandscape ? '3x2 grid = 6 cards' : '2x4 grid = 8 cards'}. Thin dotted cut lines between cards.
Each card shows: ${main.name} product image on the left half, empty dark space on the right half.
NO TEXT. Product images only. A4 ${ratio}. Clean layout.`;
    }

    case 'banner': {
      if (embedKoreanText) {
        const rows = isLandscape ? 3 : 4;
        const bg = bgColor || '#E91E90';
        const validProds = products.filter(p => p.name);
        const usingPhotos = uploadedCount > 0;

        const stripContent = validProds.length === 1 || validProds.length > rows
          ? `All ${rows} strips show the SAME product: "${main.name}".
Each strip layout (horizontal):
${usingPhotos ? '- LEFT: small product photo (from the provided reference)' : ''}
- CENTER: product name "${main.name}" in bold white Korean (medium size)
- RIGHT: ${main.originalPrice && main.price && main.originalPrice > main.price ? `small original "${main.originalPrice.toLocaleString('ko-KR')}원" with red strikethrough, and below it ` : ''}${main.price ? `huge sale price "${main.price.toLocaleString('ko-KR')}원" in golden yellow` : ''}`
          : `Each strip shows a DIFFERENT product from this list (in order, repeat if fewer products than strips):
${validProds.map((p, i) => {
  const parts = [`Strip ${i + 1}: "${p.name}"`];
  if (p.originalPrice && p.price && p.originalPrice > p.price) parts.push(`original "${p.originalPrice.toLocaleString('ko-KR')}원" (strikethrough)`);
  if (p.price) parts.push(`sale "${p.price.toLocaleString('ko-KR')}원"`);
  return `  - ${parts.join(', ')}`;
}).join('\n')}`;

        return `Create a Korean convenience store SHELF BANNER sheet (띠지) on an A4 page. ${ratio}.
${orientationStrict}

This is a sheet to be printed and cut into individual horizontal shelf banners.

═══ LAYOUT (STRICT) ═══
- EXACTLY ${rows} horizontal banner strips stacked vertically, filling the full page
- All strips EQUAL HEIGHT
- Thin dashed WHITE cut lines between strips
- Solid background color ${bg} on ALL strips uniformly

═══ STRIP CONTENT ═══
${stripContent}

${usingPhotos
  ? `═══ PRODUCT PHOTO ═══
You are receiving ${uploadedCount} reference product photo(s).
Use the photo(s) as the actual product(s) — preserve label, branding, packaging EXACTLY.
Place a small version of the photo in each strip (left side), integrated cleanly with the text.`
  : ''}

${direction ? `═══ VISUAL MOOD ═══\nApply this visual atmosphere to the whole sheet: "${direction}"\nYou can add subtle background effects/textures, but strips must remain clearly readable.` : ''}

═══ ABSOLUTE RULES ═══
- Korean text PERFECTLY ACCURATE
- EXACTLY ${rows} strips, no more no less
- Strips are HORIZONTAL (wider than tall)
- Do NOT add any text I did not specify (no store brand, no hours, no taglines, no invented prices)
- Do NOT invent products or change the ones I listed
- Each strip must be clearly separated by cut lines
- Print-ready quality, A4 sheet`;
      }

      return `Create horizontal banner strips on white background.
${isLandscape ? '6 strips' : '4 strips'} stacked vertically. Thin dotted cut lines between.
Each strip: ${main.name} product image on one side, ${direction || 'colorful'} decorative background, empty dark space for text.
NO TEXT. A4 ${ratio}. Print-ready.`;
    }
  }
}

export async function generateGeminiPOP(options: GeminiPOPOptions): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  const prompt = buildPrompt(options);
  console.log('[gemini] type:', options.popType, 'product:', options.products[0]?.name);

  try {
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];

    // 상품 이미지들 전달 (여러 장 지원)
    const images = options.productImages?.filter(img => img.startsWith('data:')) ||
      (options.productImageBase64?.startsWith('data:') ? [options.productImageBase64] : []);

    for (let i = 0; i < images.length; i++) {
      const [meta, data] = images[i].split(',');
      const mimeType = meta.match(/data:(.*?);/)?.[1] || 'image/png';
      parts.push({ inlineData: { mimeType, data } });
    }
    if (images.length > 0) {
      parts.push({ text: `IMPORTANT: ${images.length > 1 ? 'These are' : 'This is'} the ACTUAL product photo(s). You MUST use ${images.length > 1 ? 'these EXACT products' : 'this EXACT product'} with label, branding, and packaging visible. Do NOT create generic versions.` });
    }

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
      console.error('[gemini] error:', res.status);
      return null;
    }

    const result = await res.json();
    for (const part of (result.candidates?.[0]?.content?.parts || [])) {
      if (part.inlineData) {
        console.log('[gemini] 이미지 생성 성공!');
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error('[gemini] error:', e);
    return null;
  }
}
