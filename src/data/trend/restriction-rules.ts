import { Category, LocationType } from '@/lib/trend/types';

export interface RestrictionRule {
  categories: Category[];
  restrictedLocations: LocationType[];
  maxScore: number;
  reason: string;
}

// 법적/사회적 제한이 있는 카테고리 × 상권 조합
export const RESTRICTION_RULES: RestrictionRule[] = [
  {
    categories: ['주류'],
    restrictedLocations: ['학교앞-초중고'],
    maxScore: 35,
    reason: '⚠️ 초중고 환경정화구역 인근은 주류 추천 대상이 아니에요. 관련 법규에 따라 발주 자제를 권장해요.',
  },
];
