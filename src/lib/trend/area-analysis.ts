// 상권 분석 — Kakao Local API 기반 (기존 SEMAS 대체)
// 기존 AreaAnalysis/AreaSignals 타입 shape을 호환 유지하면서 Kakao로 소스만 교체.

import { Category } from './types';
import {
  scanNearby,
  classifyConvenienceStores,
  classifySchools,
  AreaLandmarks,
  KakaoPlace,
} from './kakao-local';

export interface IndustryCount {
  name: string;
  count: number;
  ratio: number;
}

// 호환 유지: 기존 코드가 쓰는 signal 필드 + 신규 Kakao signal 필드
export interface AreaSignals {
  // 기존 (카카오로 재계산)
  convenienceStores: number;
  bars: number;         // Kakao는 주점 별도 카테고리 없음 — 음식점 중 주점류 이름 매칭으로 근사
  cafes: number;
  academies: number;
  restaurants: number;
  // 신규 Kakao 전용
  subwayStations: number;
  elementarySchools: number;
  middleHighSchools: number;
  universities: number;
  marts: number;
  cultureVenues: number;
  hospitals: number;
  tourism: number;
  publicOffices: number;
}

export interface AreaAnalysis {
  totalStores: number;
  industries: IndustryCount[];
  signals: AreaSignals;
  landmarks: AreaLandmarks; // 원본 Kakao 결과 (상세 UI/LLM용)
  dataSource: 'kakao' | 'fallback';
}

// 주점 근사: Kakao 음식점 중 이름에 주점·호프·포차 등 포함
const BAR_KEYWORDS = /호프|주점|포차|선술집|이자카야|와인바|맥주|펍|bar/i;
function countBars(restaurants: KakaoPlace[]): number {
  return restaurants.filter((p) => BAR_KEYWORDS.test(p.name) || BAR_KEYWORDS.test(p.categoryName)).length;
}

function buildSignals(landmarks: AreaLandmarks): AreaSignals {
  const schools = classifySchools(landmarks.schools);
  return {
    convenienceStores: landmarks.convenienceStores.length,
    bars: countBars(landmarks.restaurants),
    cafes: landmarks.cafes.length,
    academies: landmarks.academies.length,
    restaurants: landmarks.restaurants.length,
    subwayStations: landmarks.subway.length,
    elementarySchools: schools.elementary.length,
    middleHighSchools: schools.middle.length + schools.high.length,
    universities: schools.university.length,
    marts: landmarks.marts.length,
    cultureVenues: landmarks.culture.length,
    hospitals: landmarks.hospitals.length,
    tourism: landmarks.tourism.length,
    publicOffices: landmarks.publicOffices.length,
  };
}

function buildIndustries(landmarks: AreaLandmarks, total: number): IndustryCount[] {
  const entries: { name: string; count: number }[] = [
    { name: '음식점', count: landmarks.restaurants.length },
    { name: '카페', count: landmarks.cafes.length },
    { name: '편의점', count: landmarks.convenienceStores.length },
    { name: '학원', count: landmarks.academies.length },
    { name: '병원', count: landmarks.hospitals.length },
    { name: '공공기관', count: landmarks.publicOffices.length },
    { name: '문화시설', count: landmarks.culture.length },
    { name: '대형마트', count: landmarks.marts.length },
    { name: '관광명소', count: landmarks.tourism.length },
    { name: '학교', count: landmarks.schools.length },
    { name: '지하철역', count: landmarks.subway.length },
  ];
  return entries
    .filter((e) => e.count > 0)
    .map((e) => ({ name: e.name, count: e.count, ratio: total > 0 ? e.count / total : 0 }))
    .sort((a, b) => b.count - a.count);
}

export async function fetchAreaAnalysis(
  cx: number,
  cy: number,
  radius = 500,
): Promise<AreaAnalysis> {
  const landmarks = await scanNearby(cx, cy, radius);
  const total = Object.values(landmarks).reduce((sum, arr) => sum + arr.length, 0);

  if (total === 0) {
    return {
      totalStores: 0,
      industries: [],
      signals: emptySignals(),
      landmarks,
      dataSource: 'fallback',
    };
  }

  return {
    totalStores: total,
    industries: buildIndustries(landmarks, total),
    signals: buildSignals(landmarks),
    landmarks,
    dataSource: 'kakao',
  };
}

function emptySignals(): AreaSignals {
  return {
    convenienceStores: 0, bars: 0, cafes: 0, academies: 0, restaurants: 0,
    subwayStations: 0, elementarySchools: 0, middleHighSchools: 0, universities: 0,
    marts: 0, cultureVenues: 0, hospitals: 0, tourism: 0, publicOffices: 0,
  };
}

function emptyLandmarks(): AreaLandmarks {
  return {
    convenienceStores: [], subway: [], schools: [], academies: [],
    cafes: [], restaurants: [], tourism: [], culture: [],
    marts: [], hospitals: [], publicOffices: [],
  };
}

export function emptyAreaAnalysis(): AreaAnalysis {
  return {
    totalStores: 0,
    industries: [],
    signals: emptySignals(),
    landmarks: emptyLandmarks(),
    dataSource: 'fallback',
  };
}

/** 소분류 시그널 기반 카테고리별 상권 적합도 (0~100) — 룰 기반 폴백용 */
export function calcAreaScore(analysis: AreaAnalysis, category: Category): number {
  const { signals, totalStores } = analysis;
  if (!totalStores) return 50;

  const r = (n: number) => n / totalStores;
  const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

  switch (category) {
    case '주류':
      return clamp(50 + r(signals.bars) * 400 - r(signals.convenienceStores) * 150);
    case '음료':
      return clamp(55 + r(signals.academies) * 200 + r(signals.subwayStations) * 100 - r(signals.cafes) * 100);
    case '스낵':
      return clamp(50 + r(signals.academies) * 250 - r(signals.convenienceStores) * 150);
    case '디저트':
      return clamp(45 + r(signals.academies) * 220 - r(signals.cafes) * 120);
    case '즉석식품':
      return clamp(65 - r(signals.restaurants) * 150 - r(signals.convenienceStores) * 200);
    default:
      return 50;
  }
}

// Re-export for backward compat (일부 파일이 semas-api에서 직접 import했을 수 있음)
export { scanNearby } from './kakao-local';
export type { KakaoPlace, AreaLandmarks } from './kakao-local';
