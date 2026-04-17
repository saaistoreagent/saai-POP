'use client';

import { useState, useEffect } from 'react';
import { fetchProductById, CATEGORY_EMOJI } from '@/data/trend/products';
import { StoreProfile } from '@/lib/trend/types';
import { saveFeedback, FeedbackRating, getMyFeedback } from '@/data/trend/crowd-data';

const STORE_KEY = 'storeProfile';

const RATINGS: { value: FeedbackRating; emoji: string; label: string; desc: string }[] = [
  { value: 'good', emoji: '😊', label: '잘 팔렸어요', desc: '예상보다 빠르게 소진됐어요' },
  { value: 'ok',   emoji: '😐', label: '보통이에요',  desc: '적당히 나가긴 했어요' },
  { value: 'bad',  emoji: '😕', label: '별로였어요',  desc: '생각보다 안 팔렸어요' },
];

interface ViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  productId?: string;
}

export default function FeedbackView({ onNavigate, productId = '' }: ViewProps) {
  const [product, setProduct] = useState<import('@/lib/trend/types').Product | null>(null);
  const store: StoreProfile | null = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');

  const primaryLocation = store ? (Array.isArray(store.locationType) ? store.locationType[0] : store.locationType) : null;

  const [selected, setSelected] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchProductById(productId).then((p) => {
      setProduct(p);
      if (p && store && primaryLocation) {
        const fb = getMyFeedback(productId, primaryLocation);
        if (fb) { setSelected(fb.rating); setComment(fb.comment ?? ''); setSubmitted(true); }
      }
    });
  }, [productId]);

  if (!product || !store) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center p-5">
        <p className="text-grey-400 text-sm">정보를 불러올 수 없어요.</p>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!selected) return;
    saveFeedback({
      productId,
      locationType: primaryLocation!,
      rating: selected,
      comment: comment.trim() || undefined,
      createdAt: Date.now(),
    });
    setSubmitted(true);
  };

  return (
    <div className="h-full bg-bg-primary flex flex-col">
      <header className="bg-white border-b border-grey-200 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => onNavigate('result', { productId })}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-grey-200 text-grey-500"
          >
            ←
          </button>
          <span className="text-sm font-bold text-grey-800">발주 결과 남기기</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full px-5 py-6 flex flex-col gap-5">
        {/* 상품 */}
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-grey-200 px-4 py-3">
          <div className="w-10 h-10 rounded-xl bg-bg-primary flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
            {product.imageUrl
              ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              : CATEGORY_EMOJI[product.category] ?? '📦'}
          </div>
          <div>
            <p className="text-sm font-bold text-grey-800">{product.name}</p>
            <p className="text-xs text-grey-400">{store.chainBrand} · {Array.isArray(store.locationType) ? store.locationType.join('·') : store.locationType}</p>
          </div>
        </div>

        {submitted ? (
          /* 제출 완료 */
          <div className="bg-white rounded-2xl border border-grey-200 p-6 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">🙌</span>
            <p className="text-base font-bold text-grey-800">후기 감사해요!</p>
            <p className="text-sm text-grey-400 leading-relaxed">
              이 결과가 비슷한 상권 점주분들의<br />발주 결정에 도움이 돼요.
            </p>
            <button
              onClick={() => onNavigate('result', { productId })}
              className="mt-2 px-6 py-3 bg-primary-500 text-white rounded-xl text-sm font-bold"
            >
              결과 페이지로 돌아가기
            </button>
          </div>
        ) : (
          <>
            <div>
              <p className="text-base font-black text-grey-900 mb-1">
                이 상품, 실제로 어떻게 됐어요?
              </p>
              <p className="text-sm text-grey-400">발주 후 판매 결과를 알려주세요.</p>
            </div>

            {/* 평가 선택 */}
            <div className="flex flex-col gap-2.5">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setSelected(r.value)}
                  className={`flex items-center gap-3 px-4 py-4 rounded-xl border-2 text-left transition-all ${
                    selected === r.value
                      ? 'border-primary-400 bg-primary-100'
                      : 'border-grey-200 bg-white hover:border-grey-300'
                  }`}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <div>
                    <p className={`font-bold text-sm ${selected === r.value ? 'text-primary-700' : 'text-grey-700'}`}>
                      {r.label}
                    </p>
                    <p className="text-xs text-grey-400">{r.desc}</p>
                  </div>
                  {selected === r.value && (
                    <span className="ml-auto text-primary-500 font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* 코멘트 */}
            {selected && (
              <div>
                <p className="text-xs text-grey-500 mb-2">한마디 남기면 다른 점주에게 더 도움돼요 (선택)</p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="예: 퇴근길 직장인들한테 잘 팔렸어요. 24개로 올릴 예정이에요."
                  className="w-full px-4 py-3 rounded-xl border-2 border-grey-200 text-sm focus:outline-none focus:border-primary-400 resize-none bg-white"
                  rows={3}
                />
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!selected}
              className={`w-full py-4 rounded-xl text-sm font-bold transition-all ${
                selected
                  ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-md shadow-indigo-200 active:scale-[0.98]'
                  : 'bg-grey-200 text-grey-400 cursor-not-allowed'
              }`}
            >
              결과 공유하기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
