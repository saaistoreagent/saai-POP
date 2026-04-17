'use client';

import { useEffect, useState } from 'react';
import { fetchProducts, CATEGORY_EMOJI } from '@/data/trend/products';
import { Product, StoreProfile } from '@/lib/trend/types';
import FloatingAlert from './FloatingAlert';
import { fetchAreaAnalysis, AreaAnalysis } from '@/lib/trend/area-analysis';
import AreaAnalysisCard from './AreaAnalysis';
import { loadAllFeedback, LocalFeedback } from '@/data/trend/crowd-data';

const STORE_KEY = 'storeProfile';
const CHAIN_BRANDS = new Set(['CU', 'GS25', '세븐일레븐', '이마트24', '미니스톱']);

interface ViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  flash?: { message: string; icon?: string } | null;
}

function ProductCard({ product, onCTA, profile }: { product: Product; onCTA: (id: string) => void; profile: StoreProfile | null }) {
  return (
    <button
      key={product.id}
      onClick={() => onCTA(String(product.id))}
      className="bg-white rounded-2xl border border-grey-200 p-4 text-left hover:border-primary-200 hover:shadow-sm transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-bg-primary flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.textContent = CATEGORY_EMOJI[product.category] ?? '📦';
              }}
            />
          ) : CATEGORY_EMOJI[product.category] ?? '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-sm text-grey-900">{product.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-grey-400">{product.brand}</span>
            <span className="text-xs text-gray-200">·</span>
            <span className="text-xs text-grey-400">{product.category}</span>
          </div>
        </div>
        <span className="text-xs text-primary-500 font-semibold flex-shrink-0">
          {profile ? '예측 보기 →' : '적합도 확인 →'}
        </span>
      </div>
    </button>
  );
}

