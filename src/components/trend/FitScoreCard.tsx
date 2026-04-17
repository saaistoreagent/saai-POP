'use client';

import { Product } from '@/lib/trend/types';

interface Props {
  fitScore: number;
  product: Product;
  storeName: string;
}

function getScoreMeta(score: number) {
  if (score >= 85) return { stroke: '#00C781', text: 'text-success-600', bg: 'bg-success-100', verdict: '추천해요', sentiment: '매우 잘 맞아요', labelColor: 'text-success-600' };
  if (score >= 70) return { stroke: '#00C781', text: 'text-success-600', bg: 'bg-success-100', verdict: '추천해요', sentiment: '잘 맞아요', labelColor: 'text-success-600' };
  if (score >= 55) return { stroke: '#FFBB38', text: 'text-warning-300', bg: 'bg-warning-100', verdict: '테스트 발주 해보세요', sentiment: '괜찮아요', labelColor: 'text-warning-300' };
  if (score >= 40) return { stroke: '#FF8A3C', text: 'text-danger-500', bg: 'bg-danger-100', verdict: '이번엔 넘기세요', sentiment: '약해요', labelColor: 'text-danger-500' };
  return { stroke: '#FF4040', text: 'text-danger-500', bg: 'bg-danger-100', verdict: '이번엔 넘기세요', sentiment: '안 맞아요', labelColor: 'text-danger-500' };
}

export default function FitScoreCard({ fitScore, product, storeName }: Props) {
  const { stroke, text, bg, verdict, sentiment, labelColor } = getScoreMeta(fitScore);

  // SVG 원형 게이지
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (fitScore / 100) * circumference;

  return (
    <div className={`rounded-2xl ${bg} p-6 text-center`}>
      <p className="text-sm text-grey-500 mb-5">{storeName} 매장 기준 적합도</p>

      {/* 원형 게이지 */}
      <div className="flex justify-center mb-4">
        <div className="relative w-36 h-36">
          <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={stroke}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-black ${text}`}>{fitScore}</span>
            <span className="text-xs text-grey-400 font-medium">/ 100</span>
          </div>
        </div>
      </div>

      <p className={`text-sm font-semibold ${labelColor} mb-1`}>{sentiment}</p>
      <p className={`text-lg font-bold ${labelColor}`}>{verdict}</p>
    </div>
  );
}
