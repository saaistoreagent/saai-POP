'use client';

import { Product } from '@/lib/trend/types';
import {
  getCategoryInsight,
  getUpcomingEvents,
  getCurrentSeason,
} from '@/data/trend/pos-insights';

interface Props {
  product: Product;
  fitScore: number;
}

// 0~100 점수로 게이지 위치 결정
function calcTimingScore(seasonIdx: number, eventDays: number | null): number {
  // 계절 지수: 0~80점 (seasonIdx 70~150 범위)
  const seasonScore = Math.max(0, Math.min(80, ((seasonIdx - 70) / 80) * 80));
  // 이벤트 근접도: 0~20점
  let eventScore = 0;
  if (eventDays !== null) {
    if (eventDays <= 7) eventScore = 20;
    else if (eventDays <= 14) eventScore = 16;
    else if (eventDays <= 21) eventScore = 12;
    else if (eventDays <= 60) eventScore = 6;
  }
  return Math.round(Math.min(100, seasonScore + eventScore));
}

const ZONES = [
  { label: '기다리기', from: 0,  to: 25,  activeColor: 'text-grey-500',   barColor: 'bg-grey-300' },
  { label: '소량 테스트', from: 25, to: 50, activeColor: 'text-primary-600',  barColor: 'bg-primary-400' },
  { label: '좋은 타이밍', from: 50, to: 75, activeColor: 'text-success-600', barColor: 'bg-success-500' },
  { label: '지금 발주',  from: 75, to: 100, activeColor: 'text-warning-300', barColor: 'bg-warning-500' },
] as const;

function getActiveZone(score: number) {
  return ZONES.find((z) => score >= z.from && score <= z.to) ?? ZONES[0];
}

export default function PosInsightCard({ product, fitScore }: Props) {
  const insight = getCategoryInsight(product.category);
  const currentSeason = getCurrentSeason();
  const upcomingEvents = getUpcomingEvents(product.category, 60);
  const nextEvent = upcomingEvents[0] ?? null;

  if (!insight) return null;

  const seasonIdx = insight.seasonIndex[currentSeason];
  const timingScore = calcTimingScore(seasonIdx, nextEvent?.daysUntil ?? null);
  const activeZone = getActiveZone(timingScore);

  // 이유 문장
  const reasons: { icon: string; text: string }[] = [];

  const seasonDiff = Math.abs(seasonIdx - 100);
  if (seasonIdx >= 110) {
    reasons.push({ icon: '📈', text: `${currentSeason}은 ${product.category} 성수기예요. 지난해 같은 시기에 연평균보다 ${seasonDiff}% 더 팔렸어요.` });
  } else if (seasonIdx >= 90) {
    reasons.push({ icon: '📊', text: `${currentSeason}은 ${product.category}가 연평균 수준으로 팔리는 시기예요. 지난해 연평균 대비 ±${seasonDiff}% 이내였어요.` });
  } else {
    reasons.push({ icon: '📉', text: `${currentSeason}은 ${product.category} 비수기예요. 지난해 같은 시기에 연평균보다 ${seasonDiff}% 덜 팔렸어요.` });
  }

  if (nextEvent) {
    const urgency = nextEvent.daysUntil <= 14 ? '지금 바로 발주해야' : `${nextEvent.daysUntil <= 21 ? '이번 주 안에' : '미리'} 발주해두면`;
    reasons.push({ icon: nextEvent.daysUntil <= 14 ? '🚨' : '💰', text: `${nextEvent.name}(${nextEvent.daysUntil}일 후)에 ${product.category} 매출이 전주 대비 +${nextEvent.boostPct}% 나와요. ${urgency} 그 수요를 잡을 수 있어요.` });
  }

  if (insight.weekendIndex < 60) {
    reasons.push({ icon: '🗓', text: `이 상권은 주말 손님이 평일의 ${insight.weekendIndex}%밖에 안 돼요. 재고 계획은 월~금 위주로 잡으세요.` });
  } else if (insight.fridayIndex >= 120) {
    reasons.push({ icon: '🗓', text: `금요일에 ${product.category}가 평일 평균보다 ${insight.fridayIndex - 100}% 더 팔려요. 목요일 재고 점검 루틴을 넣어두면 좋아요.` });
  }

  return (
    <div className="bg-white rounded-2xl border border-grey-200 p-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-grey-700">🧾 발주 타이밍 분석</h3>
          <p className="text-xs text-grey-400 mt-0.5">POS 실적 기반 · 삼성역 오피스가 2025</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-600 whitespace-nowrap">
          세븐일레븐 연동
        </span>
      </div>

      {/* ── 게이지 바 ── */}
      <div className="mb-5">
        {/* 바 + 니들 */}
        <div className="relative">
          {/* 풀 너비 그라디언트 바 */}
          <div className="h-3 rounded-full bg-gradient-to-r from-gray-300 via-blue-400 via-green-400 to-orange-400" />

          {/* 오른쪽 미도달 구간 — 흰 오버레이로 페이드 */}
          <div
            className="absolute top-0 right-0 h-3 rounded-r-full bg-white/75 transition-all duration-700"
            style={{ width: `${100 - timingScore}%` }}
          />

          {/* 니들 (흰 원) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-gray-600 rounded-full shadow-md transition-all duration-700"
            style={{ left: `${timingScore}%` }}
          />
        </div>

        {/* 구간 레이블 */}
        <div className="flex mt-2">
          {ZONES.map((z) => (
            <div key={z.label} className="flex-1 text-center">
              <span className={`text-xs ${z.label === activeZone.label ? `font-bold ${z.activeColor}` : 'text-grey-300'}`}>
                {z.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 근거 */}
      <div className="flex flex-col gap-3">
        {reasons.map((r, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="text-base flex-shrink-0 mt-0.5">{r.icon}</span>
            <p className="text-sm text-grey-600 leading-relaxed">{r.text}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-grey-300 mt-4 pt-3 border-t border-grey-200">
        출처: 세븐일레븐 POS · 2025년 155개 가설 검증 데이터
      </p>
    </div>
  );
}
