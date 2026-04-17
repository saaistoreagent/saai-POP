'use client';

import { ScoreBreakdown as ScoreBreakdownType } from '@/lib/trend/types';

interface Props {
  breakdown: ScoreBreakdownType;
  naverAvailable?: boolean;
}

function getBarColor(score: number) {
  if (score >= 75) return 'bg-success-500';
  if (score >= 55) return 'bg-warning-500';
  return 'bg-danger-500';
}

const AXES = [
  {
    key: 'trend' as const,
    label: '트렌드 모멘텀',
    emoji: '📈',
    badge: { label: 'SNS·검색 기반', color: 'text-primary-600 bg-primary-100' },
  },
  {
    key: 'locationFit' as const,
    label: '상권 적합도',
    emoji: '📍',
    badge: { label: 'AI 분석', color: 'text-primary-600 bg-primary-100' },
  },
  {
    key: 'demographic' as const,
    label: '소비층 일치도',
    emoji: '👥',
    badge: null,
  },
];

export default function ScoreBreakdown({ breakdown, naverAvailable }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-grey-200 p-5">
      <h3 className="text-sm font-bold text-grey-700 mb-4">분석 지표</h3>
      <div className="flex flex-col gap-4">
        {AXES.map((item) => {
          const score = breakdown[item.key];
          const isDemoWithoutNaver = item.key === 'demographic' && !naverAvailable;
          return (
            <div key={item.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{item.emoji}</span>
                  <span className="text-sm text-grey-600">{item.label}</span>
                  {item.badge && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item.badge.color}`}>
                      {item.badge.label}
                    </span>
                  )}
                  {isDemoWithoutNaver && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium text-grey-400 bg-grey-100">
                      상품 타겟 기준
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-grey-700">{score}</span>
              </div>
              <div className="h-2 bg-grey-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getBarColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
