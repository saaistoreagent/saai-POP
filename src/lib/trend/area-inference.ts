import { AreaSignals } from './area-analysis';
import { Category } from './types';

export interface AreaCharacter {
  label: string;         // 예: "학원가"
  customerHint: string;  // 예: "방과후 학생 고객이 많은 편이에요"
  signal: string;        // 근거: "학원 8개"
}

export interface AreaInference {
  characters: AreaCharacter[]; // 감지된 상권 특성 (복수 가능)
  isCompetitive: boolean;      // 편의점 경쟁 여부
}

/** SEMAS 업종 카운트 → 상권 특성 추론 */
export function inferAreaCharacter(
  signals: AreaSignals,
  totalStores: number
): AreaInference {
  if (!totalStores) return { characters: [], isCompetitive: false };

  const r = (n: number) => n / totalStores;
  const characters: AreaCharacter[] = [];

  if (r(signals.academies) > 0.05) {
    characters.push({
      label: '학원가',
      customerHint: '방과후 학생·청소년 고객이 많은 편이에요',
      signal: `학원 ${signals.academies}개`,
    });
  }

  if (r(signals.bars) > 0.04) {
    characters.push({
      label: '유흥 상권',
      customerHint: '저녁 시간대 20~30대 직장인·MZ 수요가 있어요',
      signal: `주점·호프 ${signals.bars}개`,
    });
  }

  if (r(signals.restaurants) > 0.15) {
    characters.push({
      label: '식당가',
      customerHint: '점심·저녁 직장인 유동 인구가 많은 상권이에요',
      signal: `음식점 ${signals.restaurants}개`,
    });
  }

  if (r(signals.cafes) > 0.06) {
    characters.push({
      label: '카페 밀집',
      customerHint: '카페를 즐기는 20~40대, 특히 여성 고객 비중이 높아요',
      signal: `카페 ${signals.cafes}개`,
    });
  }

  if (signals.subwayStations > 0) {
    characters.push({
      label: '역세권',
      customerHint: '출퇴근·환승 유동인구가 높아요',
      signal: `지하철역 ${signals.subwayStations}곳`,
    });
  }

  if (signals.universities > 0) {
    characters.push({
      label: '대학가',
      customerHint: '대학생·자취생 수요가 중심이에요',
      signal: `대학교 ${signals.universities}곳`,
    });
  }

  if (signals.elementarySchools > 0) {
    characters.push({
      label: '초등학교 인근',
      customerHint: '학생 고객과 학부모 동반 방문이 많아요',
      signal: `초등학교 ${signals.elementarySchools}곳`,
    });
  }

  if (signals.marts + signals.cultureVenues >= 2) {
    characters.push({
      label: '쇼핑·문화 상권',
      customerHint: '주말 가족·친구 모임 고객 유동이 있어요',
      signal: `대형마트·문화시설 ${signals.marts + signals.cultureVenues}곳`,
    });
  }

  if (signals.tourism >= 2) {
    characters.push({
      label: '관광지',
      customerHint: '외지·단기 방문객과 즉석 소비가 활발해요',
      signal: `관광명소 ${signals.tourism}곳`,
    });
  }

  return {
    characters,
    isCompetitive: signals.convenienceStores >= 3,
  };
}

/** 상권 특성 + 카테고리 → 발주 근거 문장 */
export function buildAreaEvidence(
  inference: AreaInference,
  category: Category
): string[] {
  const evidence: string[] = [];

  for (const char of inference.characters) {
    const match = getCategoryMatch(char.label, category);
    if (match) {
      evidence.push(`${char.signal} → ${char.customerHint} → ${match}`);
    }
  }

  if (inference.isCompetitive) {
    evidence.push('근처 편의점이 3개 이상이에요. 경쟁이 있는 편이에요.');
  }

  return evidence;
}

function getCategoryMatch(areaLabel: string, category: Category): string | null {
  const map: Record<string, Partial<Record<Category, string>>> = {
    '학원가': {
      '디저트': '간식·디저트 수요와 잘 맞아요',
      '스낵':   '방과후 간식 수요와 잘 맞아요',
      '음료':   '공부하며 마실 음료 수요가 있어요',
      '주류':   '학생 고객층과 맞지 않아요',
    },
    '유흥 상권': {
      '주류':     '저녁 음주 수요와 잘 맞아요',
      '스낵':     '안주용 수요를 기대할 수 있어요',
      '즉석식품': '늦은 시간대 야식 수요가 있어요',
      '음료':     '주류에 비해 상대적으로 수요가 낮아요',
    },
    '식당가': {
      '즉석식품': '식사 대체 경쟁이 있어 수요가 낮을 수 있어요',
      '음료':     '식후 음료 수요를 기대할 수 있어요',
      '주류':     '회식·저녁 식사 연계 수요가 있어요',
    },
    '카페 밀집': {
      '디저트': '카페 감성 디저트 수요와 맞아요',
      '음료':   '카페 경쟁이 있어 편의점 음료 수요는 낮을 수 있어요',
    },
  };

  return map[areaLabel]?.[category] ?? null;
}
