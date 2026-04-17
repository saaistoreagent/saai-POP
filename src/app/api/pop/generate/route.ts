import { NextRequest } from 'next/server';
import { generateGeminiPOP } from '@/lib/generateGeminiPOP';
import { overlayTextOnImage } from '@/lib/overlayText';
import { renderBadgeSheet, renderShelfSheet, renderBannerSheet, tileImageToSheet } from '@/lib/renderSimplePOP';
import fs from 'fs';
import path from 'path';

// AI 실패 시 사용할 fallback 문구 — 상품명을 대입할 수 있게 {product} 플레이스홀더
const FALLBACK_PHRASES: Record<string, { catchphrase: string; subCopy: string }[]> = {
  price: [
    { catchphrase: '맛있는 혜택!', subCopy: '' },
    { catchphrase: '이 가격 실화?!', subCopy: '' },
    { catchphrase: '초특가 행사!', subCopy: '' },
  ],
  promo: [
    { catchphrase: '득템 찬스!', subCopy: '' },
    { catchphrase: '역대급 혜택!', subCopy: '' },
    { catchphrase: '지금이 기회!', subCopy: '' },
  ],
  strip: [
    { catchphrase: '지금 핫한!', subCopy: '' },
    { catchphrase: '여기서만!', subCopy: '' },
  ],
  product: [
    { catchphrase: '지금 핫한!', subCopy: '' },
    { catchphrase: '신상 입고!', subCopy: '' },
  ],
};

