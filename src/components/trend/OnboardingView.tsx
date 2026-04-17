'use client';

import { useState, useEffect } from 'react';
import { ChainBrand, LocationType, CustomerProfile, StoreProfile } from '@/lib/trend/types';
import ChainBrandPicker from './ChainBrandPicker';
import LocationTypePicker from './LocationTypePicker';
import CustomerDemoPicker from './CustomerDemoPicker';
import EmailCapture from './EmailCapture';
import AddressInput from './AddressInput';
import { fetchProductById } from '@/data/trend/products';
import { AddressResult } from '@/lib/trend/kakao-geocode';
import { fetchAreaAnalysis } from '@/lib/trend/area-analysis';

const STORE_KEY = 'storeProfile';

const STEPS = [
  { title: '매장 주소를 알려주세요', subtitle: '정확한 상권 분석에 필요해요 (건너뛰기 가능)' },
  { title: '어떤 편의점인가요?', subtitle: '브랜드를 선택해주세요' },
  { title: '매장 상권은 어디에 가깝나요?', subtitle: '주변 환경을 선택해주세요' },
  { title: '주로 어떤 분들이 오세요?', subtitle: '가장 가까운 고객층을 선택해주세요' },
  { title: '결과를 저장할게요', subtitle: '이메일을 남기면 다음에도 바로 확인할 수 있어요' },
];

// 장소명에서 편의점 브랜드 자동 감지
function detectBrandFromPlaceName(placeName: string): ChainBrand | null {
  if (placeName.includes('GS25')) return 'GS25';
  if (placeName.includes('CU')) return 'CU';
  if (placeName.includes('세븐일레븐') || placeName.includes('7-Eleven')) return '세븐일레븐';
  if (placeName.includes('이마트24') || placeName.includes('emart24')) return '이마트24';
  if (placeName.includes('미니스톱') || placeName.includes('MINISTOP')) return '미니스톱';
  return null;
}

interface ViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  productId?: string;
}

export default function OnboardingView({ onNavigate, productId = '' }: ViewProps) {
  const [product, setProduct] = useState<import('@/lib/trend/types').Product | null>(null);
  useEffect(() => { fetchProductById(productId).then(setProduct); }, [productId]);

  const [step, setStep] = useState(0);
  const [addressResult, setAddressResult] = useState<AddressResult | null>(null);
  const [chain, setChain] = useState<ChainBrand | null>(null);
  const [location, setLocation] = useState<LocationType[]>([]);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // 상권 분석 상태 (캐시 워밍 목적 — PredictionResult에서 다시 읽음)
  useEffect(() => {
    if (!addressResult?.cx || !addressResult?.cy) return;
    fetchAreaAnalysis(addressResult.cx, addressResult.cy).catch(() => {});
  }, [addressResult]);

  // step별 다음 버튼 활성 조건 (step0 주소는 건너뛰기 가능 → 항상 true)
  const canNext = [true, !!chain, location.length > 0, !!customer][step] ?? true;

  const handleNext = () => {
    if (step < 4) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else onNavigate('landing');
  };

  const handleEmailSubmit = (email: string) => {
    if (!chain || !location || !customer) return;
    setLoading(true);
    const profile: StoreProfile = {
      chainBrand: chain,
      locationType: location,
      primaryCustomer: customer,
      email,
      ...(addressResult
        ? { address: addressResult.address, cx: addressResult.cx, cy: addressResult.cy }
        : {}),
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(profile));

    // 브랜드 불일치 예외 처리: 선택한 상품이 다른 체인 PB면 필터 리스트로 리디렉션
    const CHAIN_BRANDS_SET = new Set(['CU', 'GS25', '세븐일레븐', '이마트24', '미니스톱']);
    const isChainPB = product && CHAIN_BRANDS_SET.has(product.brand);
    const brandMismatch = isChainPB && product.brand !== chain;

    setTimeout(() => {
      if (brandMismatch) {
        onNavigate('landing');
      } else {
        onNavigate('result', { productId });
      }
    }, 800);
  };

  return (
    <div className="h-full bg-bg-primary flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-grey-200 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-grey-200 transition-colors text-grey-500"
          >
            ←
          </button>
          <div className="flex-1">
            {product && (
              <p className="text-xs text-grey-400">
                {product.name} 적합도 확인 중
              </p>
            )}
          </div>
          <span className="text-xs text-grey-400">{step + 1} / 5</span>
        </div>
      </header>

      {/* 프로그레스 바 */}
      <div className="h-1 bg-grey-200">
        <div
          className="h-full bg-primary-500 transition-all duration-500"
          style={{ width: `${((step + 1) / 5) * 100}%` }}
        />
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-6 flex flex-col">
        <div className="mb-6">
          <h2 className="text-xl font-black text-grey-900 mb-1">{STEPS[step].title}</h2>
          <p className="text-sm text-grey-400">{STEPS[step].subtitle}</p>
        </div>

        <div className="flex-1">
          {step === 0 && (
            <AddressInput
              onSelect={(r) => {
                setAddressResult(r);
                // 장소명에서 브랜드 감지 후 pre-select, 브랜드 step은 항상 거침
                const detected = detectBrandFromPlaceName(r.placeName);
                if (detected) setChain(detected);
                setTimeout(handleNext, 400);
              }}
              onSkip={handleNext}
            />
          )}
          {step === 1 && (
            <ChainBrandPicker value={chain} onChange={(v) => { setChain(v); setTimeout(handleNext, 200); }} />
          )}
          {step === 2 && (
            <LocationTypePicker value={location} onChange={setLocation} />
          )}
          {step === 3 && (
            <CustomerDemoPicker
              value={customer}
              onChange={setCustomer}
            />
          )}
          {step === 4 && (
            <EmailCapture onSubmit={handleEmailSubmit} loading={loading} />
          )}
        </div>

        {step < 4 && canNext && (
          <button
            onClick={handleNext}
            className="mt-6 w-full py-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm transition-all active:scale-[0.98] shadow-md shadow-indigo-200"
          >
            다음 →
          </button>
        )}
      </div>
    </div>
  );
}