function NewsletterGroupedList({ products, onCTA, profile }: { products: Product[]; onCTA: (id: string) => void; profile: StoreProfile | null }) {
  // 호수별 그룹핑: null(미지정) 포함
  const issueMap = new Map<number | null, Product[]>();
  for (const p of products) {
    const key = p.newsletterIssue ?? null;
    if (!issueMap.has(key)) issueMap.set(key, []);
    issueMap.get(key)!.push(p);
  }

  // 호수 내림차순 정렬 (null은 맨 뒤)
  const sortedKeys = [...issueMap.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return b - a;
  });

  return (
    <div className="flex flex-col gap-6">
      {sortedKeys.map((issue) => (
        <div key={issue ?? 'none'}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-warning-300 bg-warning-100 px-2.5 py-1 rounded-full">
              {issue !== null ? `📰 스토어레터 ${issue}호` : '🔥 이번 주 트렌드'}
            </span>
            <span className="text-xs text-grey-400">{issueMap.get(issue)!.length}개</span>
          </div>
          <div className="flex flex-col gap-3">
            {issueMap.get(issue)!.map((product) => (
              <ProductCard key={product.id} product={product} onCTA={onCTA} profile={profile} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LandingView({ onNavigate, flash: externalFlash }: ViewProps) {
  const savedProfile = localStorage.getItem(STORE_KEY);
  const hasProfile = !!savedProfile;

  const profile: StoreProfile | null = savedProfile ? JSON.parse(savedProfile) : null;

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [flash, setFlash] = useState<{ message: string; icon?: string } | null>(
    externalFlash ?? null,
  );

  useEffect(() => {
    fetchProducts().then((data) => {
      setProducts(data);
      setProductsLoading(false);
    });
  }, []);

  const displayProducts = products.filter((p) => {
    if (!CHAIN_BRANDS.has(p.brand)) return true;
    if (!profile) return true;
    return p.brand === profile.chainBrand;
  });

  const handleCTA = (productId: string) => {
    if (hasProfile) {
      onNavigate('result', { productId });
    } else {
      onNavigate('onboarding', { productId });
    }
  };

  const handleReset = () => {
    localStorage.removeItem(STORE_KEY);
    window.location.reload();
  };

  const [activeTab, setActiveTab] = useState<'trend' | 'orders'>('trend');
  const [myOrders, setMyOrders] = useState<LocalFeedback[]>([]);
  const [areaAnalysis, setAreaAnalysis] = useState<AreaAnalysis | null>(null);

  // 발주 목록에서 상품 조회용
  const getProductById = (id: string) => products.find((p) => String(p.id) === id) ?? null;

  useEffect(() => {
    setMyOrders(loadAllFeedback());
  }, [activeTab]); // 탭 전환 시 최신 피드백 반영

  useEffect(() => {
    if (profile?.cx && profile?.cy && profile?.address) {
      fetchAreaAnalysis(profile.cx, profile.cy).then(setAreaAnalysis).catch(() => {});
    }
  }, []);

  return (
    <div className="h-full bg-bg-primary">
      {flash && (
        <FloatingAlert
          message={flash.message}
          icon={flash.icon}
          onClose={() => setFlash(null)}
        />
      )}
      {/* 헤더 */}
      <header className="bg-white border-b border-grey-200 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-grey-900">📊 트렌드 PICK</h1>
            <p className="text-xs text-grey-400">트렌드 상품 적합도 예측</p>
          </div>
          {profile && (
            <button
              onClick={handleReset}
              className="text-xs text-grey-400 hover:text-grey-600 underline"
            >
              {profile.chainBrand} · {Array.isArray(profile.locationType) ? profile.locationType.join('·') : profile.locationType} ✕
            </button>
          )}
        </div>
      </header>

      {/* 탭 — 프로필 있을 때만 노출 */}
      {profile && (
        <div className="bg-white border-b border-grey-200">
          <div className="max-w-lg mx-auto px-5 flex">
            <button
              onClick={() => setActiveTab('trend')}
              className={`py-3 text-sm font-bold border-b-2 mr-6 transition-colors ${
                activeTab === 'trend'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-grey-400'
              }`}
            >
              트렌드 상품
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-grey-400'
              }`}
            >
              내 발주 목록
              {myOrders.length > 0 && (
                <span className="text-xs bg-primary-200 text-primary-600 px-1.5 py-0.5 rounded-full font-semibold">
                  {myOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-5 py-6">
        {activeTab === 'trend' ? (
          <>
            {/* 히어로 */}
            <div className="mb-6">
              {profile ? (
                <div className="mb-4 flex flex-col gap-2">
                  <div className="bg-primary-100 rounded-2xl p-4">
                    <p className="text-xs text-primary-500 font-semibold mb-0.5">내 매장 프로필</p>
                    <p className="text-sm font-bold text-primary-800">
                      {profile.chainBrand} · {Array.isArray(profile.locationType) ? profile.locationType.join('·') : profile.locationType} · {profile.primaryCustomer.label}
                    </p>
                    <p className="text-xs text-primary-400 mt-0.5">상품을 클릭하면 바로 예측 결과를 볼 수 있어요</p>
                  </div>
                  {areaAnalysis && profile.address && (
                    <AreaAnalysisCard
                      address={profile.address}
                      analysis={areaAnalysis}
                      loading={false}
                    />
                  )}
                </div>
              ) : (
                <div className="mb-4">
                  <h2 className="text-xl font-black text-grey-900 leading-tight mb-1">
                    이번 주 트렌드 상품,<br />
                    <span className="text-primary-600">우리 매장에서 팔릴까?</span>
                  </h2>
                  <p className="text-sm text-grey-500">
                    상품을 클릭하면 내 매장 기준 AI 적합도를 확인할 수 있어요.
                  </p>
                </div>
              )}
            </div>

            {/* 상품 리스트 */}
            {productsLoading ? (
              <div className="flex justify-center py-16">
                <span className="text-sm text-grey-400">불러오는 중...</span>
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <span className="text-3xl">📦</span>
                <p className="text-sm font-bold text-grey-600">등록된 상품이 없어요</p>
                <p className="text-xs text-grey-400">관리자 페이지에서 상품을 추가해주세요</p>
              </div>
            ) : (
              <NewsletterGroupedList products={displayProducts} onCTA={handleCTA} profile={profile} />
            )}
          </>
        ) : (
          /* 발주 목록 탭 */
          <div className="flex flex-col gap-3">
            {myOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <span className="text-3xl">📦</span>
                <p className="text-sm font-bold text-grey-600">아직 남긴 발주 결과가 없어요</p>
                <p className="text-xs text-grey-400 leading-relaxed">
                  트렌드 탭에서 상품을 확인하고<br />발주 결과를 남기면 여기서 모아볼 수 있어요
                </p>
              </div>
            ) : (
              myOrders
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((order) => {
                  const product = getProductById(order.productId);
                  if (!product) return null;
                  const ratingEmoji =
                    order.rating === 'good' ? '😊' : order.rating === 'ok' ? '😐' : '😕';
                  const ratingLabel =
                    order.rating === 'good' ? '잘 팔렸어요' : order.rating === 'ok' ? '그럭저럭' : '별로였어요';
                  const date = new Date(order.createdAt).toLocaleDateString('ko-KR', {
                    month: 'short', day: 'numeric',
                  });
                  const fitScore: number | null = null;
                  const scoreColor =
                    fitScore === null ? 'text-grey-400'
                    : fitScore >= 75 ? 'text-success-600'
                    : fitScore >= 55 ? 'text-warning-300'
                    : 'text-danger-500';

                  return (
                    <button
                      key={`${order.productId}-${order.createdAt}`}
                      onClick={() => onNavigate('result', { productId: String(product.id) })}
                      className="bg-white rounded-2xl border border-grey-200 p-4 text-left hover:border-primary-200 hover:shadow-sm transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-bg-primary flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.textContent = CATEGORY_EMOJI[product.category] ?? '📦';
                              }}
                            />
                          ) : CATEGORY_EMOJI[product.category] ?? '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-sm text-grey-900 block">{product.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-grey-400">{product.brand}</span>
                            <span className="text-xs text-gray-200">·</span>
                            <span className="text-xs text-grey-400">{date}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="text-base">{ratingEmoji}</span>
                            <span className="text-xs text-grey-500 font-medium">{ratingLabel}</span>
                          </div>
                          {fitScore !== null && (
                            <span className={`text-xs font-bold ${scoreColor}`}>
                              적합도 {fitScore}
                            </span>
                          )}
                        </div>
                      </div>
                      {order.comment && (
                        <p className="text-xs text-grey-400 mt-2.5 pt-2.5 border-t border-grey-200 line-clamp-1">
                          {order.comment}
                        </p>
                      )}
                    </button>
                  );
                })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
