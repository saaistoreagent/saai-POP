import { StoreProfile, Product, Prediction, ScoreBreakdown } from './types';
import { NaverDemographic } from './naver-datalab';
import { AreaAnalysis } from './area-analysis';
import { calculateFitScore } from './scoring';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts';

const CACHE_TTL = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 12000;

function cacheKey(productId: string, locationType: string, address: string, description?: string | null): string {
  const addressKey = address.replace(/\s+/g, '').slice(0, 20);
  const descKey = description ? description.replace(/\s+/g, '').slice(0, 10) : 'nd';
  return `llm_pred_v15_${productId}_${locationType}_${addressKey}_${descKey}`;
}

const VALID_VERDICTS = ['추천해요', '테스트 발주 해보세요', '이번엔 넘기세요'] as const;
type Verdict = typeof VALID_VERDICTS[number];

interface LLMRawResponse {
  fitScore: number;
  verdict: Verdict;
  reasons: string[];
  insight?: string;
}

// 한국어(한글·숫자·기본 라틴)만 남기고 나머지 외국 문자 제거
// 제거 대상: CJK(한자), 히라가나·카타카나, 키릴(러시아어), 태국어, 아랍어, 기타
function stripNonKoreanCJK(text: string): string {
  return text
    .replace(/[\u3040-\u30FF]/g, '')          // 히라가나·카타카나
    .replace(/[\u3400-\u4DBF\u4E00-\u9FFF]/g, '') // CJK 한자
    .replace(/[\u0400-\u04FF]/g, '')          // 키릴(러시아어 등)
    .replace(/[\u0E00-\u0E7F]/g, '')          // 태국어
    .replace(/[\u0600-\u06FF]/g, '')          // 아랍어
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLLMResponse(text: string): LLMRawResponse | null {
  try {
    // JSON 블록 추출 (마크다운 코드펜스 안에 있을 수도 있음)
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (
      typeof parsed.fitScore !== 'number' ||
      typeof parsed.verdict !== 'string' ||
      !Array.isArray(parsed.reasons)
    ) return null;
    return parsed as LLMRawResponse;
  } catch {
    return null;
  }
}

function verdictToBreakdown(fitScore: number): ScoreBreakdown {
  // LLM이 종합 판단하므로 breakdown은 fitScore 기반 추정값으로 표시
  return {
    trend: Math.min(100, Math.round(fitScore * 1.1)),
    locationFit: fitScore,
    demographic: Math.min(100, Math.round(fitScore * 0.95)),
  };
}

// 캐시에서 동기적으로 결과 조회 (로딩 스피너 스킵용)
export function peekCachedPrediction(
  store: StoreProfile,
  product: Product
): Prediction | null {
  const locationStr = Array.isArray(store.locationType) ? store.locationType.join('_') : store.locationType;
  const key = cacheKey(String(product.id), locationStr, store.address ?? locationStr, product.description);
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  try {
    const { data, ts } = JSON.parse(cached);
    if (Date.now() - ts < CACHE_TTL) return data;
  } catch {}
  return null;
}

export async function predictFit(
  store: StoreProfile,
  product: Product,
  naverDemo: NaverDemographic | null,
  semasAnalysis: AreaAnalysis | null
): Promise<Prediction> {
  const locationStr = Array.isArray(store.locationType) ? store.locationType.join('_') : store.locationType;
  const key = cacheKey(product.id, locationStr, store.address ?? locationStr, product.description);

  // 캐시 확인
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return data;
    } catch {
      // 캐시 파싱 실패 시 무시
    }
  }

  const userPrompt = buildUserPrompt(store, product, naverDemo, semasAnalysis);

  const body = JSON.stringify({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 512,
    response_format: { type: 'json_object' },
  });

  const callOpenAI = () =>
    fetch('/api/trend/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
  );

  try {
    let response = await Promise.race([callOpenAI(), timeout]) as Response;

    // 429 → 3초 대기 후 1회 재시도
    if (response.status === 429) {
      await new Promise((r) => setTimeout(r, 3000));
      response = await Promise.race([callOpenAI(), timeout]) as Response;
    }

    if (!response.ok) throw new Error(`Groq API ${response.status}`);

    const json = await response.json();
    const text = json.choices?.[0]?.message?.content ?? '';
    const parsed = parseLLMResponse(text);

    if (!parsed) throw new Error('JSON 파싱 실패');

    const fitScore = Math.max(0, Math.min(100, Math.round(parsed.fitScore)));
    const result: Prediction = {
      fitScore,
      scoreBreakdown: verdictToBreakdown(fitScore),
      reasons: parsed.reasons.slice(0, 3).map(stripNonKoreanCJK),
      insight: parsed.insight ? stripNonKoreanCJK(parsed.insight) : undefined,
    };

    localStorage.setItem(key, JSON.stringify({ data: result, ts: Date.now() }));
    return result;
  } catch (err) {
    // 에러를 그대로 throw — caller가 폴백/UI 처리
    throw err;
  }
}
