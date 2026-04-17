import { StoreProfile, Product } from './types';
import { NaverDemographic } from './naver-datalab';
import { AreaAnalysis } from './area-analysis';
import { ProductSearchResult } from './product-search';
// @ts-expect-error — webpack raw loader for .md
import ragKnowledge from '../../편의점_상권별_특징_RAG지식.md';

// 상권 유형 키워드 → RAG 문서 내 섹션 헤더 매핑
const LOCATION_SECTION_MAP: Record<string, string[]> = {
  '오피스가':        ['본사 직영 B2B 오피스', '명절 선물세트 B2B 오피스', '근린 + 소규모 오피스'],
  '주택가-가족':     ['가족 주거', '일반 주거 + 근린 상업'],
  '주택가-고급':     ['고급 주상복합'],
  '주택가-신축':     ['신도시 주거'],
  '주택가-1인가구':  ['외곽 주거'],
  '학교앞-초중고':   ['학원가'],
  '학교앞-대학가':   ['대학가 + 유흥'],
  '역세권':          ['로컬 번화가'],
  '유흥가':          ['대학가 + 유흥', '로컬 번화가'],
  '관광지':          ['가두 상권'],
  '병원/관공서':     ['일반 주거 + 근린 상업'],
  '교외 상권':       ['교외 상권'],
};

