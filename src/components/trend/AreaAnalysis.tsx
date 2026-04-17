'use client';

import { AreaAnalysis as AreaAnalysisType } from '@/lib/trend/area-analysis';

interface Props {
  address: string;
  analysis: AreaAnalysisType | null;
  loading: boolean;
}

const INDUSTRY_COLORS: Record<string, string> = {
  '음식': 'bg-warning-500',
  '소매': 'bg-primary-400',
  '과학': 'bg-primary-400',
  '교육': 'bg-success-500',
  '생활': 'bg-purple-400',
  '숙박': 'bg-pink-400',
  '주점': 'bg-danger-500',
  '부동산': 'bg-yellow-400',
  '금융': 'bg-cyan-400',
};

function getColor(name: string) {
  for (const [key, color] of Object.entries(INDUSTRY_COLORS)) {
    if (name.includes(key)) return color;
  }
  return 'bg-grey-300';
}

export default function AreaAnalysis({ address, analysis, loading }: Props) {
  if (loading || !analysis || analysis.dataSource === 'fallback' || !analysis.industries.length) {
    return null;
  }

  const top5 = analysis.industries.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-grey-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-grey-700">
            📊 매장 주변 상권 분석
          </h3>
          <p className="text-xs text-grey-400 mt-0.5 truncate max-w-[200px]">{address}</p>
          <p className="text-xs text-grey-400">500m 반경 · 총 {analysis.totalStores.toLocaleString()}개 점포</p>
        </div>
        <span className="text-xs text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
          AI 분석
        </span>
      </div>

      {/* 소분류 핵심 시그널 */}
      {(() => {
        const s = analysis.signals;
        const chips = [
          s.convenienceStores > 0 && { label: `편의점 ${s.convenienceStores}개`, color: 'bg-primary-100 text-blue-700', icon: '🏪' },
          s.bars > 0 && { label: `주점·호프 ${s.bars}개`, color: 'bg-danger-100 text-danger-700', icon: '🍺' },
          s.cafes > 0 && { label: `카페 ${s.cafes}개`, color: 'bg-warning-100 text-warning-300', icon: '☕' },
          s.academies > 0 && { label: `학원 ${s.academies}개`, color: 'bg-success-100 text-success-600', icon: '📚' },
          s.restaurants > 0 && { label: `음식점 ${s.restaurants}개`, color: 'bg-warning-100 text-warning-300', icon: '🍽️' },
        ].filter(Boolean) as { label: string; color: string; icon: string }[];

        return chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {chips.map((c) => (
              <span key={c.label} className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.color}`}>
                {c.icon} {c.label}
              </span>
            ))}
          </div>
        ) : null;
      })()}

      <p className="text-xs text-grey-300 mt-3 pt-3 border-t border-grey-200">
        AI 상권 분석 결과예요
      </p>
    </div>
  );
}
