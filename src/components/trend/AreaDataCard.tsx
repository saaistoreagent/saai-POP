'use client';

import { AreaAnalysis } from '@/lib/trend/area-analysis';
import { inferAreaCharacter } from '@/lib/trend/area-inference';
import { classifyConvenienceStores, classifySchools } from '@/lib/trend/kakao-local';
import { Category } from '@/lib/trend/types';

interface Props {
  analysis: AreaAnalysis | null;
  address?: string;
  category?: Category;
}

function formatDistance(m: number) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

export default function AreaDataCard({ analysis, address, category }: Props) {
  if (!analysis) {
    return (
      <div className="bg-white rounded-2xl border border-grey-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-grey-700">📍 주변 랜드마크</h3>
          <span className="text-xs text-grey-400">반경 500m</span>
        </div>
        <p className="text-sm text-grey-300 text-center py-4">상권 데이터 불러오는 중...</p>
      </div>
    );
  }

  if (analysis.dataSource === 'fallback') {
    return (
      <div className="bg-white rounded-2xl border border-grey-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-grey-700">📍 주변 랜드마크</h3>
          <span className="text-xs text-grey-400">반경 500m</span>
        </div>
        <p className="text-sm text-grey-300 text-center py-4">주변 상권 데이터를 불러오지 못했어요</p>
      </div>
    );
  }

  const { landmarks, totalStores, signals } = analysis;
  const inference = inferAreaCharacter(signals, totalStores);
  const schools = classifySchools(landmarks.schools);
  const cvs = classifyConvenienceStores(landmarks.convenienceStores);
  const chainEntries = Object.entries(cvs.chains);

  const nearestSubway = landmarks.subway[0];
  const nearestElementary = schools.elementary[0];
  const nearestUniversity = schools.university[0];
  const nearestMart = landmarks.marts[0];
  const nearestTourism = landmarks.tourism[0];

  return (
    <div className="bg-white rounded-2xl border border-grey-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-grey-700">📍 주변 랜드마크</h3>
        <span className="text-xs text-grey-400">반경 500m · Kakao Local</span>
      </div>
      {address && <p className="text-xs text-grey-400 mb-4">{address}</p>}

      {/* 상권 특성 배지 */}
      {inference.characters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {inference.characters.map((c) => (
            <span key={c.label} className="text-xs font-bold text-primary-700 bg-primary-100 px-2 py-1 rounded-full">
              {c.label}
            </span>
          ))}
        </div>
      )}

      {/* 핵심 랜드마크 (가장 가까운 것) */}
      <div className="flex flex-col gap-2 mb-4">
        {nearestSubway && (
          <LandmarkRow icon="🚇" label="가장 가까운 지하철" name={nearestSubway.name} distance={nearestSubway.distanceMeters} />
        )}
        {nearestElementary && (
          <LandmarkRow icon="🏫" label="가장 가까운 초등학교" name={nearestElementary.name} distance={nearestElementary.distanceMeters} emphasize={category === '주류'} />
        )}
        {nearestUniversity && !nearestElementary && (
          <LandmarkRow icon="🎓" label="가장 가까운 대학교" name={nearestUniversity.name} distance={nearestUniversity.distanceMeters} />
        )}
        {nearestMart && (
          <LandmarkRow icon="🛒" label="가장 가까운 대형마트" name={nearestMart.name} distance={nearestMart.distanceMeters} />
        )}
        {nearestTourism && (
          <LandmarkRow icon="📸" label="가장 가까운 관광명소" name={nearestTourism.name} distance={nearestTourism.distanceMeters} />
        )}
      </div>

      {/* 경쟁 편의점 */}
      {landmarks.convenienceStores.length > 0 && (
        <div className="pt-3 border-t border-grey-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-grey-500">경쟁 편의점 {landmarks.convenienceStores.length}곳</p>
            {inference.isCompetitive && (
              <span className="text-xs text-warning-500">⚠️ 경쟁 많음</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chainEntries.map(([chain, places]) => (
              <span key={chain} className="text-xs text-grey-600 bg-grey-100 px-2 py-1 rounded-lg">
                {chain} {places.length}
              </span>
            ))}
            {cvs.independents.length > 0 && (
              <span className="text-xs text-grey-600 bg-grey-100 px-2 py-1 rounded-lg">
                기타 {cvs.independents.length}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 주변 업종 요약 (간단) */}
      <div className="pt-3 mt-3 border-t border-grey-100 grid grid-cols-3 gap-2">
        <CountCell label="음식점" count={signals.restaurants} />
        <CountCell label="카페" count={signals.cafes} />
        <CountCell label="학원" count={signals.academies} />
        <CountCell label="병원" count={signals.hospitals} />
        <CountCell label="공공기관" count={signals.publicOffices} />
        <CountCell label="문화시설" count={signals.cultureVenues} />
      </div>

      <p className="text-xs text-grey-300 mt-3">* Kakao 장소 데이터 기반이에요. 점주님이 더 잘 아실 수 있어요</p>
    </div>
  );
}

function LandmarkRow({
  icon, label, name, distance, emphasize = false,
}: {
  icon: string; label: string; name: string; distance: number; emphasize?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 px-3 rounded-lg ${emphasize ? 'bg-warning-100' : 'bg-grey-50'}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base">{icon}</span>
        <div className="min-w-0">
          <p className="text-xs text-grey-400">{label}</p>
          <p className="text-sm font-semibold text-grey-700 truncate">{name}</p>
        </div>
      </div>
      <span className="text-xs font-bold text-grey-600 whitespace-nowrap ml-2">{formatDistance(distance)}</span>
    </div>
  );
}

function CountCell({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex flex-col items-center bg-grey-50 rounded-lg py-2">
      <span className="text-xs text-grey-500">{label}</span>
      <span className="text-sm font-bold text-grey-800">{count}</span>
    </div>
  );
}
