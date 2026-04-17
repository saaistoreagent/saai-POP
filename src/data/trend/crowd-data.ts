import { LocationType } from '@/lib/trend/types';

export type FeedbackRating = 'good' | 'ok' | 'bad';

export interface CrowdBase {
  productId: string;
  // 상품별 기본 집단 데이터 (전체 상권 합산)
  totalCount: number;       // 발주한 매장 수
  reorderRate: number;      // 재발주율 0-1
  avgFirstQty: number;      // 평균 첫 발주량
  sentiment: {
    good: number;
    ok: number;
    bad: number;
  };
  quotes: { text: string; locationType: LocationType }[];
}

// 상권 유형별 재발주율 보정 계수
export const LOCATION_REORDER_MULTIPLIER: Record<LocationType, number> = {
  '역세권': 1.08,
  '오피스가': 1.04,
  '학교앞-초중고': 1.02,
  '학교앞-대학가': 1.06,
  '주택가-가족': 0.96,
  '주택가-고급': 1.00,
  '주택가-신축': 0.98,
  '주택가-1인가구': 0.94,
  '유흥가': 1.00,
  '관광지': 0.92,
  '병원/관공서': 0.90,
  '교외 상권': 0.90,
};

// 상권 유형별 샘플 비율 (전체에서 이 상권이 차지하는 비율 — 표시용)
export const LOCATION_SAMPLE_RATIO: Record<LocationType, number> = {
  '역세권': 0.28,
  '오피스가': 0.18,
  '학교앞-초중고': 0.10,
  '학교앞-대학가': 0.06,
  '주택가-가족': 0.08,
  '주택가-고급': 0.03,
  '주택가-신축': 0.05,
  '주택가-1인가구': 0.04,
  '유흥가': 0.10,
  '관광지': 0.05,
  '병원/관공서': 0.03,
  '교외 상권': 0.02,
};

