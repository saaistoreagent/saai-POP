export type ChainBrand = 'CU' | 'GS25' | '세븐일레븐' | '이마트24' | '미니스톱' | '기타';
export type LocationType =
  | '오피스가'
  | '주택가-가족'
  | '주택가-고급'
  | '주택가-신축'
  | '주택가-1인가구'
  | '학교앞-초중고'
  | '학교앞-대학가'
  | '역세권'
  | '유흥가'
  | '관광지'
  | '병원/관공서'
  | '교외 상권';
export type Category = '주류' | '음료' | '스낵' | '디저트' | '즉석식품' | '라면' | '도시락' | '삼각김밥';
export type GenderSkew = 'male' | 'female' | 'neutral';

export interface Product {
  id: number;
  name: string;
  category: Category;
  brand: string;
  imageUrl?: string | null;
  active: number;
  newsletterIssue?: number | null;
  description?: string | null; // 내부 관리용, 유저에게 미노출
  createdAt: string;
}

export interface CustomerProfile {
  ageRange: [number, number];
  genderSkew: GenderSkew;
  lifestyleTags: string[];
  label: string; // 예: "2030 직장인"
}

export interface StoreProfile {
  chainBrand: ChainBrand;
  locationType: LocationType[];
  primaryCustomer: CustomerProfile;
  email: string;
  address?: string;
  cx?: number;
  cy?: number;
}

export interface ScoreBreakdown {
  trend: number;       // 0-100 (트렌드 모멘텀, 50%)
  locationFit: number; // 0-100 (상권 적합도, 30%)
  demographic: number; // 0-100 (소비층 일치도, 20%)
}

export interface Prediction {
  fitScore: number; // 0-100
  scoreBreakdown: ScoreBreakdown;
  reasons: string[];
  insight?: string; // LLM의 자체 판단 코멘트
}
