/**
 * Gemini 2.5 Flash — 배경+상품 이미지만 생성 (텍스트 없이)
 * Canvas가 한글 텍스트를 정확하게 덮어씀
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface ProductInfo {
  name: string;
  originalPrice?: number | null;
  price?: number | null;
}

interface GeminiPOPOptions {
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

function buildPrompt(options: GeminiPOPOptions): string {
  const { popType, products, badgeType, direction, productImageBase64, productImages, embedKoreanText, catchphrase, bgColor } = options;
  const main = products[0];
  const isLandscape = direction?.includes('가로') || false;
  // A4 비율: portrait는 ~0.707 (5:7), landscape는 ~1.414 (7:5)
  const ratio = isLandscape ? '7:5 horizontal landscape (wider than tall)' : '5:7 vertical portrait (TALLER than wide, like a phone screen or A4 paper standing up)';
  const orientationStrict = isLandscape
    ? 'CRITICAL: The image MUST be HORIZONTAL/LANDSCAPE orientation. Width MUST be LARGER than height.'
    : 'CRITICAL: The image MUST be VERTICAL/PORTRAIT orientation. HEIGHT MUST BE LARGER THAN WIDTH. Like an A4 paper standing up. NOT square. NOT landscape.';
  const hasProductPhoto = !!productImageBase64;
  const uploadedCount = productImages?.filter(img => img.startsWith('data:')).length || (productImageBase64 ? 1 : 0);

  switch (popType) {
    case 'poster': {
      const productCount = products.filter(p => p.name).length;
      const productList = products.filter(p => p.name).map(p => p.name).join(', ');

      // ─── 한글 텍스트를 Gemini가 직접 박는 모드 ───
      if (embedKoreanText) {
        const validProds = products.filter(p => p.name);
        const allSamePrice = validProds.length >= 2 && validProds.every(p => p.price && p.price === validProds[0].price);
        const hasBadge = badgeType && badgeType !== '없음';
        const hasAnyPrice = validProds.some(p => p.price);

        const textBlock: string[] = [];
        if (catchphrase) {
          textBlock.push(`HEADER (top center, very large bold white Korean text): "${catchphrase}"`);
        }
        if (hasBadge) {
          textBlock.push(`BADGE (rounded yellow pill near header, dark text): "${badgeType}"`);
        }
        if (validProds.length === 1) {
          const p = validProds[0];
          textBlock.push(`PRODUCT NAME (bottom-left, white medium bold): "${p.name}"`);
          if (p.originalPrice && p.price && p.originalPrice > p.price) {
            textBlock.push(`ORIGINAL PRICE (small, white with red strikethrough line through it): "${p.originalPrice.toLocaleString('ko-KR')}원"`);
          }
          if (p.price) {
            textBlock.push(`SALE PRICE (huge, golden yellow #FFD700, bottom-right): "${p.price.toLocaleString('ko-KR')}원"`);
          }
        } else if (allSamePrice) {
          const p = validProds[0];
          textBlock.push(`SUBHEADER (medium white, bottom area): "${validProds.length}개 골라담기"`);
          if (p.originalPrice && p.price && p.originalPrice > p.price) {
            textBlock.push(`ORIGINAL PRICE (small, white with red strikethrough): "${p.originalPrice.toLocaleString('ko-KR')}원"`);
          }
          textBlock.push(`UNIFIED SALE PRICE (very large golden yellow): "${p.price?.toLocaleString('ko-KR')}원"`);
        } else if (hasAnyPrice) {
          // 가격 다름 → 각 상품 라인 (가격 있는 것만)
          textBlock.push(`PRODUCT LIST (bottom area, each product on one line, white name + yellow price):`);
          validProds.forEach(p => {
            if (p.price) {
              textBlock.push(`  - "${p.name}" ... "${p.price.toLocaleString('ko-KR')}원"`);
            } else {
              textBlock.push(`  - "${p.name}" (no price shown)`);
            }
          });
        }
        // 가격 없으면 상품명 나열 안 함 — 사진으로 충분

        const layoutHint = validProds.length === 1
          ? `Center the single product (${main.name}) prominently in the middle, taking about 50% of the frame.`
          : `Show all ${validProds.length} products together as ONE cohesive scene with shared lighting and background — like a real product photo shoot, NOT a grid or split panels. Arrange them naturally (gathered, slightly overlapping, or grouped).`;

        return `Create a Korean convenience store advertisement poster. ${ratio} format.
${orientationStrict}

═══ ABSOLUTE RULES — VIOLATIONS RUIN THE IMAGE ═══

1. **ONLY include the Korean texts I list below. Do NOT add ANY other text.**
   - Do NOT invent prices that I did not give you.
   - Do NOT invent product names or quantities or descriptions ("5개입", "봉지라면", "세트" etc) that I did not write.
   - Do NOT add any store brand, franchise name, or logo (no "7-ELEVEN", no "GS25", no "CU", no "이마트24" — NOTHING).
   - Do NOT add operating hours ("영업시간", "모정시간", "오전 10시 ~ 오후 10시" or similar).
   - Do NOT add contact info, addresses, phone numbers, or website URLs.
   - Do NOT add subtitles, taglines, or fine print that I did not provide.
   - Do NOT add decorative text, product package text labels, or price tags that weren't listed.
   - **If information is missing (like a price), LEAVE THAT FIELD OUT entirely. Do NOT make up a plausible value.**

2. **Only the EXACT text strings below may appear in Korean.** Every Korean character in the image must match one of these strings EXACTLY, character-for-character.

═══ REQUIRED KOREAN TEXTS (these are the ONLY Korean texts allowed in the image) ═══
${textBlock.length > 0 ? textBlock.join('\n') : '(no text — image only)'}

Use a strong bold Korean display font (like Black Han Sans, Jalnan, Gmarket Sans, or Do Hyeon style — thick, impactful, advertisement style).

═══ PRODUCT VISUAL ═══
${layoutHint}
${uploadedCount > 0
  ? `You are receiving ${uploadedCount} reference photo(s) as input. Use them as the actual product(s) — preserve label, branding, color, and packaging EXACTLY. Do NOT generate generic versions. The product packaging may contain its own Korean text (brand name, product name on the package) — THAT is allowed because it's part of the actual product photo, not poster text.`
  : `Generate realistic photos of: ${productList}. The product packaging itself may show its natural brand/name text (that's fine, it's part of the product). But do NOT add any additional poster text beyond what I listed above.`}

═══ STYLE ═══
- Professional advertising quality, dramatic studio lighting
- ${direction || 'clean background matching the products'}
- Simple, uncluttered layout — empty space is OK
- No background props like cashiers, shelves with other products, storefronts, or in-store scenes unless the user explicitly asked for it
- High contrast so the required Korean text is clearly readable
- Print-ready, A4 quality

═══ FINAL REMINDER ═══
- KOREAN TEXT: only the exact strings listed in the REQUIRED KOREAN TEXTS section. Nothing more, nothing less. Every character exact.
- NO invented prices, NO invented names, NO store brand, NO hours, NO extra anything.
- This is a Korean POP — Koreans will check every character, every number, every detail. Invented content = image is unusable.`;
      }

      if (productCount <= 1) {
        return `Create a professional advertisement poster image. ${ratio} format.
${orientationStrict}

CRITICAL RULES:
- ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO KOREAN CHARACTERS, NO WRITING OF ANY KIND
- The image must contain ZERO text elements

Content:
- Show ${main.name} product ${hasProductPhoto ? '(use the provided product photo exactly as-is)' : `(generate a realistic photo of "${main.name}" Korean convenience store product)`}
- Product should be large and prominent, taking 40-50% of the image center
- Background effects that match the product mood
- Leave the top 20% and bottom 30% darker for text overlay later
- Fill the entire frame, no empty white space
- Professional advertising quality, dramatic lighting
- High resolution, print-ready
${direction ? `\nUser's specific request for the visual style: "${direction}"\nFollow this direction for the background effects and overall mood.` : ''}

Remember: ZERO text in the image. Not even brand logos. Pure visual only.`;
      }

      // 다중 상품 — 한 장면으로 자연스럽게 합성
      const usingUploaded = uploadedCount >= productCount;
      const productList2 = products.filter(p => p.name).map((p, i) => `  ${i + 1}. ${p.name}`).join('\n');

      return `Create ONE professional advertisement poster image that naturally features ${productCount} products together as a single cohesive scene. ${ratio} format.
${orientationStrict}

CRITICAL RULES:
- ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO KOREAN CHARACTERS, NO WRITING OF ANY KIND
- The image must contain ZERO text elements

Composition:
- This is a SINGLE unified advertisement image, NOT a grid, NOT split panels, NOT a collage.
- All ${productCount} products must appear together in ONE shared scene with the SAME background, lighting, and perspective — like a real product photo shoot where all items sit on the same table or float in the same space.
- Arrange the products in a visually pleasing way (e.g., gathered in a row, slightly overlapping, staggered depths, or grouped naturally) — whatever looks best for an advertisement.
- All products should be similarly sized and clearly recognizable.
- Leave the top 15% and bottom 25% of the image visually calmer (darker, less busy) so text can be overlaid later. Do NOT add any text yourself.

Products to include:
${productList2}

${usingUploaded
  ? `IMAGE INPUTS:
You are receiving ${uploadedCount} reference photos as inline image inputs.
Use each photo as the actual product — preserve the label, branding, color, packaging, and shape EXACTLY as shown.
Do NOT generate generic versions. Do NOT swap brands.
Place all of them together into ONE cohesive scene with shared lighting and background.`
  : `- Generate realistic photos of each product based on the names above and arrange them together in one scene.`}

Style:
- Professional advertising quality, dramatic studio lighting
- ONE unified background (not separate panels per product)
- ${direction ? `Visual mood: "${direction}"` : 'Mood matching the products'}
- Print-ready, high resolution

Remember: ZERO text in the image. Pure visual only.`;
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
