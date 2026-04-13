/**
 * POP 레이아웃 프리셋
 * AI가 상품에 맞는 레이아웃을 자동 선택
 */

export type LayoutId = 'hero-top' | 'center-bold' | 'left-image' | 'split-diagonal' | 'bottom-heavy';

export interface LayoutDef {
  id: LayoutId;
  name: string;
  description: string;
}

export const layouts: LayoutDef[] = [
  {
    id: 'hero-top',
    name: '상단 히어로',
    description: '캐치프레이즈가 상단 전체를 차지, 상품+가격이 하단',
  },
  {
    id: 'center-bold',
    name: '중앙 강조',
    description: '캐치프레이즈가 화면 중앙에 초대형, 상품은 배경처럼',
  },
  {
    id: 'left-image',
    name: '좌측 이미지',
    description: '상품 이미지가 좌측 크게, 우측에 텍스트+가격',
  },
  {
    id: 'split-diagonal',
    name: '대각 분할',
    description: '상단 좌측 캐치프레이즈, 하단 우측 가격, 대각선 구도',
  },
  {
    id: 'bottom-heavy',
    name: '하단 집중',
    description: '상단 상품 이미지 크게, 하단에 캐치프레이즈+가격 집중',
  },
];
