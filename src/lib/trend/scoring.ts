import { Product, StoreProfile, Prediction, ScoreBreakdown } from './types';
import { getLocationAffinity } from '../../data/trend/location-affinity';
import { NaverDemographic } from './naver-datalab';
import { AreaAnalysis, calcAreaScore } from './area-analysis';
import { evaluateRestriction } from './age-restriction';

function generateReasons(
  store: StoreProfile,
  product: Product,
  locationScore: number,
  semasAnalysis?: AreaAnalysis | null
): string[] {
  const reasons: string[] = [];

  if (semasAnalysis?.dataSource === 'kakao' && semasAnalysis.signals) {
    const s = semasAnalysis.signals;
    const parts: string[] = [];

    if (product.category === '주류' && s.bars > 0) parts.push(`주점·호프 ${s.bars}개`);
    if ((product.category === '스낵' || product.category === '디저트') && s.academies > 0) parts.push(`학원 ${s.academies}개`);
    if (product.category === '음료' && s.cafes > 0) parts.push(`카페 ${s.cafes}개`);
    if (s.convenienceStores > 0) parts.push(`편의점 ${s.convenienceStores}개`);

    if (parts.length > 0 && locationScore >= 65) {
      const competitor = s.convenienceStores > 3 ? ` 경쟁은 있지만` : '';
      reasons.push(`반경 500m 내 ${parts.join(', ')} —${competitor} ${product.category} 수요가 뒷받침돼요.`);
    } else if (parts.length > 0 && locationScore < 50) {
      reasons.push(`반경 500m 내 ${parts.join(', ')} — ${product.category} 판매 환경이 불리해요.`);
    }
  } else {
    const locationLabel = Array.isArray(store.locationType)
      ? store.locationType.join('·')
      : store.locationType;
    if (locationScore >= 85) {
      reasons.push(`${locationLabel} 상권에서 ${product.category}는 가장 잘 팔리는 카테고리 중 하나예요.`);
    } else if (locationScore >= 65) {
      reasons.push(`${locationLabel} 상권에서 ${product.category} 판매 성과가 좋아요.`);
    } else if (locationScore < 50) {
      reasons.push(`${locationLabel} 상권에서 ${product.category}는 상대적으로 수요가 적어요.`);
    }
  }

  return reasons;
}

export function calculateFitScore(
  store: StoreProfile,
  product: Product,
  _naverDemo?: NaverDemographic | null,
  semasAnalysis?: AreaAnalysis | null
): Prediction {
  const restriction = evaluateRestriction(product.category, store.locationType);

  const staticLocationFit = Math.round(getLocationAffinity(store.locationType, product.category) * 100);
  const locationFit =
    semasAnalysis?.dataSource === 'kakao'
      ? Math.round(
          staticLocationFit * 0.5 +
          calcAreaScore(semasAnalysis, product.category) * (staticLocationFit / 100) * 0.5
        )
      : staticLocationFit;

  let fitScore = Math.min(locationFit, restriction.maxScore);

  const scoreBreakdown: ScoreBreakdown = {
    trend: 50,
    locationFit,
    demographic: 50,
  };

  const reasons = generateReasons(store, product, locationFit, semasAnalysis);
  if (restriction.restricted && restriction.reason) {
    reasons.unshift(restriction.reason);
  }

  return { fitScore, scoreBreakdown, reasons };
}