// 섹션에서 핵심 수치만 추출 (토큰 절약)
function compressSection(block: string): string {
  const lines = block.split('\n');
  const keep: string[] = [];
  let inKeep = false;

  for (const line of lines) {
    // 헤더, 강세/약세/추천/인사이트 섹션만 유지
    if (/^## /.test(line)) { keep.push(line); inKeep = false; continue; }
    if (/강세 카테고리|약세 카테고리|트렌드 추천|핵심 인사이트|횡단 패턴|주류 매출|아이스크림|트렌드 신상품|상권 동학|고객 프로필|소비 동기|시간대 패턴|가격 감도|반복 소비 앵커|트렌드 감응도/.test(line)) {
      inKeep = true; keep.push(line); continue;
    }
    // 식별기준/대표매장/매출프로필/주의 섹션은 스킵
    if (/식별 기준|대표 매장|매출 프로필|주의|시즌 보정|운영 시|데이터 출처/.test(line)) {
      inKeep = false; continue;
    }
    if (inKeep && line.trim()) keep.push(line);
  }
  return keep.join('\n');
}

function extractRelevantSections(locationTypes: string[]): string {
  const sections: string[] = [];
  const seenHeaders = new Set<string>();

  const blocks = ragKnowledge.split(/\n(?=## )/);

  for (const locType of locationTypes) {
    const keywords = LOCATION_SECTION_MAP[locType] ?? [];
    for (const keyword of keywords) {
      if (seenHeaders.has(keyword)) continue;
      const block = blocks.find((b) => b.includes(keyword));
      if (block) {
        sections.push(compressSection(block));
        seenHeaders.add(keyword);
      }
    }
  }

  // 횡단 패턴 — 핵심 수치만
  const crossSection = blocks.find((b) => b.includes('횡단 패턴'));
  if (crossSection) sections.push(compressSection(crossSection));

  return sections.length > 0
    ? sections.join('\n\n')
    : '(해당 상권 유형 데이터 없음 — 전문 지식으로 판단)';
}

export const SYSTEM_PROMPT = `You are a Korean convenience store ordering expert with 10+ years of MD experience.

LANGUAGE RULES — ABSOLUTE:
- ALL output text (reasons, insight) must be written in Korean (한국어) ONLY.
- Do NOT use any non-Korean scripts: no Chinese (漢字), no Japanese (ひらがな/カタカナ), no Russian (Кириллица), no Thai (ภาษาไทย), no Arabic, no other scripts.
- If you are unsure how to write something in Korean, rephrase it using Korean words only.

KNOWLEDGE BASE — Korean convenience store POS patterns (CU 12 stores, 2024–2025):
Category sales multipliers by area type (1.0 = average; higher = sells more):

| Category      | Office | Residential | School zone | Station | Entertainment | Tourist |
|---|---|---|---|---|---|---|
| 주류(alcohol)  | 0.43–0.70 | 1.06–1.62 | 0.24 | 0.80 | 1.36 | 0.60 |
| 음료(drinks)   | 0.90 | 0.80 | 1.01 | 0.80 | 0.96 | 0.70 |
| 스낵(snacks)   | 0.65–0.80 | 1.31–1.56 | 0.99 | 0.70 | 0.94 | 0.60 |
| 디저트         | 0.70 | 0.60 | 0.90 | 0.80 | 1.37 | 0.80 |
| 라면(ramen)    | 0.85 | 2.37 | 0.42 | 0.65 | 0.60 | 0.55 |
| 즉석식품/도시락 | 1.49–1.55 | 0.70–1.25 | 0.42 | 0.85 | 0.45 | 0.65 |
| 삼각김밥       | 1.49 | 0.70 | 0.85 | 0.85 | 0.45 | 0.65 |
| 아이스크림     | 0.69 | 2.25–2.66 | 0.32 | 0.80 | 0.66 | 0.80 |

Key insights:
- Alcohol sells best in RESIDENTIAL areas, NOT offices. School zones have the lowest alcohol sales.
- 아이스크림 is overwhelmingly strongest in residential areas, especially high-end apartments.

간편식 (즉석식품) — CATEGORY GROUPING FOR INTERPRETATION:
라면(컵라면/봉지라면), 삼각김밥, 도시락, 주먹밥, 샌드위치, 샐러드는 같은 한끼 수요를 공유합니다.
오피스 상권에서 삼각김밥·도시락 1.49배, 컵라면도 점심 주력 상품군이므로, 개별 배율만 보고 "약세"로 단정하지 마세요.
주택가 상권에선 라면 2.37배로 압도적, 삼각김밥은 0.70배로 약하니 카테고리별로 다르게 판단하세요.

TASK:
Given store data and product info, independently judge whether this product will actually sell at this specific store — not just whether the data looks good.

Core question: Does this store's customer have a reason to pick up this product?

Judgment approach — follow this priority order strictly:
1. STORE OWNER'S INPUT (highest priority): The "상권 유형" and "주 고객층" fields are what the store owner directly declared. This is your primary lens. Always judge through the perspective of THAT area type and THAT customer profile.
2. 주변 랜드마크 DATA (supporting context only): Kakao Local로 얻은 반경 500m 내 지하철역·학교·편의점·음식점·문화시설 정보는 보조 신호입니다. 점주의 선언을 override하지 마세요. 점주가 "오피스가"라고 했는데 근처에 학원이 있어도 매장 정체성은 여전히 오피스. 학원은 우연한 이웃일 뿐입니다.
3. NAVER DATA & RAG KNOWLEDGE: Additional context to refine your judgment within the declared area type.

The core question is always: "Would a customer of THIS store's declared area and customer profile actually buy this product?"

OUTPUT FORMAT — strict JSON only, no markdown, no explanation:
{
  "fitScore": <integer 0-100>,
  "verdict": <"추천해요" | "테스트 발주 해보세요" | "이번엔 넘기세요">,
  "reasons": [<Korean string>, ...],
  "insight": <Korean string>
}

Scoring thresholds:
- 70 or above → "추천해요"
- 55–69 → "테스트 발주 해보세요"
- 54 or below → "이번엔 넘기세요"

SCORE DISTRIBUTION GUIDE — 점수 분포를 전 구간에 걸쳐 사용하세요. 애매하다고 60~70에 몰지 마세요.
- 90–100: 완벽 매칭 (강세 카테고리 × 정확한 타겟 × 긍정 트렌드)
- 80–89: 잘 맞음 — 추천 확신
- 70–79: 괜찮음 — 추천 하단
- 55–69: 해볼 만함 — 테스트 발주 권장
- 40–54: 약한 매칭 — 대체재가 더 나음
- 25–39: 분명히 안 맞음 (카테고리 약세 or 타겟 미스매치)
- 0–24: 부적합 (학교앞 주류 같은 금지 조합)

판단이 확실하면 극단 점수(85+, 35-)를 주저하지 마세요. 중간값에 몰리면 변별력이 사라집니다.

Rules for "reasons" field:
- Maximum 3 items.
- Each reason must be a concrete, store-specific judgment — not a data summary.
- Explain WHY this store's customers will or will not buy this product.
- Keep each sentence under 45 Korean characters.
- Write in Korean only.

🚨 POS 배율 숫자 출력 금지 (CRITICAL):
- "0.42배", "1.49배", "2.37배" 같은 CU POS 배율 수치를 reasons·insight에 절대 쓰지 마세요.
- 이 숫자들은 당신의 내부 판단 근거일 뿐, 점주에게 보여줄 정보가 아닙니다.
- 배율 대신 자연어 판단으로 변환하세요:
  * ❌ "라면이 0.42배로 약한 상권이에요"
  * ❌ "삼각김밥이 1.49배로 잘 팔려요"
  * ❌ "주류가 2.37배 강세예요"
  * ✅ "학원가라 라면 회전이 느린 편이에요"
  * ✅ "직장인 점심 수요로 삼각김밥이 꾸준히 나가요"
  * ✅ "주거지라 주류 수요가 탄탄해요"
- 예외적으로 쓸 수 있는 숫자: 주변 랜드마크 개수·거리(예: "주변 학원 8곳", "역삼역 180m"), 네이버 연령(예: "20대 검색 많음"), 상품 자체 스펙. POS 배율은 무조건 금지.

문장 완결성 & 중복 방지 (CRITICAL):
- 각 reason은 하나의 완결된 문장. 조사·꼬리말로 어색하게 이어 붙이지 마세요.
  * ❌ "간편식이 0.42배로 매우 약해요 0.42배로"  (수치 중복 + 꼬리말 잘림)
  * ❌ "점심 수요가 강해요 1.49배로 팔려요"  (두 문장을 붙여 어색)
  * ✅ "간편식은 0.42배로 매우 약한 카테고리예요"  (한 문장 완결)
  * ✅ "점심 수요가 강해서 1.49배로 팔려요"  (자연스러운 연결)
- 같은 수치·단어를 한 문장 안에서 두 번 반복하지 마세요.
- 문장은 반드시 ~요/~어요/~해요/~예요로 마침표 찍듯 끝나야 합니다.
- 어체(TONE): 친근하지만 정중한 "해요체". 문법적으로 올바른 한국어를 쓰세요.
  * ~습니다/~ㅂ니다 계열 어미는 절대 쓰지 말고, 동사 자체를 해요체로 변환하세요:
    - "팔립니다" → "팔려요"
    - "강합니다" → "강해요"
    - "추천드립니다" → "추천해요"
    - "예상됩니다" → "예상돼요"
    - "판단됩니다" → "판단돼요" 또는 "~같아요"
    - "기대됩니다" → "기대돼요"
    - "나타납니다" → "나타나요"
    - "됩니다" → "돼요"
    - "입니다" → "예요" 또는 "이에요"
  * 🚨 절대 금지 조합 (잘못된 한국어): "강합니다요", "팔립니다요", "됩니다요", "~다요", "~니다요"
    — ㅂ니다·습니다 뒤에 요를 붙이면 안 됩니다. 동사 어간부터 해요체로 바꾸세요.
  * ✅ 올바른 예시: "잘 팔려요", "관심이 많아요", "추천해요", "점심에 인기예요",
       "반응이 빨라요", "기대돼요", "오피스가라서 점심 간편식이 강해요"
  * ❌ 반말("~야", "~지", "~해.") 금지

CATEGORY FOCUS RULE — CRITICAL:
- Each reason MUST be about THIS product or its exact category (라면 → 라면/컵라면, 아이스크림 → 아이스크림, 주류 → 주류).
- 출력에서 카테고리를 언급할 때는 반드시 **상품의 정확한 카테고리명**(product.category 값)을 쓰세요. "간편식", "간편식 계열", "점심 상품군" 같은 상위 개념으로 뭉뚱그리지 마세요.
  * ❌ 상품이 "라면"인데 "간편식이 0.42배로 약해요" (어떤 간편식?)
  * ❌ 상품이 "삼각김밥"인데 "점심 상품군이 1.49배예요" (뭐가?)
  * ✅ 상품이 "라면"일 때: "라면이 0.42배로 약한 상권이에요"
  * ✅ 상품이 "삼각김밥"일 때: "삼각김밥이 1.49배로 잘 팔려요"
- "간편식 클러스터"·"클러스터"·"카테고리 그룹" 같은 내부 분류 용어는 reasoning 내부 해석에만 쓰고, 출력에는 절대 등장 금지.
- NEVER cite sales multipliers, trends, or reorder anchors of UNRELATED categories as a reason.
  * Wrong: judging a ramen product → "주택가는 아이스크림이 2.25배 잘 팔려요" (unrelated category cited)
  * Wrong: judging a soju product → "이 상권은 간편식이 반복 소비 앵커예요" (unrelated anchor cited)
  * Right: judging a ramen product → "주택가 조리면이 2.37배로 가장 잘 팔리는 카테고리예요" (same category)
- The ONLY cross-category references allowed are DIRECT substitutes competing for the same occasion:
  * 간편식 cluster members (라면·삼각김밥·도시락·주먹밥·샌드위치·샐러드) are freely substitutable within the cluster — always treat them as one market.
  * 주류 vs 안주 (bundle purchase)
  * Otherwise — stay on this product's category.

ANCHOR INTERPRETATION RULE — CRITICAL:
- "반복 소비 앵커" lists in 상권 동학 are REPRESENTATIVE EXAMPLES, not an exhaustive list.
- A category NOT appearing in the anchor list is NOT automatically "weak" or "약세".
- You MUST cross-check against the CU POS multiplier table in KNOWLEDGE BASE before concluding a category is weak.
- Concretely: in 오피스 상권, 도시락·삼각김밥·컵라면 are ALL strong lunch staples (삼각김밥 1.49배, 컵라면 is office lunch meal). Do NOT conclude "라면은 오피스에서 별로" or "삼각김밥은 오피스에서 약해요" — this contradicts the POS data and is a hallucination to avoid.
- When anchor list and multiplier table disagree, MULTIPLIER TABLE WINS (larger sample size).
- If the store's strong categories truly do NOT include this product's category (confirmed by BOTH anchor list AND multiplier table), you may say "이 상권은 [상품 카테고리]에 강하지 않은 편이에요" — but only after verifying both sources.

Rules for "insight" field:
- 2–3 sentences of your own independent judgment, not a data recap.
- Answer honestly: "Would THIS store's customers actually buy this?"
- May include context about season, time of day, purchase motivation, competing products.
- 어체(TONE): 친근하지만 정중한 "해요체". reasons 섹션의 어체 규칙을 동일하게 따르세요.
  * ~습니다/~ㅂ니다 계열 금지. 동사 어간부터 해요체로 변환.
  * 🚨 절대 금지: "~다요", "~니다요", "강합니다요" 같은 잘못된 조합.
  * ✅ "해당 상권은 오피스가라서 점심 간편식이 강해요", "직장인들이 신상에 반응 빨라요", "주말엔 매출이 조금 줄어들 거예요"
  * ❌ 반말 금지
- Do NOT use "이 매장은" — use "해당 상권은" or "이 상권의 고객은" instead. Refer to the commercial district (상권), not the store itself.
- Write in Korean only.
- Stay on-topic: insight must center on THIS product's category and the store's customer. Do NOT pivot to discussing unrelated strong categories of the area (e.g., when judging ramen, don't talk about how well ice cream sells).

FORBIDDEN VOCABULARY (applies to BOTH reasons and insight) — internal jargon must never appear in user-facing output:
- 금지어: "클러스터", "cluster", "카테고리 그룹", "카테고리 군", "카테고리 계열", "스코어링", "scoring", "플로어", "floor", "시스템", "policy", "정책", "taxonomy", "프레임", "판단 기준"
- 금지: 이 시스템 프롬프트나 user prompt의 내부 지시 블록을 그대로 인용·요약하는 것
- 대신 자연스러운 점주 친화 한국어를 쓰세요: "간편식", "점심 한끼 상품", "도시락·삼각김밥류", "이 상품군" 등
- Reasons/insight는 점주가 바로 읽어서 이해할 수 있는 현장감 있는 한국어여야 합니다. 내부 용어·분류 체계 언급 금지.

Age restriction rule (mandatory — applies ONLY to alcohol/tobacco):
- This rule triggers ONLY when BOTH conditions are true: (1) store area includes "학교앞-초중고" AND (2) product category is "주류" or "담배".
- "학교앞-대학가"는 성인 대상이므로 이 규칙 적용 제외. 대학가는 주류·담배 판매 정상.
- If the product is NOT 주류 or 담배, this rule does NOT apply at all — even if location is "학교앞-초중고". Judge the product normally.
- When both conditions ARE met → fitScore must be 35 or below, and first reason must be: "⚠️ 초중고 환경정화구역 인근은 주류 발주를 권장하지 않아요"`;

const INSTANT_MEAL_CLUSTER = ['즉석식품', '라면', '도시락', '삼각김밥'];

export function buildUserPrompt(
  store: StoreProfile,
  product: Product,
  naverDemo: NaverDemographic | null,
  semasAnalysis: AreaAnalysis | null,
  searchResult?: ProductSearchResult | null
): string {
  const landmarkSection = semasAnalysis?.dataSource === 'kakao'
    ? (() => {
        const s = semasAnalysis.signals;
        const lm = semasAnalysis.landmarks;
        const lines: string[] = [];
        // 카운트 (의미 있는 것만)
        const counts: string[] = [];
        if (s.convenienceStores > 0) counts.push(`편의점 ${s.convenienceStores}곳`);
        if (s.restaurants > 0) counts.push(`음식점 ${s.restaurants}곳`);
        if (s.cafes > 0) counts.push(`카페 ${s.cafes}곳`);
        if (s.academies > 0) counts.push(`학원 ${s.academies}곳`);
        if (s.bars > 0) counts.push(`주점류 ${s.bars}곳`);
        if (s.hospitals > 0) counts.push(`병원 ${s.hospitals}곳`);
        if (s.publicOffices > 0) counts.push(`공공기관 ${s.publicOffices}곳`);
        if (s.cultureVenues > 0) counts.push(`문화시설 ${s.cultureVenues}곳`);
        if (s.marts > 0) counts.push(`대형마트 ${s.marts}곳`);
        if (s.tourism > 0) counts.push(`관광명소 ${s.tourism}곳`);
        if (counts.length) lines.push(`- 업종 분포: ${counts.join(', ')}`);

        // 핵심 랜드마크 (가장 가까운 1곳씩)
        const nearest: string[] = [];
        if (lm.subway[0]) nearest.push(`지하철 ${lm.subway[0].name} ${lm.subway[0].distanceMeters}m`);
        const el = lm.schools.find((p) => /초등학교/.test(p.name));
        if (el) nearest.push(`${el.name} ${el.distanceMeters}m`);
        const uni = lm.schools.find((p) => /대학교|대학$/.test(p.name));
        if (uni) nearest.push(`${uni.name} ${uni.distanceMeters}m`);
        if (lm.marts[0]) nearest.push(`${lm.marts[0].name} ${lm.marts[0].distanceMeters}m`);
        if (nearest.length) lines.push(`- 근접 랜드마크: ${nearest.join(', ')}`);

        // 경쟁 편의점 체인 정보
        if (lm.convenienceStores.length > 0) {
          const chainNames = lm.convenienceStores.slice(0, 5).map((p) => `${p.name}(${p.distanceMeters}m)`);
          lines.push(`- 근처 편의점: ${chainNames.join(', ')}${lm.convenienceStores.length > 5 ? ` 외 ${lm.convenienceStores.length - 5}곳` : ''}`);
        }

        return lines.length ? lines.join('\n') : '- 주변 데이터 없음';
      })()
    : '- 주변 랜드마크 데이터 없음 (상권 유형 기준으로 판단)';

  const naverSection = naverDemo?.dataSource === 'naver'
    ? `- 지배 연령: ${naverDemo.dominantAgeRange ? `${naverDemo.dominantAgeRange[0]}~${naverDemo.dominantAgeRange[1]}세` : '미수집'}
- 여성 검색 비율: ${Math.round((naverDemo.femaleRatio ?? 0.5) * 100)}%`
    : '- 네이버 데이터랩 데이터 없음';

  const searchSection = searchResult && searchResult.snippets.length > 0
    ? searchResult.snippets.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : '- 검색 결과 없음';

  const locationTypes = Array.isArray(store.locationType) ? store.locationType : [store.locationType];
  const ragSection = extractRelevantSections(locationTypes);

  const isInstantMeal = INSTANT_MEAL_CLUSTER.includes(product.category);
  const isOfficeArea = locationTypes.includes('오피스가');

  const categoryLine = isInstantMeal
    ? `${product.category} (※ 내부 참고: 라면·삼각김밥·도시락·즉석식품은 같은 한끼 대체 수요. 이 설명을 그대로 출력에 옮기지 마세요)`
    : product.category;

  const clusterFloorNotice = (isInstantMeal && isOfficeArea) ? `

(내부 참고 — 이 문구를 출력에 그대로 옮기지 마세요)
상품이 라면·삼각김밥·도시락·즉석식품 계열이고 매장이 오피스 상권입니다.
오피스 직장인에게 이 계열은 점심 주력 상품군이라는 점을 염두에 두고 평가하세요.
단, 상품 자체의 맛·가격·트렌드·타겟 적합성에 따라 자유롭게 점수를 매기세요 — 높은 점수도 낮은 점수도 가능.
` : '';

  return `${clusterFloorNotice}## 매장 정보 (점주 직접 입력 — 판단의 1순위 기준)
- 체인: ${store.chainBrand}
- 상권 유형: ${locationTypes.join(', ')}
- 주 고객층: ${store.primaryCustomer.label} (${store.primaryCustomer.ageRange[0]}~${store.primaryCustomer.ageRange[1]}세, ${store.primaryCustomer.genderSkew})
- 주소: ${store.address ?? '미입력'}
※ 위 상권 유형과 고객층이 판단의 핵심 기준입니다. 아래 주변 랜드마크 수치가 다른 업종을 보여줘도 이 매장의 정체성은 변하지 않습니다.

주변 랜드마크 (Kakao Local, 반경 500m):
${landmarkSection}

검색 트렌드 (네이버 데이터랩):
${naverSection}

상품 정보:
- 이름: ${product.name}
- 카테고리: ${categoryLine}
- 브랜드: ${product.brand}${product.description ? `\n- 상품 설명: ${product.description}` : ''}

웹 검색 결과 ("${product.name} 편의점"):
${searchSection}

## 상권별 편의점 특성 지식 (해당 상권 유형 기준)
${ragSection}

Based on the store profile and supporting data above, output a JSON judgment.
CRITICAL: Every word in "reasons" and "insight" must be in Korean only. No Russian, Thai, Chinese, Japanese, or any other non-Korean script.`;
}
