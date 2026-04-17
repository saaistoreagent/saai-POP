import { Category, GenderSkew } from './types';

export interface NaverDemographic {
  genderSkew: GenderSkew;
  femaleRatio: number;
  dominantAgeRange: [number, number] | null; // null = 아직 미수집
  dataSource: 'naver' | 'fallback';
}

const CACHE_TTL = 24 * 60 * 60 * 1000;

// 4분할 연령 버킷 (Naver DataLab 연령 코드 기준)
// 코드: 1=0-12, 2=13-18, 3=19-24, 4=25-29, 5=30-34, 6=35-39, 7=40-44,
//       8=45-49, 9=50-54, 10=55-59, 11=60+
const AGE_BUCKETS: { range: [number, number]; codes: string[] }[] = [
  { range: [13, 18], codes: ['2'] },
  { range: [19, 29], codes: ['3', '4'] },
  { range: [30, 49], codes: ['5', '6', '7', '8'] },
  { range: [50, 60], codes: ['9', '10', '11'] },
];

function cacheKey(keyword: string, suffix: string) {
  return `naver_demo_v3_${suffix}_${keyword}`;
}

function avgRatio(data: { ratio: number }[]): number {
  if (!data?.length) return 0;
  return data.reduce((s, d) => s + d.ratio, 0) / data.length;
}

async function fetchTrend(keywords: string[], params: Record<string, unknown>): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const res = await fetch('/api/trend/naver-datalab?path=/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: start,
      endDate: today,
      timeUnit: 'week',
      keywordGroups: [{ groupName: keywords[0], keywords }],
      device: 'mo',
      ...params,
    }),
  });

  if (!res.ok) throw new Error(`Naver API ${res.status}`);
  const json = await res.json();
  return avgRatio(json.results?.[0]?.data ?? []);
}

/** 1단계: 성별만 빠르게 (2 calls) */
export async function fetchGenderDemographic(
  keywords: string[]
): Promise<NaverDemographic> {
  const key = cacheKey(keywords[0], 'gender');
  const cached = localStorage.getItem(key);
  if (cached) {
    const { data, ts } = JSON.parse(cached);
    if (Date.now() - ts < CACHE_TTL) return data;
  }

  const [avgF, avgM] = await Promise.all([
    fetchTrend(keywords, { gender: 'f' }),
    fetchTrend(keywords, { gender: 'm' }),
  ]);

  const total = avgF + avgM;
  const femaleRatio = total === 0 ? 0.5 : avgF / total;
  const genderSkew: GenderSkew =
    femaleRatio > 0.58 ? 'female' : femaleRatio < 0.42 ? 'male' : 'neutral';

  const result: NaverDemographic = {
    genderSkew,
    femaleRatio,
    dominantAgeRange: null, // 아직 미수집
    dataSource: 'naver',
  };

  localStorage.setItem(key, JSON.stringify({ data: result, ts: Date.now() }));
  return result;
}

/** 2단계: 연령대 추가 (4 calls) — 성별 결과에 덧붙임
 *  category를 전달하면 연령 제한 상품(주류 등) 미성년자 버킷을 0으로 처리해 재정규화
 */
export async function enrichWithAge(
  keywords: string[],
  prev: NaverDemographic,
  category?: Category
): Promise<NaverDemographic> {
  // 캐시 키에 카테고리 포함 (주류/일반 캐시 분리)
  const catSuffix = category ?? 'all';
  const key = cacheKey(keywords[0], `age_v4_${catSuffix}`);
  const cached = localStorage.getItem(key);
  if (cached) {
    const { data, ts } = JSON.parse(cached);
    if (Date.now() - ts < CACHE_TTL) {
      return { ...prev, dominantAgeRange: data.dominantAgeRange };
    }
  }

  // 4개 버킷 병렬 호출
  const ratioResults = await Promise.all(
    AGE_BUCKETS.map((b) => fetchTrend(keywords, { ages: b.codes }))
  );

  // 주류/담배: 13-18세(index 0) 버킷 제거 후 재정규화
  const RESTRICTED_CATEGORIES: Category[] = ['주류'];
  const isRestricted = category && RESTRICTED_CATEGORIES.includes(category);
  const effectiveRatios = ratioResults.map((r, i) =>
    isRestricted && i === 0 ? 0 : r
  );

  // 비율 합 → 비율 재정규화
  const total = effectiveRatios.reduce((s, r) => s + r, 0);
  const normalized = total === 0
    ? effectiveRatios
    : effectiveRatios.map((r) => r / total);

  // 상위 2개 구간 합산 범위 (해상도 개선)
  const ranked = AGE_BUCKETS
    .map((b, i) => ({ bucket: b, ratio: normalized[i] }))
    .sort((a, b) => b.ratio - a.ratio);

  const top2 = ranked.slice(0, 2);
  const minAge = Math.min(...top2.map((t) => t.bucket.range[0]));
  const maxAge = Math.max(...top2.map((t) => t.bucket.range[1]));
  const dominant: [number, number] = [minAge, maxAge];

  localStorage.setItem(key, JSON.stringify({ data: { dominantAgeRange: dominant }, ts: Date.now() }));
  return { ...prev, dominantAgeRange: dominant };
}
