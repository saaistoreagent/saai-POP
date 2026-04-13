export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  /** 프로모 상품 목록 (편의점 행사) */
  promoItems?: PromoItemData[];
  /** 생성된 POP 미리보기 표시 여부 */
  showPreview?: boolean;
  /** 로딩 상태 */
  loading?: boolean;
}

export interface PromoItemData {
  name: string;
  price: number;
  imageUrl?: string;
  badge?: string;
  store?: string;
}

/** AI가 대화에서 추출한 POP 데이터 */
export interface ExtractedPOPData {
  productName?: string;
  price?: number;
  originalPrice?: number;
  category?: string;       // price, promo, strip, product, badge, countdown
  badgeType?: string;      // 1+1, 2+1, 3+1, 없음
  direction?: string;      // 홍보 방향/컨셉
  catchphrase?: string;
  subCopy?: string;
  layout?: string;
  shape?: 'normal' | 'wide';  // 세로/가로
  colorPrimary?: string;
  bgPrompt?: string;
}

/** A4에 배치할 개별 POP 아이템 (생성 완료 상태) */
export interface POPItem {
  productName: string;
  price?: number;
  originalPrice?: number;
  badgeType?: string;
  catchphrase: string;
  subCopy: string;
  imageUrl?: string;        // 배경 제거된 상품 이미지
  bgImage?: string | null;  // AI 생성 배경
  fullImage?: boolean;      // true면 bgImage가 완성본
  bgTheme?: string;
  layout?: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

/** AI 채팅 응답 */
export interface ChatAIResponse {
  message: string;
  action?: 'generate' | 'modify' | 'add' | 'show_promos' | 'none';
  popData?: Partial<ExtractedPOPData>;
  /** 수정 대상 */
  modifyTarget?: 'catchphrase' | 'subCopy' | 'layout' | 'color' | 'background' | 'all';
  modifyValue?: string;
  /** 편의점 행사 요청 */
  promoRequest?: { store: string; type?: string };
}
