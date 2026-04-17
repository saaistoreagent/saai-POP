'use client';

import { Product, LocationType } from '@/lib/trend/types';
import { getCrowdStats, getMyFeedback } from '@/data/trend/crowd-data';

interface Props {
  product: Product;
  locationType: LocationType;
}

const LOCATION_LABEL: Record<LocationType, string> = {
  '오피스가': '오피스가',
  '역세권': '역세권',
  '학교앞-초중고': '학교앞 (초중고)',
  '학교앞-대학가': '학교앞 (대학가)',
  '주택가-가족': '주택가 (가족)',
  '주택가-고급': '주택가 (고급)',
  '주택가-신축': '주택가 (신축)',
  '주택가-1인가구': '주택가 (1인가구)',
  '유흥가': '유흥가',
  '관광지': '관광지',
  '병원/관공서': '병원·관공서',
  '교외 상권': '교외 상권',
};

export default function CrowdInsightCard({ product, locationType }: Props) {
  const stats = getCrowdStats(product.id, locationType);
  const myFeedback = getMyFeedback(product.id, locationType);

  if (!stats || stats.locationCount < 3) return null;

  const reorderPct = Math.round(stats.reorderRate * 100);
  const goodPct = stats.sentiment.total > 0
    ? Math.round((stats.sentiment.good / stats.sentiment.total) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-grey-200 p-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-grey-700">👥 비슷한 상권 점주 실적</h3>
          <p className="text-xs text-grey-400 mt-0.5">
            {LOCATION_LABEL[locationType]} 매장 {stats.locationCount}곳 발주 결과
          </p>
        </div>
        {myFeedback && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-success-100 text-success-600 whitespace-nowrap">
            내 후기 반영됨
          </span>
        )}
      </div>

      {/* 핵심 지표 2개 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* 재발주율 */}
        <div className="bg-bg-primary rounded-xl p-3.5">
          <p className="text-xs text-grey-500 mb-1">재발주율</p>
          <p className={`text-2xl font-black ${reorderPct >= 70 ? 'text-success-600' : reorderPct >= 55 ? 'text-warning-300' : 'text-grey-500'}`}>
            {reorderPct}%
          </p>
          <div className="mt-2 h-1.5 bg-grey-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${reorderPct >= 70 ? 'bg-success-500' : reorderPct >= 55 ? 'bg-warning-500' : 'bg-grey-400'}`}
              style={{ width: `${reorderPct}%` }}
            />
          </div>
          <p className="text-xs text-grey-400 mt-1.5">
            {stats.locationCount}곳 중 {Math.round(stats.locationCount * stats.reorderRate)}곳 재발주
          </p>
        </div>

        {/* 평균 첫 발주량 */}
        <div className="bg-bg-primary rounded-xl p-3.5">
          <p className="text-xs text-grey-500 mb-1">평균 첫 발주량</p>
          <p className="text-2xl font-black text-grey-800">{stats.avgFirstQty}<span className="text-sm font-normal text-grey-400 ml-1">개</span></p>
          <p className="text-xs text-grey-400 mt-3.5">
            {goodPct >= 65
              ? '잘 팔렸어요 응답이 많아요'
              : goodPct >= 45
              ? '반응이 보통이에요'
              : '판매 속도가 느린 편이에요'}
          </p>
        </div>
      </div>

      {/* 평가 분포 */}
      {stats.sentiment.total > 0 && (
        <div className="mb-4">
          <p className="text-xs text-grey-500 mb-2">발주 후 평가</p>
          <div className="flex flex-col gap-1.5">
            {[
              { label: '잘 팔렸어요', count: stats.sentiment.good, color: 'bg-success-500', emoji: '😊' },
              { label: '보통이에요', count: stats.sentiment.ok, color: 'bg-warning-300', emoji: '😐' },
              { label: '별로였어요', count: stats.sentiment.bad, color: 'bg-grey-300', emoji: '😕' },
            ].map((item) => {
              const pct = Math.round((item.count / stats.sentiment.total) * 100);
              return (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-xs w-3">{item.emoji}</span>
                  <span className="text-xs text-grey-500 w-20">{item.label}</span>
                  <div className="flex-1 h-1.5 bg-grey-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-grey-400 w-8 text-right">{item.count}명</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 후기 */}
      {stats.quotes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-grey-500">점주 후기</p>
          {stats.quotes.map((q, i) => (
            <div key={i} className="bg-bg-primary rounded-xl px-3.5 py-2.5">
              <p className="text-xs text-grey-700 leading-relaxed">"{q.text}"</p>
              <p className="text-xs text-grey-400 mt-1">{LOCATION_LABEL[q.locationType]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
