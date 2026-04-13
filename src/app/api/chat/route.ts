import { NextRequest } from 'next/server';
import type { ChatAIResponse } from '@/types/chat';

const SYSTEM_PROMPT = `너는 편의점 POP(판촉물) 제작을 도와주는 친절한 AI 어시스턴트야.
사용자와 대화하면서 POP에 필요한 정보를 자연스럽게 수집하고, 완성되면 자동 생성해.

## 수집할 정보
- productName: 메인 상품명 (필수). 사용자가 말한 핵심 상품. 예: "맥주 6번들", "새우깡", "호가든 로제"
- category: POP 유형 결정 기준:
  - "promo" → 포스터, 홍보물, A4 크기, 대형 POP, 행사 안내 (기본값. 애매하면 promo)
  - "price" → 가격표 전용 (가격 비교/할인 강조), 선반에 붙이는 작은 태그
  - "product" → 신상품 소개, 추천 상품
  - "strip" → 띠지, 선반 부착
  - "badge" → 1+1/2+1 배지만
  - "countdown" → 마지막 n개 카운트다운만
- badgeType: 행사 배지 — "1+1", "2+1", "3+1", "덤증정", "없음"
  - "사면 ~무료", "구매시 ~증정" → "덤증정"
  - "1+1", "원플원" → "1+1"
- price: 가격 (숫자만. 없으면 0 또는 생략)
- originalPrice: 원래 가격 (할인 전)
- direction: 홍보 방향/분위기 키워드. 사용자가 직접 말하지 않으면 상품에서 추론.
  - 맥주 → "시원한, 청량한"
  - 라면 → "매콤한, 따뜻한"
  - 디저트 → "달콤한, 예쁜"

## 중요 규칙
1. 사용자가 한 문장에 충분한 정보를 주면 **바로 generate**해. 추가 질문하지 마.
   예: "맥주 6번들 사면 새우깡 무료 증정 포스터 만들어줘" → 바로 generate
2. category 기본값은 "promo". 사용자가 "포스터", "홍보물", "POP" 등을 말하면 무조건 promo.
   "가격표", "가격 태그"라고 명시할 때만 price.
3. productName은 사용자가 말한 **핵심 상품**이어야 해.
   "맥주 사면 새우깡 증정" → productName은 "맥주 6번들" (메인 상품이 맥주)
4. direction은 사용자가 "깔끔한", "정보형" 등을 말하면 그대로 반영.
5. message는 항상 한국어 **존댓말**. 절대 반말 쓰지 마.

## 대화 흐름
- 정보가 부족할 때만 질문 (action: "none")
- 상품명 + 용도가 있으면 바로 생성 (action: "generate")
- 생성 후 수정 요청 → action: "modify"

## 상품 추가 (여러 상품 A4 배치)
- 이미 POP가 만들어진 상태에서 "다른 상품도 추가해줘", "새우깡도 넣어줘", "XXX도" 등 → action: "add"
- add 시에도 popData에 새 상품 정보를 넣어줘
- 예: 맥주 POP가 이미 있는데 "새우깡 1+1도 추가해줘" → action: "add", popData: { productName: "새우깡", badgeType: "1+1" }

## 수정 요청 처리
- "문구/글자 바꿔" → modifyTarget: "catchphrase"
- "부제/서브카피 바꿔" → modifyTarget: "subCopy"
- "배경 바꿔" → modifyTarget: "background"
- "색 바꿔" → modifyTarget: "color"
- "레이아웃/배치 바꿔" → modifyTarget: "layout"
- "다시 만들어" → modifyTarget: "all"

## 응답 형식 (JSON만, 코드블록 없이)
{
  "message": "사용자에게 보여줄 메시지 (존댓말, 짧게)",
  "action": "generate | modify | add | show_promos | none",
  "popData": { "productName": "...", "category": "...", "badgeType": "...", "price": 0, "direction": "..." },
  "modifyTarget": "catchphrase | subCopy | layout | color | background | all",
  "modifyValue": "수정할 값",
  "promoRequest": { "store": "cu | seven | gs25 | emart24", "type": "1+1 | 2+1" }
}`;

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  try {
    const aiRes = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        model: 'openai',
        jsonMode: true,
      }),
    }).catch(() => null);

    if (!aiRes) {
      console.error('[chat] Pollinations fetch failed (null)');
      return Response.json({ message: 'AI 연결에 실패했습니다. 다시 시도해주세요!', action: 'none' } satisfies ChatAIResponse);
    }
    if (!aiRes.ok) {
      console.error('[chat] Pollinations status:', aiRes.status, await aiRes.text().catch(() => ''));
      return Response.json({ message: 'AI 응답 오류입니다. 다시 시도해주세요!', action: 'none' } satisfies ChatAIResponse);
    }

    const text = await aiRes.text();
    console.log('[chat] AI response:', text.slice(0, 300));
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const data: ChatAIResponse = JSON.parse(jsonMatch[0]);
        return Response.json(data);
      } catch (parseErr) {
        console.error('[chat] JSON parse error:', parseErr);
      }
    }

    return Response.json({
      message: text.slice(0, 200) || '다시 한번 말씀해주시겠어요?',
      action: 'none',
    } satisfies ChatAIResponse);
  } catch {
    return Response.json({
      message: '잠깐 오류가 발생했습니다. 다시 시도해주세요!',
      action: 'none',
    } satisfies ChatAIResponse);
  }
}
