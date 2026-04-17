import { Category } from '@/lib/trend/types';

// 세븐일레븐 삼성역-선릉역 인근 오피스가 매장 2025 POS 분석 기반
// 155개 가설 검증 결과 (가설검증_통합결과.xlsx)

export type Season = '봄' | '여름' | '가을' | '겨울';

export interface EventEffect {
  name: string;
  mmdd: string;       // "11-11"
  categories: Category[];
  boostPct: number;   // 전주 동요일 대비 %
  daysWindow: number; // 이 날 기준 ±N일 효과
}

export interface CategoryPosInsight {
  category: Category;
  // 연평균 = 100 기준 계절 지수 (카테고리매출 계절별 일평균 비교)
  seasonIndex: Record<Season, number>;
  // 주말 지수 (평일=100 기준) — 오피스가 특성상 평일 >> 주말
  weekendIndex: number;
  // 금요일 지수 (평일 평균=100 기준)
  fridayIndex: number;
  // 이 카테고리의 연간 매출 비중 (%)
  revenueShare: number;
  // 요약 한 줄
  insight: string;
}

// 세부 분석: 오피스가(삼성역-선릉역) 기준
// Y-09: 평일 일매출 > 주말 (직장인 상권 확인)
// P-10: 간편식 평일 2배+, P-11: 주류 평일>주말
// P-01: 아이스크림 여름>>겨울, P-02: 컵라면 겨울>>여름
// D-01: 금요일 주류 +30%
export const CATEGORY_POS_INSIGHTS: CategoryPosInsight[] = [
  {
    category: '음료',
    seasonIndex: { 봄: 88, 여름: 142, 가을: 98, 겨울: 72 },
    weekendIndex: 68,
    fridayIndex: 104,
    revenueShare: 14,
    insight: '여름 폭염일 냉음료 +32% · 비오는날 -18%',
  },
  {
    category: '스낵',
    seasonIndex: { 봄: 96, 여름: 102, 가을: 118, 겨울: 84 },
    weekendIndex: 74,
    fridayIndex: 98,
    revenueShare: 8,
    insight: '빼빼로데이(11/11) +52% · 어린이날(5/5) +38%',
  },
  {
    category: '디저트',
    seasonIndex: { 봄: 98, 여름: 106, 가을: 108, 겨울: 112 },
    weekendIndex: 80,
    fridayIndex: 110,
    revenueShare: 6,
    insight: '발렌타인(2/14) 초콜릿 +200% · 크리스마스이브 +58%',
  },
  {
    category: '주류',
    seasonIndex: { 봄: 92, 여름: 112, 가을: 108, 겨울: 118 },
    weekendIndex: 84,
    fridayIndex: 132,
    revenueShare: 18,
    insight: '금요일 +32% · 12월 연말 최고점 · 하이볼 하반기 성장세',
  },
  {
    category: '즉석식품',
    seasonIndex: { 봄: 94, 여름: 86, 가을: 102, 겨울: 118 },
    weekendIndex: 46,
    fridayIndex: 92,
    revenueShare: 12,
    insight: '평일 비중 압도적 (주말 대비 2.2배) · 한파일 컵라면 +28%',
  },
];

// 이벤트 효과 캘린더
// E-03: 발렌타인 초콜릿 +200%, E-09: 빼빼로 +52%, E-14: 크리스마스이브 +58%
export const EVENT_CALENDAR: EventEffect[] = [
  { name: '발렌타인데이', mmdd: '02-14', categories: ['디저트', '스낵'], boostPct: 180, daysWindow: 3 },
  { name: '화이트데이',   mmdd: '03-14', categories: ['스낵', '디저트'],  boostPct: 75,  daysWindow: 2 },
  { name: '어린이날',     mmdd: '05-05', categories: ['스낵', '디저트'],  boostPct: 38,  daysWindow: 2 },
  { name: '빼빼로데이',   mmdd: '11-11', categories: ['스낵'],            boostPct: 52,  daysWindow: 4 },
  { name: '수능',         mmdd: '11-13', categories: ['음료'],            boostPct: 30,  daysWindow: 1 },
  { name: '크리스마스이브', mmdd: '12-24', categories: ['디저트', '주류'], boostPct: 58,  daysWindow: 3 },
  { name: '연말',         mmdd: '12-31', categories: ['주류'],            boostPct: 80,  daysWindow: 2 },
];

export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}

// 오늘 기준 앞으로 N일 내 이벤트 중 해당 카테고리에 영향 있는 것
export function getUpcomingEvents(category: Category, withinDays = 60): (EventEffect & { daysUntil: number })[] {
  const today = new Date();
  const year = today.getFullYear();

  return EVENT_CALENDAR
    .filter((e) => e.categories.includes(category))
    .map((e) => {
      const [mm, dd] = e.mmdd.split('-').map(Number);
      let eventDate = new Date(year, mm - 1, dd);
      if (eventDate < today) eventDate = new Date(year + 1, mm - 1, dd);
      const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / 86400000);
      return { ...e, daysUntil };
    })
    .filter((e) => e.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getCategoryInsight(category: Category): CategoryPosInsight | null {
  return CATEGORY_POS_INSIGHTS.find((c) => c.category === category) ?? null;
}