function getFallback(category: string) {
  const pool = FALLBACK_PHRASES[category] || FALLBACK_PHRASES.promo;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 상품명에서 배경 테마 자동 추론 */
function guessTheme(productName: string, direction?: string): string {
  const text = `${productName} ${direction || ''}`;
  const rules: [RegExp, string][] = [
    [/맥주|비어|beer|하이볼|사이다|콜라|음료|주스|생수|물|아이스|얼음|시원|캔|병/i, 'ice'],
    [/라면|불닭|매운|핫|떡볶이|짬뽕|라볶이|고추/i, 'fire'],
    [/건강|샐러드|비타민|단백질|그린|녹차|말차|두유/i, 'nature'],
    [/초콜릿|초코|디저트|케이크|발렌타인|화이트데이|달콤|과자|빵|아이스크림|페레로|로쉐|가나|빼빼로|젤리|캔디|사탕|마카롱|쿠키|새우깡|꼬깔콘|포카칩/i, 'sweet'],
    [/와인|위스키|프리미엄|고급|럭셔리|스페셜/i, 'premium'],
    [/여름|바다|해변|열대|망고|수박/i, 'summer'],
    [/겨울|따뜻|핫초코|군고구마|호빵|가을|커피/i, 'warm'],
    [/에너지|챌린지|신맛|전기|파워|소주/i, 'electric'],
    [/할인|특가|세일|행사|번들|무료|증정|덤/i, 'yellow'],
  ];
  for (const [regex, theme] of rules) {
    if (regex.test(text)) return theme;
  }
  return 'yellow';
}

/** 상품+방향에서 bgPrompt 자동 생성 (AI 실패 시 fallback) */
function guessBgPrompt(productName: string, direction?: string): string {
  const theme = guessTheme(productName, direction);
  const prompts: Record<string, string> = {
    ice: 'dark navy blue background with frozen ice shards and cold mist, blue gradient, beer advertisement style, clean professional, cool tones only, no warm colors, no red',
    fire: 'dark background with dramatic orange red flame streaks, Korean ramen advertisement style, warm energy, dynamic fire effects, spicy atmosphere',
    nature: 'deep green forest background with morning sunlight rays, fresh dewdrops, organic clean atmosphere, health food advertisement',
    sweet: 'warm pink and cream pastel background with soft bokeh lights, dessert bakery display window style, sweet dreamy atmosphere, valentine aesthetic',
    premium: 'dark black background with elegant gold particles and bokeh, luxury brand advertisement, sophisticated minimal, champagne gold accents',
    summer: 'vibrant blue ocean water surface with sunlight reflections, tropical summer advertisement, refreshing bright, beach vibes',
    warm: 'warm amber brown background with soft fireplace glow, cozy winter atmosphere, hot beverage steam, comfort food advertisement',
    electric: 'dark purple neon background with electric lightning effects, energy drink advertisement style, dynamic powerful, glowing edges',
    yellow: 'bright golden yellow gradient background with celebration confetti, sale event advertisement, exciting bold, retail promotion style',
  };
  return prompts[theme] || prompts.yellow;
}

/** base64 이미지를 파일로 저장하고 URL 반환 */
function saveImageToPublic(base64: string): string {
  const id = `pop-${Date.now()}`;
  const dir = path.join(process.cwd(), 'public', 'generated');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const data = base64.split(',')[1];
  fs.writeFileSync(path.join(dir, `${id}.png`), Buffer.from(data, 'base64'));
  return `/generated/${id}.png`;
}

export async function POST(request: NextRequest) {
  const { productName, productBadge, price, originalPrice, direction, category, productImageUrl, productImages, badgeType: inputBadgeType, eventPeriod: inputEventPeriod, additionalProducts, orientation, premium: isPremium, bgColor: inputBgColor, catchphraseInput, noSearch, skipBgRemoval } = await request.json();

  // 상품명 필수 체크 제거 — 포스터도 문구만으로 생성 가능

  const categoryHint: Record<string, string> = {
    promo: '대형 특가 행사 홍보물 (A4 풀사이즈 포스터)',
    strip: '선반 부착용 띠지 — 짧고 강렬한 한줄',
    price: '가격/할인 POP (가로 가격 태그)',
    product: '상품 홍보 POP — 상품 매력 중심',
  };

  const prompt = `편의점 POP 캐치프레이즈를 만들어.

상품: ${productName}
${price ? `가격: ${price}원` : ''}
${direction ? `분위기: ${direction}` : ''}

규칙:
1. 12자 이내 짧고 강렬하게
2. 가격 넣지 마
3. subCopy는 빈 문자열 ""로
4. 이상한 표현 금지

JSON만:
{"catchphrase": "...", "subCopy": "...", "color": {"primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex", "text": "#hex"}}`;

  try {
    // Canvas-only 카테고리(badge/strip/price)는 캐치프레이즈가 렌더링에 사용되지 않음 → AI 호출 스킵
    const needsCatchphrase = (category === 'promo' || category === 'product') && !catchphraseInput;
    const aiRes = needsCatchphrase ? await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai',
        jsonMode: true,
      }),
    }).catch(() => null) : null;

    let catchphrase: string = '';
    let subCopy: string = '';

    // 문구: 쓰면 그대로, 비우면 AI 생성
    if (catchphraseInput) {
      catchphrase = catchphraseInput;
    }
    let color = {
      primary: '#DC2626', secondary: '#FEF2F2', accent: '#F59E0B',
      background: '#FFFFFF', text: '#1F2937',
    };

    if (catchphraseInput) {
      // 유저가 직접 입력 → AI 스킵
    } else if (!needsCatchphrase) {
      // Canvas-only 카테고리 → 캐치프레이즈 불필요, 빈값
    } else if (aiRes?.ok) {
      const aiText = await aiRes.text();
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        catchphrase = data.catchphrase || '';
        subCopy = data.subCopy || '';
        color = {
          primary: data.color?.primary || color.primary,
          secondary: data.color?.secondary || color.secondary,
          accent: data.color?.accent || color.accent,
          background: data.color?.background || color.background,
          text: data.color?.text || color.text,
        };

        if (!catchphrase || catchphrase.length < 3 || catchphrase.length > 40) {
          const fb = getFallback(category);
          catchphrase = fb.catchphrase;
          subCopy = fb.subCopy;
        }
      } else {
        const fb = getFallback(category);
        catchphrase = fb.catchphrase;
        subCopy = fb.subCopy;
      }
    } else {
      const fb = getFallback(category);
      catchphrase = fb.catchphrase;
      subCopy = fb.subCopy;
    }

    // 이미지 생성
    let bgImage: string | null = null;
    let fullImage = false;

    if (category === 'promo' || category === 'product') {
      // 대형 POP → Gemini Flash로 전체 이미지 한 번에 생성
      console.log('[pop] Gemini POP 생성 시도...');

      // 상품 목록 구성 (검색 전에 먼저)
      const allProducts = [
        { name: productName, badge: productBadge || null, originalPrice: originalPrice || null, price: price || null },
        ...(additionalProducts || []),
      ];

      // 모든 상품의 이미지 확보 — 있으면 좋고 없으면 그냥 진행 (Gemini가 알아서 생성)
      const productBase64Array: string[] = [];
      for (let i = 0; i < allProducts.length; i++) {
        const p = allProducts[i];
        if (!p.name) continue;

        // 1. 같은 인덱스에 업로드된 이미지가 있으면 그걸 사용
        let src: string | null = null;
        if (productImages && productImages[i]) {
          src = productImages[i];
        } else if (i === 0 && productImageUrl) {
          src = productImageUrl;
        }

        // 2. 없으면 자동 검색 시도. 단 noSearch면 건너뜀.
        if (!src && !noSearch) {
          console.log(`[pop] 상품 ${i + 1} 이미지 검색:`, p.name);
          try {
            const searchRes = await fetch(`${request.nextUrl.origin}/api/search-image?q=${encodeURIComponent(p.name)}`);
            if (searchRes.ok) {
              const { images } = await searchRes.json();
              if (images?.length > 0) {
                const keywords = p.name.split(/[\s]+/).filter((w: string) => w.length >= 2);
                const matched = images.find((img: { title: string }) => {
                  return keywords.every((kw: string) => img.title.includes(kw));
                });
                if (matched) {
                  src = matched.url;
                  console.log(`[pop] ✓ 상품 ${i + 1} 찾음:`, matched.title.slice(0, 40));
                }
              }
            }
          } catch {}
        }

        // 3. src가 있으면 base64로 변환. 없거나 실패해도 그냥 다음 상품으로.
        if (src) {
          if (src.startsWith('data:')) {
            productBase64Array.push(src);
          } else {
            try {
              const imgRes = await fetch(src);
              if (imgRes.ok) {
                const buf = await imgRes.arrayBuffer();
                const ct = imgRes.headers.get('content-type') || 'image/png';
                productBase64Array.push(`data:${ct};base64,${Buffer.from(buf).toString('base64')}`);
              } else {
                console.log(`[pop] 상품 ${i + 1} 다운로드 실패, 스킵`);
              }
            } catch {
              console.log(`[pop] 상품 ${i + 1} fetch 에러, 스킵`);
            }
          }
        } else {
          console.log(`[pop] 상품 ${i + 1} 이미지 없음, Gemini가 생성하도록 진행`);
        }
      }

      // popType 매핑
      const popTypeMap: Record<string, 'poster' | 'badge' | 'shelf' | 'banner'> = {
        promo: 'poster', product: 'poster', price: 'shelf', strip: 'banner', badge: 'badge',
      };
      const popType = popTypeMap[category] || 'poster';
      const products = allProducts;

      const geminiImage = await generateGeminiPOP({
        popType,
        products,
        badgeType: inputBadgeType || undefined,
        direction: `${direction || ''} ${orientation === '가로' ? '가로형(landscape) 레이아웃' : '세로형(portrait)'}`.trim(),
        catchphrase,
        productImageBase64: productBase64Array[0] || null,
        productImages: productBase64Array.length > 0 ? productBase64Array : undefined,
        // 포스터: Gemini가 캐치프레이즈를 직접 박음 (자연스러운 배치)
        embedKoreanText: popType === 'poster',
      });

      if (geminiImage) {
        bgImage = saveImageToPublic(geminiImage);
        fullImage = true;
      } else {
        console.log('[pop] Gemini 실패');
      }
    } else if (category === 'badge') {
      // 배지 → Canvas 직접 렌더링
      const isLandscape = orientation === '가로';
      const badgeImage = renderBadgeSheet(inputBadgeType || '', isLandscape, inputBgColor);
      bgImage = saveImageToPublic(badgeImage);
      fullImage = true;
    } else if (category === 'price' || category === 'strip') {
      const isLandscape = orientation === '가로';
      const products = [
        { name: productName, originalPrice: originalPrice || null, price: price || null },
        ...(additionalProducts || []),
      ];

      // 선반/띠지는 항상 Canvas 템플릿 — 사진을 data URL로 변환 + 배경 제거
      const photoList: (string | null)[] = [];
      const srcs: (string | null | undefined)[] = productImages || (productImageUrl ? [productImageUrl] : []);
      for (const s of srcs) {
        if (!s) { photoList.push(null); continue; }
        let dataUrl: string | null = null;
        if (s.startsWith('data:')) {
          dataUrl = s;
        } else {
          try {
            const imgRes = await fetch(s, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            });
            if (imgRes.ok) {
              const buf = await imgRes.arrayBuffer();
              const ct = imgRes.headers.get('content-type') || 'image/png';
              dataUrl = `data:${ct};base64,${Buffer.from(buf).toString('base64')}`;
            }
          } catch {}
        }
        if (dataUrl && !skipBgRemoval) {
          try {
            const bgRes = await fetch(`${request.nextUrl.origin}/api/remove-bg`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: dataUrl }),
            });
            if (bgRes.ok) {
              const bgData = await bgRes.json();
              if (bgData.imageBase64) {
                dataUrl = bgData.imageBase64;
                console.log('[pop] 배경 제거 성공');
              }
            }
          } catch (e) {
            console.warn('[pop] 배경 제거 실패, 원본 사용:', e);
          }
        }
        photoList.push(dataUrl);
      }

      try {
        if (category === 'price') {
          bgImage = saveImageToPublic(
            await renderShelfSheet(products, inputBadgeType, isLandscape, inputBgColor, photoList)
          );
        } else {
          bgImage = saveImageToPublic(
            await renderBannerSheet(products, catchphrase, inputBadgeType, isLandscape, inputBgColor, photoList)
          );
        }
        fullImage = true;
      } catch (canvasErr) {
        console.error('[pop] Canvas 렌더링 에러:', canvasErr);
      }
    }

    return Response.json({
      catchphrase,
      subCopy,
      bgTheme: guessTheme(productName, direction),
      bgImage: bgImage || null,
      color,
      fullImage,
    });
  } catch {
    const fb = getFallback(category);
    return Response.json({
      catchphrase: fb.catchphrase,
      subCopy: fb.subCopy,
      bgImage: null,
      color: {
        primary: '#DC2626', secondary: '#FEF2F2', accent: '#F59E0B',
        background: '#FFFFFF', text: '#1F2937',
      },
    });
  }
}
