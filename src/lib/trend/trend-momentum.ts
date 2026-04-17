import { Product } from './types';

// 현재 상품 풀(15개) 최대치 기준 정규화 기준값
// 실제 상품이 추가될 때 여유 있게 잡아둠
const REF = {
  snsMentions: 100_000,
  searchVolume: 100_000,
  commerceRankDelta: 60,
};

const WEIGHTS = { sns: 0.4, search: 0.4, rank: 0.2 };

export function calcTrendMomentum(product: Product): number {
  const { snsMentions, searchVolume, commerceRankDelta } = product.trendSignals;
  const snsNorm = Math.min(1, snsMentions / REF.snsMentions);
  const searchNorm = Math.min(1, searchVolume / REF.searchVolume);
  // rankDelta는 음수가 될 수 없으므로 0 클램프
  const rankNorm = Math.min(1, Math.max(0, commerceRankDelta) / REF.commerceRankDelta);
  return Math.round(
    (snsNorm * WEIGHTS.sns + searchNorm * WEIGHTS.search + rankNorm * WEIGHTS.rank) * 100
  );
}
