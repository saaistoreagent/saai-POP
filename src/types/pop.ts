// POP 유형
export type POPCategory = 'badge' | 'countdown' | 'price' | 'promo' | 'strip' | 'product';

// 행사 배지 유형
export type BadgeType = '없음' | '1+1' | '2+1' | '3+1' | '덤증정' | string;

// 형태 변형 (일반 / 가로형)
export type POPShape = 'normal' | 'wide';

// 행사 종류
export type PromoType = 'discount' | 'bundle' | 'nplusn';

export interface POPSize {
  width: number;
  height: number;
  perA4: number;
  cols: number;
  rows: number;
}

// A4 = 794 x 1123 px (96dpi 기준)
export const POP_SIZES: Record<POPCategory, Record<POPShape, POPSize>> = {
  badge: {
    normal: { width: 264, height: 160, perA4: 21, cols: 3, rows: 7 },
    wide:   { width: 397, height: 140, perA4: 16, cols: 2, rows: 8 },
  },
  countdown: {
    normal: { width: 264, height: 224, perA4: 15, cols: 3, rows: 5 },
    wide:   { width: 397, height: 160, perA4: 14, cols: 2, rows: 7 },
  },
  price: {
    normal: { width: 794, height: 140, perA4: 8,  cols: 1, rows: 8 },
    wide:   { width: 794, height: 140, perA4: 8,  cols: 1, rows: 8 },
  },
  promo: {
    normal: { width: 794, height: 1123, perA4: 1, cols: 1, rows: 1 },
    wide:   { width: 794, height: 1123, perA4: 1, cols: 1, rows: 1 },
  },
  strip: {
    normal: { width: 794, height: 187, perA4: 6,  cols: 1, rows: 6 },
    wide:   { width: 794, height: 80,  perA4: 14, cols: 1, rows: 14 },
  },
  product: {
    normal: { width: 794, height: 561, perA4: 2,  cols: 1, rows: 2 },
    wide:   { width: 794, height: 374, perA4: 3,  cols: 1, rows: 3 },
  },
};

export const POP_CATEGORY_LABELS: Record<POPCategory, string> = {
  badge: '행사 배지',
  countdown: '수량 카운트',
  price: '가격/할인 POP',
  promo: '특가 행사 POP',
  strip: '띠지 (선반 태그)',
  product: '상품 홍보 POP',
};

export const POP_CATEGORY_DESCRIPTIONS: Record<POPCategory, string> = {
  badge: '1+1, 2+1, 3+1 행사 배지',
  countdown: '마지막 3개, 2개, 1개 카운트다운',
  price: '상품 가격/할인 안내 POP',
  promo: '대형 특가 행사 홍보물 (A4 풀)',
  strip: '선반 부착용 띠지',
  product: '인기상품, 신상품, 추천, 카테고리 안내',
};

// 폼 데이터
export interface POPFormData {
  category: POPCategory;
  productName: string;
  price?: number;
  originalPrice?: number;
  discountPercent?: number;
  badgeType?: BadgeType;
  promoType?: PromoType;
  eventPeriod?: string;
  direction?: string;
  productImageUrl?: string;
}

// AI가 생성하는 결과
export interface POPGeneratedData {
  catchphrase: string;
  subCopy: string;
  bgTheme?: string;
  layout?: string;
  bgImage?: string | null;
  fullImage?: boolean;  // true면 bgImage가 완성된 POP (CSS 오버레이 불필요)
  color: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}