export const CROWD_BASE: CrowdBase[] = [
  {
    productId: 'dubai-choco',
    totalCount: 47,
    reorderRate: 0.74,
    avgFirstQty: 12,
    sentiment: { good: 31, ok: 11, bad: 5 },
    quotes: [
      { text: '손님들이 먼저 물어봐서 들여놨는데 첫 주에 다 나갔어요.', locationType: '역세권' },
      { text: 'SNS 보고 찾아오는 손님들이 있어요. 12개 넣었다가 24개로 올렸어요.', locationType: '학교앞-초중고' },
      { text: '생각보다 잘 팔려서 놀랐어요. 관광지라 외국인들도 사가요.', locationType: '관광지' },
      { text: '주택가라 그런지 좀 느려요. 6개로 테스트 중이에요.', locationType: '주택가-가족' },
    ],
  },
  {
    productId: 'heycha-cloud',
    totalCount: 23,
    reorderRate: 0.61,
    avgFirstQty: 8,
    sentiment: { good: 12, ok: 7, bad: 4 },
    quotes: [
      { text: '2030 직장인 여성분들이 많이 사가요. 카페 대신 사는 것 같아요.', locationType: '오피스가' },
      { text: '처음엔 뭔지 몰랐는데 SNS 보고 찾아오는 분들이 생겼어요.', locationType: '역세권' },
      { text: '학생들한테는 좀 비싼 것 같아요. 천천히 나가요.', locationType: '학교앞-초중고' },
    ],
  },
  {
    productId: 'pepero-salty-vanilla',
    totalCount: 89,
    reorderRate: 0.71,
    avgFirstQty: 12,
    sentiment: { good: 57, ok: 22, bad: 10 },
    quotes: [
      { text: '빼빼로니까 그냥 믿고 넣었는데 역시나 잘 나가요.', locationType: '역세권' },
      { text: '학생들이 신상이라고 친구들한테 자랑하면서 사더라고요.', locationType: '학교앞-초중고' },
      { text: '달달한 거 좋아하는 직장인분들이 자주 사가요. 재발주 완료.', locationType: '오피스가' },
      { text: '주말엔 가족단위로 오시는 분들이 아이 간식으로 사가요.', locationType: '주택가-가족' },
    ],
  },
  {
    productId: 'highball-suntory',
    totalCount: 62,
    reorderRate: 0.68,
    avgFirstQty: 12,
    sentiment: { good: 38, ok: 17, bad: 7 },
    quotes: [
      { text: '금요일 퇴근하면서 사가는 분들이 많아요. 6캔 묶음으로 사가기도 해요.', locationType: '오피스가' },
      { text: '일본 술 좋아하는 손님들이 찾아오세요. 재발주 여러 번 했어요.', locationType: '유흥가' },
      { text: '홈술 트렌드로 요즘 잘 나가요. 주말에 특히 잘 팔려요.', locationType: '주택가-가족' },
      { text: '편의점 하이볼 유명해져서 손님들이 먼저 찾아요.', locationType: '역세권' },
    ],
  },
  {
    productId: 'paldo-bibimmyeon',
    totalCount: 78,
    reorderRate: 0.69,
    avgFirstQty: 12,
    sentiment: { good: 49, ok: 21, bad: 8 },
    quotes: [
      { text: '여름 전에 미리 쟁여두는 손님들이 많아요.', locationType: '주택가-가족' },
      { text: '점심에 혼자 드시는 분들이 많이 사가요.', locationType: '오피스가' },
      { text: '팔도 비빔면 원래 팬들이 계속 사가요. 안정적이에요.', locationType: '역세권' },
    ],
  },
  {
    productId: 'dubai-jjontteuk',
    totalCount: 34,
    reorderRate: 0.65,
    avgFirstQty: 8,
    sentiment: { good: 20, ok: 9, bad: 5 },
    quotes: [
      { text: 'CU 자체 상품이라 CU 점주들이 유리한 것 같아요.', locationType: '역세권' },
      { text: '두바이 초콜릿 관심 있는 분들이 대안으로 사가세요.', locationType: '학교앞-초중고' },
      { text: '퇴근길에 디저트로 사가는 분들이 있어요.', locationType: '오피스가' },
    ],
  },
  {
    productId: 'pizza-snack',
    totalCount: 41,
    reorderRate: 0.62,
    avgFirstQty: 12,
    sentiment: { good: 22, ok: 13, bad: 6 },
    quotes: [
      { text: '안주로 찾는 손님들이 있어요. 금요일에 잘 나가요.', locationType: '유흥가' },
      { text: '학생들 간식으로 잘 팔려요. 가격대도 적당하고요.', locationType: '학교앞-초중고' },
    ],
  },
  {
    productId: 'zero-soju',
    totalCount: 93,
    reorderRate: 0.73,
    avgFirstQty: 24,
    sentiment: { good: 62, ok: 22, bad: 9 },
    quotes: [
      { text: '다이어트 신경 쓰는 분들이 일부러 찾아와요. 안정적으로 잘 나가요.', locationType: '오피스가' },
      { text: '젊은 분들이 선호해요. 기존 소주보다 더 잘 팔려요.', locationType: '역세권' },
      { text: '가족 모임에서도 사가요. 주말에 특히 잘 팔려요.', locationType: '주택가-가족' },
    ],
  },
  {
    productId: 'ottogi-jinmilmyeon',
    totalCount: 56,
    reorderRate: 0.64,
    avgFirstQty: 12,
    sentiment: { good: 31, ok: 18, bad: 7 },
    quotes: [
      { text: '밀면 좋아하는 분들이 찾아오세요. 여름 대비용으로 들여놨어요.', locationType: '역세권' },
      { text: '점심 혼밥족 손님들한테 잘 나가요.', locationType: '오피스가' },
    ],
  },
  {
    productId: 'gs25-cheese-sogeumppang',
    totalCount: 29,
    reorderRate: 0.59,
    avgFirstQty: 6,
    sentiment: { good: 15, ok: 9, bad: 5 },
    quotes: [
      { text: 'GS25라 GS25 점주들한테만 해당돼요.', locationType: '역세권' },
      { text: '카페 감성 원하는 분들이 사가요.', locationType: '오피스가' },
    ],
  },
  {
    productId: 'gs25-zero-rice-chip',
    totalCount: 21,
    reorderRate: 0.52,
    avgFirstQty: 6,
    sentiment: { good: 9, ok: 8, bad: 4 },
    quotes: [
      { text: '건강 챙기는 분들이 가끔 찾아요. 천천히 나가요.', locationType: '오피스가' },
    ],
  },
  {
    productId: 'butter-tteok',
    totalCount: 18,
    reorderRate: 0.56,
    avgFirstQty: 6,
    sentiment: { good: 9, ok: 6, bad: 3 },
    quotes: [
      { text: '젊은 여성분들이 SNS 보고 찾아오세요.', locationType: '역세권' },
      { text: '카페 감성이라 MZ 손님들한테 반응 있어요.', locationType: '학교앞-초중고' },
    ],
  },
  {
    productId: 'crunky-pistachio',
    totalCount: 32,
    reorderRate: 0.59,
    avgFirstQty: 12,
    sentiment: { good: 17, ok: 10, bad: 5 },
    quotes: [
      { text: '두바이 초콜릿 열풍 덕분에 같이 잘 나가요.', locationType: '역세권' },
      { text: '피스타치오 좋아하는 분들이 기다렸다는 듯이 사가요.', locationType: '오피스가' },
    ],
  },
  {
    productId: 'paldo-wangttugong',
    totalCount: 44,
    reorderRate: 0.61,
    avgFirstQty: 12,
    sentiment: { good: 24, ok: 14, bad: 6 },
    quotes: [
      { text: '야식으로 사가는 분들이 많아요. 저녁에 잘 나가요.', locationType: '유흥가' },
      { text: '추운 날 컵라면 대신 사가요.', locationType: '주택가-가족' },
    ],
  },
  {
    productId: 'black-thunder',
    totalCount: 27,
    reorderRate: 0.56,
    avgFirstQty: 12,
    sentiment: { good: 13, ok: 9, bad: 5 },
    quotes: [
      { text: '일본 과자 좋아하는 분들이 찾아요. 마니아층이 있어요.', locationType: '역세권' },
      { text: '가성비 간식으로 학생들한테 반응 좋아요.', locationType: '학교앞-초중고' },
    ],
  },
];

