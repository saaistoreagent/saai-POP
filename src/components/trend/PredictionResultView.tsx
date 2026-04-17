'use client';

import { useEffect, useState } from 'react';
import { fetchProductById, CATEGORY_EMOJI } from '@/data/trend/products';
import { StoreProfile, Prediction } from '@/lib/trend/types';
import { calculateFitScore } from '@/lib/trend/scoring';
import { predictFit, peekCachedPrediction } from '@/lib/trend/llm-prediction';
import { fetchGenderDemographic, enrichWithAge, NaverDemographic } from '@/lib/trend/naver-datalab';
import { fetchAreaAnalysis, AreaAnalysis, emptyAreaAnalysis } from '@/lib/trend/area-analysis';
import NaverTrendCard from './NaverTrendCard';
import AreaDataCard from './AreaDataCard';
import CrowdInsightCard from './CrowdInsightCard';
import { getMyFeedback } from '@/data/trend/crowd-data';

const STORE_KEY = 'storeProfile';

interface ViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  productId?: string;
}

export default function PredictionResultView({ onNavigate, productId = '' }: ViewProps) {
  const savedProfile = localStorage.getItem(STORE_KEY);
  const store: StoreProfile | null = savedProfile ? JSON.parse(savedProfile) : null;

  const [product, setProduct] = useState<import('@/lib/trend/types').Product | null>(null);
  const [naverDemo, setNaverDemo] = useState<NaverDemographic | null>(null);
  const [naverLoading, setNaverLoading] = useState(true);
  const [semasAnalysis, setSemasAnalysis] = useState<AreaAnalysis | null>(null);
  const [llmLoading, setLlmLoading] = useState(true);
  const [llmDone, setLlmDone] = useState(false);
  const [llmError, setLlmError] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  useEffect(() => {
    fetchProductById(productId).then((p) => {
      setProduct(p);
      if (p && store) {
        // 캐시 히트 시 스피너 없이 바로 결과 표시
        const cached = peekCachedPrediction(store, p);
        if (cached) {
          setPrediction(cached);
          setLlmDone(true);
          setLlmLoading(false);
        } else {
          // 룰 기반 점수는 내부 상태 초기값으로만 세팅, UI는 스피너 유지
          setPrediction(calculateFitScore(store, p, null, null));
        }
      }
    });
  }, [productId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  useEffect(() => {
    if (!product || !store) return;

    // 2차: 네이버 + SEMAS 병렬 fetch → 완료 후 LLM 호출
    let cancelled = false;
    let latestNaver: NaverDemographic | null = null;
    let latestSemas: AreaAnalysis | null = null;
    let naverDone = false;
    let semasAttempted = !store.cx || !store.cy; // 좌표 없으면 즉시 완료 처리

    const refresh = () => {
      if (cancelled) return;
      // LLM 결과가 이미 있으면 룰 기반 점수로 덮어쓰지 않음
      if (llmDone) return;
      setPrediction(calculateFitScore(store, product, latestNaver, latestSemas));
    };

    const tryLLM = () => {
      if (!naverDone || !semasAttempted || cancelled) return;
      // 이미 캐시로 완료된 경우 스킵
      if (llmDone) return;
      setLlmLoading(true);
      setLlmError(false);
      predictFit(store, product, latestNaver, latestSemas)
        .then((result) => { if (!cancelled) setPrediction(result); })
        .catch(() => { if (!cancelled) setLlmError(true); })
        .finally(() => { if (!cancelled) { setLlmLoading(false); setLlmDone(true); } });
    };

    const timeout = (ms: number) =>
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

    // PB 브랜드(체인명)는 키워드로 쓰면 편의점 전체 검색량이 섞여 의미없어짐 → 상품명만 사용
    const CHAIN_BRANDS = new Set(['CU', 'GS25', '세븐일레븐', '이마트24', '미니스톱']);
    const naverKeywords = CHAIN_BRANDS.has(product.brand)
      ? [product.name]
      : [product.name, product.brand];

    // 1단계: 성별 (3초 제한)
    Promise.race([fetchGenderDemographic(naverKeywords), timeout(3000)])
      .then((demo) => {
        latestNaver = demo as NaverDemographic;
        setNaverDemo(latestNaver);
        refresh();
        // 2단계: 연령대 (추가 3초 제한)
        return Promise.race([enrichWithAge(naverKeywords, latestNaver!, product.category), timeout(3000)]);
      })
      .then((demo) => {
        latestNaver = demo as NaverDemographic;
        setNaverDemo(latestNaver);
        refresh();
      })
      .catch(() => {})
      .finally(() => {
        setNaverLoading(false);
        naverDone = true;
        tryLLM();
      });

    if (store.cx && store.cy) {
      Promise.race([fetchAreaAnalysis(store.cx, store.cy), timeout(5000)])
        .then((analysis) => {
          latestSemas = analysis as AreaAnalysis;
          setSemasAnalysis(latestSemas);
          refresh();
        })
        .catch(() => {
          setSemasAnalysis(emptyAreaAnalysis());
        })
        .finally(() => {
          semasAttempted = true;
          tryLLM();
        });
    } else {
      // 좌표 없으면 폴백 상태로 설정 (로딩 무한 루프 방지)
      setSemasAnalysis(emptyAreaAnalysis());
    }
    return () => { cancelled = true; };
  }, [product]);

  if (!product || !store || !prediction) {
    return (
      <div className="h-full bg-bg-primary flex flex-col items-center justify-center gap-4 p-5">
        <p className="text-grey-500 text-sm">정보를 불러올 수 없어요.</p>
        <button
          onClick={() => onNavigate('landing')}
          className="px-6 py-3 bg-primary-500 text-white rounded-xl text-sm font-bold"
        >
          처음으로
        </button>
      </div>
    );
  }

  return (
    <div className="h-full bg-bg-primary">
      {/* 헤더 */}
      <header className="bg-white border-b border-grey-200 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('landing')}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-grey-200 transition-colors text-grey-500"
            >
              ←
            </button>
            <span className="text-sm font-bold text-grey-800">적합도 결과</span>
          </div>

          <span className="text-xs text-grey-500 font-medium flex items-center gap-1.5">
            {llmLoading && (
              <span className="inline-block w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            )}
            {store.chainBrand} · {Array.isArray(store.locationType) ? store.locationType.join('·') : store.locationType}
          </span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-6 flex flex-col gap-4">
        {/* 상품명 */}
        <div>
          <p className="text-lg font-black text-grey-900">
            {product.name}
          </p>
          <p className="text-xs text-grey-400 mt-0.5">{product.brand} · {product.category}</p>
        </div>

        {/* 판정 카드 */}
            {llmLoading ? (
              /* 로딩 상태 — LLM API 호출 중일 때만 */
              <div className="rounded-2xl p-5 bg-white border border-grey-200">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                    <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                  </div>
                  <div>
                    <p className="text-xs text-grey-400 mb-1">
                      {store.chainBrand} · {Array.isArray(store.locationType) ? store.locationType.join('·') : store.locationType} 기준
                    </p>
                    <p className="text-sm font-bold text-grey-700">발주 추천 이유 분석 중이에요!</p>
                    <p className="text-xs text-grey-400 mt-0.5">상권·검색 데이터를 함께 분석하고 있어요</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 pt-4 border-t border-grey-100">
                  <div className="h-3.5 bg-grey-100 rounded-full animate-pulse w-full" />
                  <div className="h-3.5 bg-grey-100 rounded-full animate-pulse w-5/6" />
                  <div className="h-3.5 bg-grey-100 rounded-full animate-pulse w-4/6 mb-2" />
                  <div className="h-px bg-grey-100 my-1" />
                  <div className="h-3 bg-grey-100 rounded-full animate-pulse w-16 mb-1" />
                  <div className="h-3.5 bg-grey-100 rounded-full animate-pulse w-full" />
                  <div className="h-3.5 bg-grey-100 rounded-full animate-pulse w-5/6" />
                </div>
              </div>
            ) : llmError ? (
              /* LLM 실패 — 재시도 안내 */
              <div className="rounded-2xl p-5 bg-white border border-grey-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 flex items-center justify-center flex-shrink-0 text-3xl">⚠️</div>
                  <div>
                    <p className="text-sm font-bold text-grey-700 mb-0.5">AI 분석을 잠시 못 했어요</p>
                    <p className="text-xs text-grey-400">요청이 많아 잠시 후 다시 시도해보세요.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!product || !store) return;
                    setLlmLoading(true);
                    setLlmError(false);
                    predictFit(store, product, naverDemo, semasAnalysis)
                      .then((result) => setPrediction(result))
                      .catch(() => setLlmError(true))
                      .finally(() => setLlmLoading(false));
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition-colors"
                >
                  다시 분석하기
                </button>
              </div>
            ) : (
              /* 결과 상태 */
              <div className={`rounded-2xl p-5 ${
                prediction.fitScore >= 75 ? 'bg-success-100' :
                prediction.fitScore >= 55 ? 'bg-warning-100' : 'bg-danger-100'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                      <circle
                        cx="32" cy="32" r="26" fill="none"
                        stroke={prediction.fitScore >= 75 ? '#00C781' : prediction.fitScore >= 55 ? '#FFBB38' : '#FF4040'}
                        strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 26}
                        strokeDashoffset={2 * Math.PI * 26 * (1 - prediction.fitScore / 100)}
                        style={{ transition: 'stroke-dashoffset 1s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-lg font-black ${
                        prediction.fitScore >= 75 ? 'text-success-600' :
                        prediction.fitScore >= 55 ? 'text-warning-300' : 'text-danger-500'
                      }`}>{prediction.fitScore}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-grey-500 mb-0.5">
                      {store.chainBrand} · {Array.isArray(store.locationType) ? store.locationType.join('·') : store.locationType} 기준
                    </p>
                    <p className={`text-lg font-black ${
                      prediction.fitScore >= 70 ? 'text-success-600' :
                      prediction.fitScore >= 55 ? 'text-warning-300' : 'text-danger-500'
                    }`}>
                      {prediction.fitScore >= 70 ? '✅ 추천해요' :
                       prediction.fitScore >= 55 ? '🤔 테스트 발주 해보세요' : '❌ 이번엔 넘기세요'}
                    </p>
                  </div>
                </div>

                {prediction.reasons.length > 0 && (
                  <div className="flex flex-col gap-2 pt-4 border-t border-black/10">
                    {prediction.reasons.map((reason, i) => (
                      <p key={i} className="text-sm text-grey-700 leading-relaxed">{reason}</p>
                    ))}
                  </div>
                )}

                {prediction.insight && (
                  <div className="mt-3 pt-3 border-t border-black/10">
                    <p className="text-xs font-bold text-grey-400 mb-1.5">AI 한마디</p>
                    <p className="text-sm text-grey-700 leading-relaxed">{prediction.insight}</p>
                  </div>
                )}
              </div>
            )}

            {/* AI가 참고한 데이터 */}
            <p className="text-xs font-bold text-grey-400 px-1 -mb-1">AI가 참고한 데이터</p>

            <AreaDataCard
              analysis={semasAnalysis}
              address={store.address}
              category={product.category}
            />

            <NaverTrendCard
              naverDemo={naverDemo}
              loading={naverLoading}
            />

            {/* 발주 피어 피드백 */}
            <p className="text-xs font-bold text-grey-400 px-1 -mb-1 mt-2">발주 피어 피드백</p>

            <CrowdInsightCard product={product} locationType={Array.isArray(store.locationType) ? store.locationType[0] : store.locationType} />

            {(() => {
              const primaryLocation = Array.isArray(store.locationType) ? store.locationType[0] : store.locationType;
              const myFeedback = getMyFeedback(product.id, primaryLocation);
              return myFeedback ? (
                <button
                  onClick={() => onNavigate('feedback', { productId: String(product.id) })}
                  className="w-full py-3.5 rounded-xl border-2 border-success-500 text-sm font-bold text-success-600 bg-success-100 hover:bg-success-100 transition-colors"
                >
                  {myFeedback.rating === 'good' ? '😊' : myFeedback.rating === 'ok' ? '😐' : '😕'} 내 발주 결과 수정하기
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('feedback', { productId: String(product.id) })}
                  className="w-full py-4 rounded-xl bg-gray-800 text-white text-sm font-bold hover:bg-gray-700 transition-colors active:scale-[0.98]"
                >
                  📦 이 상품 발주했어요 — 결과 남기기
                </button>
              );
            })()}

        {/* 다른 상품 보기 — 항상 노출 */}
        <button
          onClick={() => onNavigate('landing')}
          className="w-full py-3.5 rounded-xl border-2 border-grey-200 text-sm font-bold text-grey-600 hover:bg-bg-primary transition-colors"
        >
          다른 트렌드 상품도 확인하기
        </button>
      </div>
    </div>
  );
}
