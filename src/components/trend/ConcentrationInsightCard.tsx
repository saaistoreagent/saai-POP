'use client';

/**
 * 2-4-D. 조건 별 노출 문구
 *
 * phase / 충족 조건에 따라 최대 2줄의 인사이트 문구를 노출합니다.
 *
 * 조건:
 *   A  = 시간대 집중  (항상 존재)
 *   B  = 집중 감점 폴리곤 (2-4-B)
 *   C  = 복수 폴리곤 동일 카테고리 집중 (2-4-C)
 *
 * phase2 + A+B      → 1줄
 * phase2 + A+B+C    → 2줄
 * phase2 + A+C      → 1줄 (B 없음)
 * phase1 + A만      → 1줄
 */

export type Phase = 'phase1' | 'phase2';

interface Props {
  phase: Phase;
  /** 조건 B: 집중 감점 폴리곤 존재 여부 */
  hasB: boolean;
  /** 조건 C: 동일 카테고리 집중 여부 */
  hasC: boolean;
  /** 주요 문제 시간대 시작 (0–23) */
  startHour: number;
  /** 주요 문제 시간대 종료 (0–23) */
  endHour: number;
  /** 집중 감점 폴리곤 이름 (B 조건용) */
  polygonName?: string;
  /** 집중 카테고리 이름 */
  category?: string;
  /** B+C 조건: 해당 polygonName 외 동일 카테고리 문제 구역 수 */
  otherPolygonCount?: number;
}

function pad(h: number) {
  return String(h).padStart(2, '0');
}

function timeRange(start: number, end: number) {
  return `${pad(start)}~${pad(end)}시`;
}

export default function ConcentrationInsightCard({
  phase,
  hasB,
  hasC,
  startHour,
  endHour,
  polygonName = '',
  category = '',
  otherPolygonCount = 0,
}: Props) {
  const time = timeRange(startHour, endHour);

  /** phase2 + A+B+C */
  const isABC = phase === 'phase2' && hasB && hasC;
  /** phase2 + A+B (C 없음) */
  const isAB = phase === 'phase2' && hasB && !hasC;
  /** phase2 + A+C (B 없음) */
  const isAC = phase === 'phase2' && !hasB && hasC;
  /** phase1 + A만 */
  const isAOnly = phase === 'phase1' && !hasB && !hasC;

  let line1 = '';
  let line2 = '';

  if (isABC) {
    line1 = `${time}가 주요 문제 시간대입니다. '${polygonName}' 의 ${category}에 신경써 주세요.`;
    line2 = `'${polygonName}' 외 ${otherPolygonCount}개 구역에서 ${category} 문제가 많았습니다.`;
  } else if (isAB) {
    line1 = `${time}가 주요 문제 시간대입니다. '${polygonName}' 의 ${category}에 신경써 주세요.`;
  } else if (isAC) {
    line1 = `${time}가 주요 문제 시간대입니다. ${category} 쪽 문제가 많았습니다.`;
  } else if (isAOnly) {
    line1 = `${time}가 주요 문제 시간대입니다.`;
  }

  if (!line1) return null;

  const conditionLabel =
    isABC ? 'A + B + C' :
    isAB  ? 'A + B' :
    isAC  ? 'A + C' :
    'A만';

  return (
    <div className="bg-white rounded-2xl border border-grey-200 p-4 flex flex-col gap-2">
      {/* 배지 영역 */}
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            phase === 'phase2'
              ? 'bg-success-100 text-success-600'
              : 'bg-grey-100 text-grey-500'
          }`}
        >
          {phase}
        </span>
        <span className="text-xs text-grey-400">{conditionLabel}</span>
      </div>

      {/* 문구 영역 */}
      <div className="flex flex-col gap-1">
        <p className="text-sm text-grey-800 leading-relaxed">{line1}</p>
        {line2 && (
          <p className="text-sm text-grey-800 leading-relaxed">{line2}</p>
        )}
      </div>
    </div>
  );
}