// localStorage 기반 로컬 피드백 관리
const FEEDBACK_KEY = 'crowdFeedback';

export interface LocalFeedback {
  productId: string;
  locationType: LocationType;
  rating: FeedbackRating;
  comment?: string;
  createdAt: number;
}

export function saveFeedback(feedback: LocalFeedback) {
  const existing = loadAllFeedback();
  existing.push(feedback);
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(existing));
}

export function loadAllFeedback(): LocalFeedback[] {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function getMyFeedback(productId: string, locationType: LocationType): LocalFeedback | null {
  return loadAllFeedback().find(
    (f) => f.productId === productId && f.locationType === locationType,
  ) ?? null;
}

// 상품 + 상권 기준 집단 데이터 계산
export function getCrowdStats(productId: string, locationType: LocationType) {
  const base = CROWD_BASE.find((d) => d.productId === productId);
  if (!base) return null;

  const multiplier = LOCATION_REORDER_MULTIPLIER[locationType] ?? 1;
  const sampleRatio = LOCATION_SAMPLE_RATIO[locationType] ?? 0.15;
  const locationCount = Math.max(3, Math.round(base.totalCount * sampleRatio));
  const reorderRate = Math.min(0.95, base.reorderRate * multiplier);

  // 로컬 피드백 반영
  const localFeedbacks = loadAllFeedback().filter(
    (f) => f.productId === productId && f.locationType === locationType,
  );
  const localGood = localFeedbacks.filter((f) => f.rating === 'good').length;
  const localOk = localFeedbacks.filter((f) => f.rating === 'ok').length;
  const localBad = localFeedbacks.filter((f) => f.rating === 'bad').length;

  const baseGood = Math.round(base.sentiment.good * sampleRatio);
  const baseOk = Math.round(base.sentiment.ok * sampleRatio);
  const baseBad = Math.round(base.sentiment.bad * sampleRatio);

  const totalGood = baseGood + localGood;
  const totalOk = baseOk + localOk;
  const totalBad = baseBad + localBad;
  const totalSentiment = totalGood + totalOk + totalBad;

  const locationQuotes = base.quotes.filter((q) => q.locationType === locationType);
  const otherQuotes = base.quotes.filter((q) => q.locationType !== locationType);
  const quotes = [...locationQuotes, ...otherQuotes].slice(0, 3);

  return {
    locationCount: locationCount + localFeedbacks.length,
    reorderRate,
    avgFirstQty: base.avgFirstQty,
    sentiment: {
      good: totalGood,
      ok: totalOk,
      bad: totalBad,
      total: totalSentiment,
    },
    quotes,
  };
}
