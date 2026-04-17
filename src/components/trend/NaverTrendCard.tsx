'use client';

import { NaverDemographic } from '@/lib/trend/naver-datalab';

interface Props {
  naverDemo: NaverDemographic | null;
  loading: boolean;
}

export default function NaverTrendCard({ naverDemo, loading }: Props) {
  const femaleRatio = naverDemo ? Math.round(naverDemo.femaleRatio * 100) : null;
  const maleRatio = femaleRatio !== null ? 100 - femaleRatio : null;
  const ageRange = naverDemo?.dominantAgeRange;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-grey-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-grey-700">🔍 네이버 검색 데이터</h3>
        </div>
        <p className="text-sm text-grey-300 text-center py-4">불러오는 중...</p>
      </div>
    );
  }

  if (!naverDemo || naverDemo.dataSource === 'fallback') {
    return (
      <div className="bg-white rounded-2xl border border-grey-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-grey-700">🔍 네이버 검색 데이터</h3>
        </div>
        <p className="text-sm text-grey-300 text-center py-4">데이터를 불러오지 못했어요</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-grey-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-grey-700">🔍 네이버 검색 데이터</h3>
        <span className="text-xs text-grey-400">최근 2주 기준</span>
      </div>

      <div className="flex flex-col gap-4">
        {/* 검색 성별 비율 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-grey-500">검색 성별 비율</span>
            <span className="text-xs text-grey-400">여 {femaleRatio}% · 남 {maleRatio}%</span>
          </div>
          <div className="h-2 rounded-full bg-grey-100 overflow-hidden flex">
            <div className="h-full bg-pink-400 transition-all duration-700" style={{ width: `${femaleRatio}%` }} />
            <div className="h-full bg-blue-400 transition-all duration-700" style={{ width: `${maleRatio}%` }} />
          </div>
        </div>

        {/* 주 검색 연령대 */}
        {ageRange && (
          <div className="flex items-center justify-between py-2.5 border-t border-grey-100">
            <span className="text-sm text-grey-500">주 검색 연령대</span>
            <span className="text-sm font-bold text-grey-800">{ageRange[0]}~{ageRange[1]}세</span>
          </div>
        )}
      </div>

      <p className="text-xs text-grey-300 mt-3">* 구매자가 아닌 검색자 기준이에요</p>
    </div>
  );
}
