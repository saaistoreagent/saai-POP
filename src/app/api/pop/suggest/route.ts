import { NextRequest } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * 폼에 입력된 정보를 바탕으로 catchphrase + direction 자동 제안.
 * Gemini Flash 무료 티어 우선, 실패 시 Pollinations fallback.
 */

interface Product {
  name: string;
  originalPrice?: number | null;
  price?: number | null;
}

const FALLBACKS: Record<string, { catchphrase: string; direction: string }> = {
  poster: { catchphrase: '오늘만 특가', direction: '밝고 화려한 배경, 상품 돋보이게' },
  banner: { catchphrase: '이 가격 실화', direction: '깔끔한 단색 배경' },
  shelf: { catchphrase: '지금이 기회', direction: '선명한 단색 배경' },
  badge: { catchphrase: '특가', direction: '강렬한 단색' },
};

export async function POST(request: NextRequest) {
  try {
    const { category, products, badgeType, eventDesc, moodDesc } = await request.json();

    const productList = (products as Product[])
      .filter(p => p.name)
      .map(p => {
        const parts = [p.name];
        if (p.originalPrice && p.price && p.originalPrice > p.price) {
          parts.push(`${p.originalPrice}원 → ${p.price}원 할인`);
        } else if (p.price) {
          parts.push(`${p.price}원`);
        }
        return parts.join(' ');
      })
      .join(', ');

    const hasUserText = !!(eventDesc && eventDesc.trim());

    const prompt = hasUserText
      ? `당신은 편의점 POP 문구 다듬기 도우미입니다.

사용자가 적은 원본 문구: "${eventDesc}"
상품: ${productList || '없음'}

규칙:
1. 사용자가 적은 문구의 **의미를 100% 유지**하면서 POP 광고답게 다듬으세요.
2. **길이를 억지로 줄이지 마세요.** 원본이 2줄이면 2줄 그대로 OK. 원본이 길면 길어도 됩니다.
3. 핵심 키워드(숫자, 할인 조건, 상품명 등)를 절대 빼지 마세요.
4. 더 임팩트 있는 표현으로 바꾸되 뜻이 달라지면 안 됩니다.
5. 줄바꿈(\\n)은 원본에 있으면 유지하세요.
6. 예:
   - "카스랑 테라를 같이 사면 500원 할인\\n4월 한정 이벤트" → "카스+테라 동시구매 500원 할인!\\n4월 한정"
   - "3봉지 사면 1봉지 증정" → "3봉지 사면 1봉지 더!"
   - "유통기한 임박 30% 할인" → "유통기한 임박! 30% 할인"
7. 이모지 금지, JSON만 출력

JSON:
{"catchphrase": "...", "direction": "${moodDesc || '상품에 어울리는 배경'}"}`
      : `당신은 편의점 POP 제작 도우미입니다.

POP 종류: ${category}
상품: ${productList || '상품 정보 없음'}
행사 배지: ${badgeType || '없음'}

규칙:
1. catchphrase: 12자 이내 한국어. 강렬하고 친근하게. 예) "오늘만 특가", "놓치면 손해"
2. direction: 배경 분위기를 한 문장으로. 상품에 어울리게.
3. 이모지 금지, JSON만 출력

JSON:
{"catchphrase": "...", "direction": "${moodDesc || '상품에 어울리는 배경'}"}`;

    let resultText = '';

    // 1차: Gemini Flash 무료 (텍스트 전용, 이미지 생성 아님)
    if (GEMINI_API_KEY) {
      try {
        const gemRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 1.2 }, // 다양한 결과를 위해
            }),
          }
        );
        if (gemRes.ok) {
          const gemData = await gemRes.json();
          resultText = gemData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch {}
    }

    // 2차: Pollinations fallback
    if (!resultText) {
      try {
        const aiRes = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: 'openai',
            jsonMode: true,
          }),
        });
        if (aiRes.ok) resultText = await aiRes.text();
      } catch {}
    }

    if (!resultText) {
      return Response.json(FALLBACKS[category] || FALLBACKS.poster);
    }

    const match = resultText.match(/\{[\s\S]*\}/);
    if (!match) {
      return Response.json(FALLBACKS[category] || FALLBACKS.poster);
    }

    try {
      const parsed = JSON.parse(match[0]);
      return Response.json({
        catchphrase: parsed.catchphrase || FALLBACKS[category]?.catchphrase || '오늘만 특가',
        direction: parsed.direction || FALLBACKS[category]?.direction || '깔끔한 배경',
      });
    } catch {
      return Response.json(FALLBACKS[category] || FALLBACKS.poster);
    }
  } catch {
    return Response.json(FALLBACKS.poster);
  }
}
