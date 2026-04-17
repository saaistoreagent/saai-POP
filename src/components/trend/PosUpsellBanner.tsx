'use client';

export default function PosUpsellBanner() {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-gray-800 to-gray-700 p-5 text-white">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔗</span>
        <div className="flex-1">
          <p className="text-sm font-bold mb-1">POS 데이터 연동하면 더 정확해져요</p>
          <p className="text-xs text-grey-300 leading-relaxed mb-3">
            실제 매출 데이터를 연결하면 우리 매장 히스토리 기반으로 더 정교한 예측이 가능해요.
          </p>
          <button className="px-4 py-2 bg-white text-grey-800 rounded-lg text-xs font-bold hover:bg-grey-200 transition-colors">
            데이터 연동 알아보기 →
          </button>
        </div>
      </div>
    </div>
  );
}
