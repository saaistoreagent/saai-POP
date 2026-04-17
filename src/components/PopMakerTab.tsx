'use client';

import { useState, useRef, useEffect, memo } from 'react';

// ─── 미리보기 바 (메모화) ───
const PREVIEW_CFG: Record<string, { widthPct: number; heightPct: number; ratio: number }> = {
  'banner-세로': { widthPct: 100, heightPct: 400, ratio: 794 / (1123 / 4) },
  'banner-가로': { widthPct: 100, heightPct: 300, ratio: 1123 / (794 / 3) },
  'shelf-세로':  { widthPct: 100, heightPct: 400, ratio: 794 / (1123 / 4) },
  'shelf-가로':  { widthPct: 100, heightPct: 300, ratio: 1123 / (794 / 3) },
  'badge-세로':  { widthPct: 100, heightPct: 500, ratio: 794 / (1123 / 5) },
  'badge-가로':  { widthPct: 100, heightPct: 300, ratio: 1123 / (794 / 3) },
};
const PREVIEW_MAX_H = 140;
const PREVIEW_MAX_W = 408; // app-shell 440 - px-2*2 (16) - border 등 여유
const PreviewBar = memo(function PreviewBar({ popType, orientation, previewImage, previewLoading }: {
  popType: string; orientation: string; previewImage: string | null; previewLoading: boolean;
}) {
  const cfg = PREVIEW_CFG[`${popType}-${orientation}`] || PREVIEW_CFG['shelf-세로'];
  // SSR와 CSR 첫 렌더 값 동일(하이드레이션 미스매치 방지), useLayoutEffect로 페인트 전에 실제 vw 반영
  const [vw, setVw] = useState<number>(408);
  useEffect(() => {
    const update = () => setVw(Math.min(window.innerWidth, 440) - 16);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  // 픽셀 확정: width ≤ vw, height ≤ PREVIEW_MAX_H, 비율 유지
  let w = Math.min(vw, PREVIEW_MAX_W, PREVIEW_MAX_H * cfg.ratio);
  let h = w / cfg.ratio;
  return (
    <div className="sticky top-0 z-20 bg-grey-100 border-b border-grey-100 px-2 pt-2 pb-2">
      <p className="text-[14px] font-bold text-grey-500 px-1 mb-2">미리보기{popType !== 'badge' && <span className="text-grey-400 font-normal"> (상품 1개 기준 예시)</span>}</p>
      <div className="flex items-center justify-center" style={{ height: PREVIEW_MAX_H }}>
        <div className="relative bg-white rounded-lg border border-grey-200 overflow-hidden"
          style={{
            width: w,
            height: h,
            contain: 'strict',
          }}>
          {previewImage && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewImage}
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${cfg.widthPct}%`,
                height: `${cfg.heightPct}%`,
                maxWidth: 'none',
                objectFit: 'fill',
                pointerEvents: 'none',
              }}
            />
          )}
          {/* 중앙 스피너: 이미지 없을 때만 */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: previewImage ? 0 : 1,
            transition: 'opacity 0.15s',
            pointerEvents: 'none',
          }}>
            <div className="w-5 h-5 border-2 border-grey-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
          {previewLoading && previewImage && (
            <div className="absolute top-1.5 right-1.5 w-4 h-4 border-2 border-grey-300 border-t-primary-500 rounded-full animate-spin bg-white/80" />
          )}
        </div>
      </div>
    </div>
  );
});

// ─── 타입 ───
type POPType = 'poster' | 'badge' | 'shelf' | 'banner';
type View = 'landing' | 'form' | 'suggestion' | 'result';
type EventType = 'discount' | '1+1' | '2+1' | '3+1' | 'bundle' | 'gift' | 'new' | 'none';

const EVENT_OPTIONS: { value: EventType; label: string; desc: string; badge: string | null }[] = [
  { value: 'discount', label: '가격 할인', desc: '정상가에서 할인된 가격으로', badge: null },
  { value: '1+1', label: '1+1 행사', desc: '하나 사면 하나 더', badge: '1+1' },
  { value: '2+1', label: '2+1 행사', desc: '두 개 사면 하나 더', badge: '2+1' },
  { value: '3+1', label: '3+1 행사', desc: '세 개 사면 하나 더', badge: '3+1' },
  { value: 'bundle', label: '묶음 행사', desc: '여러 개를 특가로 묶어서', badge: null },
  { value: 'gift', label: '덤 증정', desc: '구매 시 덤 상품을 드려요', badge: '덤증정' },
  { value: 'new', label: '신상품', desc: '새로 입고된 상품 소개', badge: 'NEW' },
  { value: 'none', label: '행사 없음', desc: '그냥 상품 소개', badge: null },
];

interface ProductItem {
  name: string;       // 상품 이름 (AI 프롬프트 + 사진 검색 공용)
  displayName: string; // POP에 표시할 이름 (짧게, 선반/띠지 전용)
  originalPrice: string;
  price: string;
  badge?: string;     // 상품별 강조 문구 (포스터 전용)
}

interface POPTypeInfo {
  value: POPType;
  label: string;
  detail: string;
  count: { 세로: string; 가로: string };
}

const POP_TYPES: POPTypeInfo[] = [
  { value: 'poster', label: '포스터', detail: '매장 포스터 · 가장 큰 홍보물', count: { 세로: '1장', 가로: '1장' } },
  { value: 'badge', label: '배지', detail: '작은 라벨 · 짧은 문구', count: { 세로: '15개 (3×5)', 가로: '12개 (4×3)' } },
  { value: 'shelf', label: '가격표', detail: '선반 가격표 · [사진/이름/문구] 선택 가능', count: { 세로: '8개 (2×4)', 가로: '6개 (2×3)' } },
  { value: 'banner', label: '띠지', detail: '선반 띠지 · [사진/이름/문구] 선택 가능', count: { 세로: '4줄', 가로: '3줄' } },
];

const BADGE_PRESETS = ['없음', '1+1', '2+1', '3+1', '덤증정', '품절대란', '신상출시', '소진임박'];

const BG_COLORS = [
  { hex: '#E91E90', name: '핑크' },
  { hex: '#4CAF50', name: '초록' },
  { hex: '#00BCD4', name: '시안' },
  { hex: '#FF6B00', name: '주황' },
  { hex: '#DC2626', name: '빨강' },
  { hex: '#2563EB', name: '파랑' },
  { hex: '#7C3AED', name: '보라' },
  { hex: '#1E293B', name: '네이비' },
];

function colorName(hex: string): string {
  return BG_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase())?.name || hex;
}

interface ChatMessage {
  role: 'user' | 'bot';
  text?: string;
  image?: string;
}

interface PhotoResolution {
  productIndex: number;
  name: string;
  status: 'searching' | 'found' | 'missing' | 'user_uploaded' | 'ai_generate';
  imageUrl?: string;
  bgRemovedUrl?: string;
  bgRemoving?: boolean;
  candidates?: string[];
  candidateIndex?: number;
}

// 외부 URL은 프록시 통해 표시 (CORS/핫링크 우회)
function displayUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('/')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

export default function PopMakerTab() {
  const [view, setView] = useState<View>('landing');
  const [popType, setPopType] = useState<POPType>('poster');
  const [wizardStep, setWizardStep] = useState(1);

  // 폼
  const [products, setProducts] = useState<ProductItem[]>([{ name: '', displayName: '', originalPrice: '', price: '' }]);
  const [badgeType, setBadgeType] = useState<string>('없음');
  const [badgeFromPreset, setBadgeFromPreset] = useState(true); // 프리셋에서 선택했는지 여부
  const [eventDesc, setEventDesc] = useState(''); // 행사 내용 자유 설명
  const [moodDesc, setMoodDesc] = useState(''); // 분위기/느낌
  const [orientation, setOrientation] = useState<'세로' | '가로'>('세로');
  const [bgColor, setBgColor] = useState('#E91E90');

  // 사진 해결 상태 (Step 2 photo)
  const [photoResolutions, setPhotoResolutions] = useState<PhotoResolution[]>([]);
  const [photoSearched, setPhotoSearched] = useState(false);
  const [photoEnabled, setPhotoEnabled] = useState(true);
  const [photoSearchName, setPhotoSearchName] = useState(''); // 사진 검색용 상품명 (토글 ON 시)
  const [priceOpen, setPriceOpen] = useState<Record<number, boolean>>({}); // 상품별 가격 접기/펼치기
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null); // AI 제안 문구
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [moodSuggestion, setMoodSuggestion] = useState<string | null>(null);
  const [moodSuggesting, setMoodSuggesting] = useState(false);
  const resolveFileRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 제안
  const [suggesting, setSuggesting] = useState(false);
  const [catchphrase, setCatchphrase] = useState('');
  const [direction, setDirection] = useState('');
  const [editingField, setEditingField] = useState<'catchphrase' | 'direction' | null>(null);

  // 결과
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0); // 0~100 진행률 시뮬레이션
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultAspect, setResultAspect] = useState<number>(1); // width/height
  // 실시간 미리보기 (canvas POPs 전용)
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photoSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [refineInput, setRefineInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineMode, setRefineMode] = useState<'text' | 'color' | 'bg' | null>(null);
  const [refineStep1, setRefineStep1] = useState('');
  const [refineStep2, setRefineStep2] = useState('');
  const [pageBlurred, setPageBlurred] = useState(false);

  // 페이지 포커스 잃으면 결과 이미지 blur (캡처 방지)
  useEffect(() => {
    const onBlur = () => setPageBlurred(true);
    const onFocus = () => setPageBlurred(false);
    const onVis = () => setPageBlurred(document.hidden);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // 실시간 미리보기 (canvas POPs: badge/shelf/banner) — 샘플 스타일 (상품 1개만)
  async function generatePreview() {
    if (popType === 'poster') return;
    setPreviewLoading(true);
    try {
      const cat = popType === 'banner' ? 'strip' : popType === 'shelf' ? 'price' : 'badge';
      const mainProduct = products[0];
      const resolvedImages = getResolvedImages();
      const res = await fetch('/api/pop/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: mainProduct?.name.trim() || '',
          originalPrice: mainProduct?.originalPrice ? Number(mainProduct.originalPrice) : null,
          price: mainProduct?.price ? Number(mainProduct.price) : null,
          category: cat,
          bgColor,
          badgeType: badgeType && badgeType !== '없음' ? badgeType : null,
          productImages: resolvedImages.slice(0, 1),
          noSearch: true,
          skipBgRemoval: true,
          orientation,
          additionalProducts: [],
        }),
      });
      const data = await res.json();
      if (data.bgImage) {
        // 새 이미지를 먼저 완전히 로드한 뒤 교체 → CSS bg 교체 시 빈 프레임 방지
        await new Promise<void>(resolve => {
          const img = new window.Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = data.bgImage;
        });
        setPreviewImage(data.bgImage);
      }
    } catch {} finally {
      setPreviewLoading(false);
    }
  }

  // 입력 변경 시 미리보기 자동 업데이트 (debounced 400ms)
  useEffect(() => {
    if (view !== 'form' || popType === 'poster') return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => generatePreview(), 400);
    return () => { if (previewTimer.current) clearTimeout(previewTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, popType, badgeType, products, bgColor, orientation, photoResolutions]);

  // 채팅 스크롤
  useEffect(() => {
    if (chat.length > 0 || resultImage) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  }, [chat, refining, resultImage]);

  // 생성 중 이탈 경고
  useEffect(() => {
    if (!generating && !refining) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [generating, refining]);

  // 생성 중 페이지 이탈 경고
  useEffect(() => {
    if (!generating) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [generating]);

  // 생성 진행률 — 포스터(Gemini)는 점진적, 캔버스(배지/선반/띠지)는 빠르게
  useEffect(() => {
    if (!generating) { setGenProgress(0); return; }
    const isAI = popType === 'poster';
    if (!isAI) {
      // 캔버스: 즉시 생성되므로 빠른 진행
      setGenProgress(50);
      const t = setTimeout(() => setGenProgress(90), 300);
      return () => clearTimeout(t);
    }
    // 포스터(AI): 보통 12~25초 소요 — 시간 기반 부드러운 증가
    const startedAt = Date.now();
    const expectedMs = 18000; // 예상 소요시간
    setGenProgress(3);
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      // 지수 감쇠로 점근 90% 도달 (절대 90% 안 넘음)
      const target = 90 * (1 - Math.exp(-elapsed / (expectedMs / 2.3)));
      setGenProgress(prev => Math.max(prev, Math.round(target)));
    }, 200);
    return () => clearInterval(interval);
  }, [generating, popType]);

  const currentType = POP_TYPES.find(t => t.value === popType)!;

  function enterForm(t: POPType) {
    setPopType(t);
    setView('form');
    setWizardStep(1);
    setResultImage(null);
    setPreviewImage(null);
    setChat([]);
    setCatchphrase('');
    setDirection('');
    setProducts([{ name: '', displayName: '', originalPrice: '', price: '' }]);
    setPhotoResolutions([]);
    setPhotoSearched(false);
    // 포스터는 사진 기본 ON, 띠지/선반은 기본 OFF (템플릿 위주)
    setPhotoEnabled(t === 'poster');
    setBadgeType('없음');
    setBadgeFromPreset(true);
    setPriceOpen({});
    setPhotoSearchName('');
    setEventDesc('');
    setMoodDesc('');
    setOrientation('세로');
    setBgColor('#E91E90');
    setPreviewImage(null);
  }

  function backToLanding() {
    setView('landing');
    setWizardStep(1);
  }

  // 위저드 단계 수:
  // 전부 3단계
  const totalSteps = 3;

  // 사진 검색이 트리거되는 단계 (포스터=3, 선반/띠지=3)
  const photoStep = 3;

  function nextStep() {
    if (view === 'form') {
      if (wizardStep === 1 && popType === 'badge' && badgeType === '없음') {
        alert('배지 문구를 선택해주세요.'); return;
      }
    }
    if (wizardStep < totalSteps) {
      const next = wizardStep + 1;
      setWizardStep(next);
      if (next === photoStep && popType !== 'badge' && photoEnabled && !photoSearched) {
        searchProductPhotos();
      }
    } else {
      // 마지막 단계 → 바로 생성
      if (popType === 'poster') {
        const cp = badgeType && badgeType !== '없음' ? badgeType : '';
        const dir = moodDesc;
        setCatchphrase(cp);
        setDirection(dir);
        confirmAndGenerate(cp, dir);
      } else {
        confirmAndGenerate();
      }
    }
  }

  // 사진 토글 — 켜면 즉시 검색 트리거
  function togglePhoto(on: boolean) {
    setPhotoEnabled(on);
    if (!on) {
      setPhotoResolutions([]);
      setPhotoSearched(false);
    }
  }
  function prevStep() {
    if (wizardStep > 1) {
      // 사진 단계에서 뒤로 가면 검색 상태 초기화 (상품 추가 후 돌아오면 재검색)
      if (wizardStep === photoStep) {
        setPhotoSearched(false);
        setPhotoResolutions([]);
      }
      setWizardStep(wizardStep - 1);
    } else {
      backToLanding();
    }
  }

  // 상품 사진 자동 검색 — override로 특정 상품만 검색 가능
  async function searchProductPhotos(override?: { name: string; index: number }) {
    // override 우선 (검색 input에서 직접 호출), 없으면 포스터처럼 products 전체
    const searchTargets = override
      ? [{ name: override.name.trim(), index: override.index }]
      : (popType === 'shelf' || popType === 'banner') && photoSearchName.trim()
      ? [{ name: photoSearchName.trim(), index: 0 }]
      : products.filter(p => p.name.trim()).map((p, i) => ({ name: p.name.trim(), index: i }));

    if (searchTargets.length === 0) return;

    setPhotoSearched(true);
    const initial: PhotoResolution[] = searchTargets.map(t => ({
      productIndex: t.index,
      name: t.name,
      status: 'searching',
    }));
    // override 모드: 해당 index만 업데이트, 나머지 유지
    if (override) {
      setPhotoResolutions(prev => {
        const others = prev.filter(r => r.productIndex !== override.index);
        return [...others, ...initial];
      });
    } else {
      setPhotoResolutions(initial);
    }

    const results = await Promise.all(
      searchTargets.map(async (t): Promise<PhotoResolution> => {
        const fullName = t.name;
        // 1차: 전체 이름으로 검색
        let candidates: string[] = [];
        try {
          const res = await fetch(`/api/search-image?q=${encodeURIComponent(fullName)}`);
          if (res.ok) {
            const { images } = await res.json();
            if (images && images.length > 0) {
              candidates = images.map((img: { url: string }) => img.url);
            }
          }
        } catch {}

        // 2차 fallback: 결과가 부족하면 단순화된 이름으로 재검색
        if (candidates.length < 3) {
          // 숫자/단위/수량 표현 제거 (5개입, 500ml, 캔맥주 등)
          const simplified = fullName
            .replace(/\d+\s*(개입|팩|박스|세트|묶음|캔|병|kg|g|ml|l|L)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (simplified && simplified !== fullName) {
            try {
              const res2 = await fetch(`/api/search-image?q=${encodeURIComponent(simplified)}`);
              if (res2.ok) {
                const { images } = await res2.json();
                if (images && images.length > 0) {
                  const more: string[] = images.map((img: { url: string }) => img.url);
                  // 기존 결과 + 새 결과 합치기 (중복 제거)
                  candidates = [...candidates, ...more.filter(u => !candidates.includes(u))];
                }
              }
            } catch {}
          }
        }

        if (candidates.length > 0) {
          return {
            productIndex: t.index,
            name: fullName,
            status: 'found',
            imageUrl: candidates[0],
            candidates,
            candidateIndex: 0,
          };
        }
        return { productIndex: t.index, name: fullName, status: 'missing' };
      })
    );
    if (override) {
      setPhotoResolutions(prev => {
        const others = prev.filter(r => r.productIndex !== override.index);
        return [...others, ...results];
      });
    } else {
      setPhotoResolutions(results);
    }
  }


  // 사진 해결 핸들러들
  function photoFindAnother(idx: number) {
    setPhotoResolutions(prev => prev.map(r => {
      if (r.productIndex !== idx) return r;
      if (!r.candidates || r.candidates.length <= 1) return r;
      const next = ((r.candidateIndex ?? 0) + 1) % r.candidates.length;
      return { ...r, imageUrl: r.candidates[next], candidateIndex: next, status: 'found', bgRemovedUrl: undefined, bgRemoving: false };
    }));
  }
  function photoUseAI(idx: number) {
    setPhotoResolutions(prev => {
      const existing = prev.find(r => r.productIndex === idx);
      if (existing) {
        return prev.map(r =>
          r.productIndex === idx
            ? { ...r, status: 'ai_generate', imageUrl: undefined, bgRemovedUrl: undefined, candidates: undefined }
            : r
        );
      }
      // 사진 검색 이력이 없어도 상품명만 있으면 AI 그리기 가능
      const product = products[idx];
      return [...prev, {
        productIndex: idx,
        name: product?.name?.trim() || '',
        status: 'ai_generate',
      }];
    });
  }
  function photoUploadClick(idx: number) {
    pendingUploadRef.current = idx;
    resolveFileRef.current?.click();
  }
  function photoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const idx = pendingUploadRef.current;
    if (!file || idx === null) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoResolutions(prev => prev.map(r =>
        r.productIndex === idx ? { ...r, status: 'user_uploaded', imageUrl: dataUrl, bgRemovedUrl: undefined, bgRemoving: false } : r
      ));
      pendingUploadRef.current = null;
    };
    reader.readAsDataURL(file);
    if (resolveFileRef.current) resolveFileRef.current.value = '';
  }

  // 상품 조작
  function addProduct() { setProducts(prev => [...prev, { name: '', displayName: '', originalPrice: '', price: '' }]); }
  function removeProduct(idx: number) { setProducts(prev => prev.filter((_, i) => i !== idx)); }
  function updateProduct(idx: number, field: 'name' | 'displayName' | 'originalPrice' | 'price', value: string) {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  // Step 2 인라인 AI 문구 다듬기
  async function requestMoodSuggestion() {
    if (moodSuggesting) return;
    setMoodSuggesting(true);
    setMoodSuggestion(null);
    try {
      const res = await fetch('/api/pop/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'poster',
          products: products.filter(p => p.name.trim()).map(p => ({
            name: p.name.trim(),
            originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
            price: p.price ? Number(p.price) : null,
          })),
          badgeType: badgeType && badgeType !== '없음' ? badgeType : null,
          eventDesc: catchphrase || null,
          moodDesc: moodDesc.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const suggested = data.direction || '상품에 어울리는 밝고 화려한 배경';
      setMoodSuggestion(suggested);
    } catch {
      setMoodSuggestion('상품에 어울리는 밝고 화려한 배경');
    } finally {
      setMoodSuggesting(false);
    }
  }

  async function requestAISuggestion() {
      if (aiSuggesting) return;
    setAiSuggesting(true);
    setAiSuggestion(null);
    try {
      const cat = popType === 'poster' ? 'promo' : popType === 'banner' ? 'strip' : 'price';
      const userText = badgeType && badgeType !== '없음' ? badgeType : '';
      const res = await fetch('/api/pop/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: cat,
          products: products.filter(p => p.name.trim()).map(p => ({
            name: p.name.trim(),
            originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
            price: p.price ? Number(p.price) : null,
          })),
          badgeType: userText || null,
          eventDesc: userText || null,
          moodDesc: moodDesc.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const suggested = data.catchphrase || '오늘만 특가';
      // 원본과 같으면 다른 걸로 다시 — fallback
      setAiSuggestion(suggested === userText ? suggested + '!' : suggested);
    } catch {
      setAiSuggestion('오늘만 특가');
    } finally {
      setAiSuggesting(false);
    }
  }

  // 폼 → 제안 화면으로
  async function goToSuggestion() {
    setSuggesting(true);
    setView('suggestion');

    try {
      const category = popType === 'poster' ? 'promo'
        : popType === 'banner' ? 'strip'
        : popType === 'shelf' ? 'price'
        : 'badge';

      const res = await fetch('/api/pop/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          products: products
            .filter(p => p.name.trim())
            .map(p => ({
              name: p.name.trim(),
              originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
              price: p.price ? Number(p.price) : null,
            })),
          badgeType: badgeType && badgeType !== '없음' ? badgeType : null,
          eventDesc: eventDesc.trim() || null,
          moodDesc: moodDesc.trim() || null,
        }),
      });
      const data = await res.json();
      setCatchphrase(data.catchphrase || '오늘만 특가');
      // 유저가 직접 적은 분위기가 있으면 그걸 우선 사용
      setDirection(moodDesc.trim() || data.direction || '깔끔한 배경');
    } catch {
      setCatchphrase('오늘만 특가');
      setDirection('깔끔한 배경');
    } finally {
      setSuggesting(false);
    }
  }

  // photoResolutions에서 상품별 최종 이미지 URL 가져오기
  function getResolvedImages(): (string | null)[] {
    // canvas POP 단일 페이지는 photoEnabled 체크 안함
    if (popType === 'poster' && !photoEnabled) return [];

    // photoResolutions에 있는 이미지 수집
    if (photoResolutions.length > 0) {
      const result: (string | null)[] = [];
      for (const r of photoResolutions) {
        if ((r.status === 'found' || r.status === 'user_uploaded') && r.imageUrl) {
          result.push(r.bgRemovedUrl || r.imageUrl);
        }
      }
      if (result.length > 0) return result;
    }

    return [];
  }

  // 제안 → 생성
  async function confirmAndGenerate(overrideCatchphrase?: string, overrideDirection?: string) {
    setResultImage(null);
    setChat([]);
    setGenProgress(5);
    setGenerating(true);
    // view 전환은 결과 나온 후에

    const finalCatchphrase = overrideCatchphrase ?? catchphrase;
    const finalDirection = overrideDirection ?? direction;

    try {
      const cat = popType === 'poster' ? 'promo'
        : popType === 'banner' ? 'strip'
        : popType === 'shelf' ? 'price'
        : 'badge';
      const mainProduct = products[0];
      const resolvedImages = getResolvedImages();
      const useAI = popType === 'poster';

      const res = await fetch('/api/pop/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: mainProduct?.name.trim() || '',
          productBadge: mainProduct?.badge?.trim() || null,
          originalPrice: mainProduct?.originalPrice ? Number(mainProduct.originalPrice) : null,
          price: mainProduct?.price ? Number(mainProduct.price) : null,
          direction: finalDirection.trim() || null,
          catchphraseInput: finalCatchphrase.trim() || null,
          category: cat,
          premium: useAI,
          bgColor,
          badgeType: popType === 'poster' ? null : (badgeType && badgeType !== '없음' ? badgeType : null),
          productImageUrl: resolvedImages[0] || null,
          productImages: resolvedImages,
          noSearch: true,
          skipBgRemoval: true,
          eventPeriod: null,
          orientation,
          additionalProducts: products.slice(1).filter(p => p.name.trim()).map(p => ({
            name: p.name.trim(),
            badge: p.badge?.trim() || null,
            originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
            price: p.price ? Number(p.price) : null,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setChat([{ role: 'bot', text: data.error || '생성에 실패했어요.' }]);
        return;
      }

      if (data.bgImage) {
        setGenProgress(100);
        // 이미지를 미리 로드해서 레이아웃 깨짐 방지 + aspect 측정
        const aspect = await new Promise<number>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
          img.onerror = () => resolve(1);
          img.src = data.bgImage;
        });
        setResultAspect(aspect);
        setResultImage(data.bgImage);
        setView('result');
        setGenerating(false);
        setChat([]);
        setRefineMode(null);
        setRefineStep1('');
        setRefineStep2('');
      } else {
        setView('result');
        setChat([{ role: 'bot', text: '생성에 실패했어요.' }]);
        setGenerating(false);
      }
    } catch (e) {
      setView('result');
      setChat([{ role: 'bot', text: e instanceof Error ? e.message : '오류가 발생했어요.' }]);
      setGenerating(false);
    }
  }

  // 수정 요청 (결과 화면)
  async function handleRefine() {
    const instruction = refineInput.trim();
    if (!instruction || !resultImage || refining) return;
    setRefineInput('');
    setRefining(true);
    setChat(prev => [...prev, { role: 'user', text: instruction }]);

    try {
      const res = await fetch('/api/pop/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previousImage: resultImage, instruction }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setResultImage(data.imageUrl);
        setChat(prev => [...prev, { role: 'bot', text: '수정 완료. 추가 수정이 필요하면 위 버튼을 선택해주세요.' }]);
      } else {
        setChat(prev => [...prev, { role: 'bot', text: '수정에 실패했어요. 다른 표현으로 다시 말해주세요.' }]);
      }
    } catch {
      setChat(prev => [...prev, { role: 'bot', text: '오류가 발생했어요.' }]);
    } finally {
      setRefining(false);
    }
  }

  function submitGuidedRefine() {
    let prompt = '';
    if (refineMode === 'text' && refineStep1 === '__ADD__' && refineStep2.trim()) {
      prompt = `이미지에 '${refineStep2.trim()}' 텍스트를 크고 눈에 띄게 추가해줘. 기존 이미지는 그대로 유지.`;
    } else if (refineMode === 'text' && refineStep1.trim() && refineStep2.trim()) {
      prompt = `이미지에서 '${refineStep1.trim()}' 텍스트를 '${refineStep2.trim()}'(으)로 바꿔줘. 나머지는 그대로 유지.`;
    } else if (refineMode === 'color' && refineStep1.trim()) {
      prompt = `전체 색감/분위기를 ${refineStep1.trim()} 느낌으로 바꿔줘. 텍스트와 레이아웃은 그대로 유지.`;
    } else if (refineMode === 'bg' && refineStep1.trim()) {
      prompt = `배경을 ${refineStep1.trim()}(으)로 바꿔줘. 텍스트와 상품 이미지는 그대로 유지.`;
    }
    if (!prompt || !resultImage || refining) return;
    setRefineMode(null);
    setRefineStep1('');
    setRefineStep2('');
    setRefineInput('');
    setRefining(true);
    setChat([{ role: 'user', text: prompt }]);

    fetch('/api/pop/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ previousImage: resultImage, instruction: prompt }),
    }).then(res => res.json()).then(data => {
      if (data.imageUrl) {
        setResultImage(data.imageUrl);
        setChat([{ role: 'bot', text: '수정 완료.' }]);
      } else {
        setChat([{ role: 'bot', text: '수정에 실패했습니다. 다시 시도해주세요.' }]);
      }
    }).catch(() => {
      setChat([{ role: 'bot', text: '오류가 발생했습니다.' }]);
    }).finally(() => {
      setRefining(false);
    });
  }

  function handleDownload() {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.download = `pop-${popType}.png`;
    link.href = resultImage;
    link.click();
  }

  // ═══════════════════════════════════════════
  // 생성 중 오버레이 (모든 view 공통)
  // ═══════════════════════════════════════════
  // 오버레이 없음 — 버튼에서 직접 로딩 표시

  // ═══════════════════════════════════════════
  // 랜딩
  // ═══════════════════════════════════════════
  if (view === 'landing') {
    return (
      <div className="flex flex-col h-full">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-grey-100 pt-safe">
          <div className="px-5 py-3 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-[18px]">POP 메이커</h1>
              <p className="text-[15px] text-grey-400 mt-0.5">편의점 POP를 자동으로 만들어드려요</p>
            </div>
            <span className="text-[14px] font-medium text-primary-500 bg-primary-100 px-2.5 py-1 rounded-full">BETA</span>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto px-4 py-5">
          <div className="bg-gradient-to-br from-primary-100 to-violet-50 rounded-2xl p-5 mb-5 border border-primary-100">
            <p className="text-[16px] font-bold text-grey-800">어떤 POP를 만들고 싶으세요?</p>
            <p className="text-[15px] text-grey-500 mt-1">A4 용지에 인쇄해서 바로 매장에 붙일 수 있어요.</p>
          </div>

          <div className="space-y-4">
            {POP_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => enterForm(t.value)}
                className="w-full bg-white rounded-2xl border border-grey-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform text-left"
              >
                <div className="flex">
                  <div className="w-28 h-28 shrink-0 bg-grey-100 overflow-hidden border-r border-grey-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/example/${t.value}`}
                      alt={`${t.label} 예시`}
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition:
                          t.value === 'poster' ? 'center 40%'
                          : t.value === 'badge' ? 'center 55%'
                          : 'center center',
                        transform:
                          t.value === 'badge' ? 'scale(1.3)'
                          : undefined,
                        transformOrigin:
                          t.value === 'badge' ? 'center 55%'
                          : undefined,
                      }}
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                    />
                  </div>
                  <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-bold text-[17px] text-grey-900 mb-2">{t.label}</h3>
                      <p className="text-[16px] text-grey-500 leading-snug">{t.detail}</p>
                    </div>
                    <p className="text-[16px] text-primary-500 font-medium mt-2">
                      {t.count.세로 === t.count.가로
                        ? `A4 한 장에 ${t.count.세로}`
                        : `세로 ${t.count.세로} · 가로 ${t.count.가로}`}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

        </main>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // 폼 (위저드)
  // ═══════════════════════════════════════════
  // ═══════════════════════════════════════════
  // Canvas POP (배지/선반/띠지) — 단일 페이지 + 실시간 미리보기
  // ═══════════════════════════════════════════
  if (view === 'form' && popType !== 'poster') {
    return (
      <div className="flex flex-col h-full">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-grey-100 pt-safe">
          <div className="h-14 px-3 flex items-center gap-3">
            <button onClick={backToLanding}
              className="w-9 h-9 rounded-full flex items-center justify-center text-grey-500 active:bg-grey-100">
              <span className="text-xl">←</span>
            </button>
            <h1 className="font-bold text-[17px] leading-tight">{currentType.label}</h1>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto pb-32">
          {/* 이렇게 나와요 — 샘플 미리보기 */}
          <PreviewBar popType={popType} orientation={orientation} previewImage={previewImage} previewLoading={previewLoading} />

          {/* 옵션 카드 스택 */}
          <div className="px-4 py-4 space-y-4">
            {/* POP 문구 */}
            <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
              <p className="text-[16px] font-bold text-grey-700 mb-2">POP 문구</p>
              <div className="flex flex-wrap gap-3">
                {BADGE_PRESETS.map(b => {
                  const active = badgeType === b;
                  return (
                    <button key={b} onClick={() => { setBadgeType(b); setBadgeFromPreset(true); }}
                      className={`px-3.5 py-2 rounded-lg text-[15px] font-bold border ${
                        active ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-grey-700 border-grey-200'
                      }`}>{b}</button>
                  );
                })}
              </div>
              <textarea
                value={badgeType === '없음' ? '' : badgeType}
                onChange={e => { setBadgeType(e.target.value); setBadgeFromPreset(false); }}
                placeholder="직접 입력"
                rows={2}
                className="input resize-none mt-2 text-[16px]" />
            </div>

            {/* 상품 (이미지 + 이름 + 가격) — 배지는 문구만 사용하므로 제외 */}
            {popType !== 'badge' && products.map((p, i) => {
              const photoRes = photoResolutions.find(r => r.productIndex === i);
              return (
                <div key={i} data-product-card className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[16px] font-bold text-grey-700">상품 정보{products.length > 1 ? ` ${i + 1}` : ''}</span>
                    {products.length > 1 && (
                      <button onClick={() => removeProduct(i)} className="text-[16px] text-danger-500">삭제</button>
                    )}
                  </div>

                  <input type="text" value={p.name}
                    onChange={e => updateProduct(i, 'name', e.target.value)}
                    placeholder="상품 이름 (예: 신라면)" className="input" />

                  <div className="flex gap-3">
                    <input type="text"
                      defaultValue={p.displayName || ''}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val.length >= 1) {
                            updateProduct(i, 'displayName', val);
                            setPhotoSearched(false);
                            searchProductPhotos({ name: val, index: i });
                          } else {
                            // 검색어 비었거나 너무 짧으면 해당 상품 결과 초기화
                            setPhotoResolutions(prev => prev.filter(r => r.productIndex !== i));
                          }
                        }
                      }}
                      placeholder="상품명으로 이미지 찾기" className="input flex-1" />
                    <button onClick={(e) => {
                      const input = (e.currentTarget.parentElement!.querySelector('input') as HTMLInputElement);
                      const val = input.value.trim();
                      if (val.length >= 1) {
                        updateProduct(i, 'displayName', val);
                        setPhotoSearched(false);
                        searchProductPhotos({ name: val, index: i });
                      } else {
                        setPhotoResolutions(prev => prev.filter(r => r.productIndex !== i));
                      }
                    }} className="px-4 rounded-xl bg-primary-500 text-white text-[16px] font-bold active:bg-primary-600">
                      검색
                    </button>
                  </div>

                  {/* 사진 영역 — 고정 높이, background-image로 크기 점프 방지 */}
                  <div className="rounded-xl overflow-hidden bg-grey-100 border border-grey-200 relative flex items-center justify-center"
                    style={{
                      height: 200,
                      backgroundImage: photoRes?.imageUrl ? `url(${displayUrl(photoRes.bgRemovedUrl || photoRes.imageUrl)})` : undefined,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}>
                    {!photoRes?.imageUrl && photoRes?.status !== 'searching' && (
                      <p className={`text-[16px] ${photoRes?.status === 'missing' ? 'text-danger-500' : 'text-grey-400'}`}>
                        {photoRes?.status === 'missing' ? '검색 결과가 없습니다' : '사진 미리보기 영역'}
                      </p>
                    )}
                    {photoRes?.status === 'searching' && (
                      <div className="w-6 h-6 border-2 border-grey-200 border-t-primary-500 rounded-full animate-spin" />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <button onClick={() => photoUploadClick(i)}
                      className="py-2.5 rounded-lg text-[14px] font-bold bg-white border border-grey-300 text-grey-700 active:bg-grey-100">
                      직접 올리기
                    </button>
                    <button onClick={() => photoFindAnother(i)} disabled={!photoRes?.candidates || photoRes.candidates.length <= 1}
                      className="py-2.5 rounded-lg text-[14px] font-bold bg-white border border-grey-300 text-grey-700 active:bg-grey-100 disabled:opacity-40">
                      다른 이미지
                    </button>
                    <button
                      disabled={!photoRes?.imageUrl || !!photoRes?.bgRemovedUrl || !!photoRes?.bgRemoving}
                      onClick={async () => {
                        if (!photoRes?.imageUrl) return;
                        setPhotoResolutions(prev => prev.map(r => r.productIndex === i ? { ...r, bgRemoving: true } : r));
                        try {
                          let base64 = photoRes.imageUrl;
                          if (!base64.startsWith('data:')) {
                            const resp = await fetch(displayUrl(base64));
                            const blob = await resp.blob();
                            base64 = await new Promise<string>(res => {
                              const reader = new FileReader();
                              reader.onloadend = () => res(reader.result as string);
                              reader.readAsDataURL(blob);
                            });
                          }
                          const bgRes = await fetch('/api/remove-bg', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ imageBase64: base64 }),
                          });
                          if (bgRes.ok) {
                            const data = await bgRes.json();
                            if (data.imageBase64) {
                              setPhotoResolutions(prev => prev.map(r => r.productIndex === i ? { ...r, bgRemovedUrl: data.imageBase64, bgRemoving: false } : r));
                              return;
                            }
                          }
                        } catch {}
                        setPhotoResolutions(prev => prev.map(r => r.productIndex === i ? { ...r, bgRemoving: false } : r));
                      }}
                      className={`py-2.5 rounded-lg text-[14px] font-bold border active:bg-grey-100 ${
                        photoRes?.bgRemovedUrl ? 'bg-success-100 border-success-500 text-success-600' : 'bg-white border-grey-300 text-grey-700'
                      } disabled:opacity-40`}>
                      {photoRes?.bgRemoving ? '제거 중...' : photoRes?.bgRemovedUrl ? '제거 완료' : '배경 제거'}
                    </button>
                  </div>
                  {photoRes?.imageUrl && (
                    <button onClick={() => setPhotoResolutions(prev => prev.map(r => r.productIndex === i ? { ...r, imageUrl: undefined, bgRemovedUrl: undefined, status: 'missing', candidates: undefined } : r))}
                      className="w-full py-1.5 text-[14px] text-danger-500">
                      사진 없이 만들기
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" inputMode="numeric" value={p.price}
                      onChange={e => updateProduct(i, 'price', e.target.value)}
                      placeholder="할인가" className="input" />
                    <input type="number" inputMode="numeric" value={p.originalPrice}
                      onChange={e => updateProduct(i, 'originalPrice', e.target.value)}
                      placeholder="정가" className="input text-grey-500" />
                  </div>
                </div>
              );
            })}

            {popType !== 'badge' && (() => {
              const maxProducts = popType === 'banner' ? (orientation === '가로' ? 3 : 4) : (orientation === '가로' ? 3 : 4);
              return products.length < maxProducts ? (
                <button onClick={() => {
                  addProduct();
                  setTimeout(() => {
                    const cards = document.querySelectorAll('[data-product-card]');
                    const last = cards[cards.length - 1];
                    if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-grey-300 bg-transparent text-[15px] text-primary-600 font-bold active:bg-primary-100">
                  + 상품 추가 <span className="text-grey-400 font-medium ml-1">({products.length}/{maxProducts})</span>
                </button>
              ) : null;
            })()}

            {/* 배경색 */}
            {(popType === 'shelf' || popType === 'banner' || popType === 'badge') && (
              <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[16px] font-bold text-grey-700">배경색</span>
                  <span className="text-[14px] text-grey-400">{colorName(bgColor)}</span>
                </div>
                <input ref={resolveFileRef} type="file" accept="image/*" onChange={photoFileChange} className="hidden" />
                <div className="grid grid-cols-8 gap-3">
                  {BG_COLORS.map(c => {
                    const active = bgColor === c.hex;
                    return (
                      <button key={c.hex} onClick={() => setBgColor(c.hex)}
                        className={`aspect-square rounded-xl active:scale-90 ${active ? 'ring-2 ring-offset-2 ring-primary-500' : ''}`}
                        style={{ backgroundColor: c.hex }} title={c.name} />
                    );
                  })}
                </div>
              </div>
            )}

            {/* 방향 */}
            <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
              <span className="text-[16px] font-bold text-grey-700 block mb-2">용지 방향</span>
              <div className="grid grid-cols-2 gap-3">
                {(['세로', '가로'] as const).map(o => {
                  const active = orientation === o;
                  return (
                    <button key={o} onClick={() => setOrientation(o)}
                      className={`py-3 rounded-xl text-[16px] font-bold border-2 ${
                        active ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-grey-600 border-grey-200'
                      }`}>{o}</button>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-lg border-t border-grey-100 px-4 pt-3 pb-3">
          {generating && popType === 'poster' && (
            <p className="text-[14px] text-grey-500 text-center mb-2">⚠️ 페이지를 벗어나면 생성이 중단됩니다.</p>
          )}
          <button onClick={() => confirmAndGenerate()} disabled={generating}
            className="relative w-full py-4 rounded-2xl text-white font-bold text-base bg-gradient-to-r from-primary-500 to-violet-500 shadow-lg shadow-primary-500/30 disabled:opacity-60 overflow-hidden">
            {generating && popType === 'poster' && (
              <span className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-500 ease-out"
                style={{ width: `${genProgress}%` }} />
            )}
            <span className="relative inline-flex items-center justify-center gap-3">
              {generating && popType !== 'poster' && (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {generating ? (popType === 'poster' ? `생성 중... ${genProgress}%` : '생성 중...') : 'POP 만들기'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (view === 'form') {
    // 단계 제목 / 설명
    let stepTitle = '', stepDesc = '';
    if (popType === 'badge') {
      [stepTitle, stepDesc] = [
        ['배지 문구', '배지에 들어갈 문구를 선택해주세요.'],
        ['배경색', '배지 바탕색을 선택해주세요.'],
        ['용지 방향', 'A4 인쇄 방향을 선택해주세요.'],
      ][wizardStep - 1] as [string, string];
    } else if (popType === 'poster') {
      [stepTitle, stepDesc] = [
        ['POP 문구', '포스터에 크게 들어갈 문구를 입력해주세요.'],
        ['상품 정보', '포스터에 넣을 상품을 입력해주세요.\n상품이 많아도 포스터 한 장에 배치할 수 있어요.'],
        ['분위기와 방향', '배경 분위기와 용지 방향을 선택해주세요.'],
      ][wizardStep - 1] as [string, string];
    } else {
      [stepTitle, stepDesc] = [
        ['POP 문구', 'POP에 들어갈 문구를 선택해주세요.'],
        ['상품 정보', 'POP에 표시할 상품 이름과 가격이에요.\n건너뛰어도 돼요.'],
        ['사진과 마무리', '상품 사진 사용 여부, 용지 방향, 배경색을 선택해주세요.'],
      ][wizardStep - 1] as [string, string];
    }

    const canNext = (() => {
      if (popType === 'badge') {
        if (wizardStep === 1) return badgeType && badgeType !== '없음';
        return true;
      }
      // 포스터/선반/띠지: 상품명 없어도 넘어갈 수 있음 (문구만으로 OK)
      return true;
    })();

    return (
      <div className="flex flex-col h-full">
        {/* 로딩은 버튼에 표시 */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-grey-100 pt-safe">
          <div className="h-14 px-3 flex items-center gap-3">
            <button onClick={prevStep}
              className="w-9 h-9 rounded-full flex items-center justify-center text-grey-500 active:bg-grey-100">
              <span className="text-xl">←</span>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-[17px] leading-tight">{currentType.label}</h1>
              <p className="text-[16px] text-grey-400 leading-tight">단계 {wizardStep} / {totalSteps}</p>
            </div>
          </div>
          {/* 진행 바 */}
          <div className="h-1 bg-grey-100">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-violet-500 transition-all"
              style={{ width: `${(wizardStep / totalSteps) * 100}%` }}
            />
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4 pb-32">
          {/* 단계 제목 */}
          <div>
            <h2 className="text-[20px] font-bold text-grey-900">{stepTitle}</h2>
            <p className="text-[16px] text-grey-500 mt-2 leading-relaxed whitespace-pre-line">{stepDesc}</p>
          </div>

          {/* ─── 포스터 Step 2: 상품 정보 ─── */}
          {popType === 'poster' && wizardStep === 2 && (
            <div className="space-y-4">
              {products.map((p, i) => (
                <div key={i} className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm space-y-4">
                  {products.length > 1 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[16px] text-grey-400 font-bold uppercase tracking-wider">상품 {i + 1}</span>
                      <button onClick={() => removeProduct(i)} className="text-[16px] text-danger-500 font-medium active:text-danger-700">삭제</button>
                    </div>
                  )}
                  {/* 사진 검색/미리보기 — 이 입력이 상품 이름 역할 겸함 */}
                  {(() => {
                    const pr = photoResolutions.find(r => r.productIndex === i);
                    return (
                      <>
                        <div>
                          <label className="text-[16px] font-bold text-grey-500 block mb-2">상품 이름 / 사진 검색</label>
                          <div className="flex gap-3">
                            <input type="text"
                              value={p.name}
                              onChange={e => updateProduct(i, 'name', e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                  const val = p.name.trim();
                                  if (val.length >= 1) {
                                    setPhotoSearched(false);
                                    searchProductPhotos({ name: val, index: i });
                                  } else {
                                    setPhotoResolutions(prev => prev.filter(r => r.productIndex !== i));
                                  }
                                }
                              }}
                              placeholder="예: 카스 후레쉬 500ml" className="input flex-1" />
                            <button onClick={() => {
                              const val = p.name.trim();
                              if (val.length >= 1) {
                                setPhotoSearched(false);
                                searchProductPhotos({ name: val, index: i });
                              } else {
                                setPhotoResolutions(prev => prev.filter(r => r.productIndex !== i));
                              }
                            }} className="px-4 rounded-xl bg-primary-500 text-white text-[16px] font-bold active:bg-primary-600">
                              검색
                            </button>
                          </div>
                          <p className="text-[16px] text-grey-400 mt-2">브랜드·용량까지 자세히 적으면 사진이 정확하게 검색돼요.</p>
                        </div>

                        <div className="rounded-xl overflow-hidden bg-grey-100 border border-grey-200 relative flex items-center justify-center"
                          style={{
                            height: 200,
                            backgroundImage: pr?.imageUrl ? `url(${displayUrl(pr.bgRemovedUrl || pr.imageUrl)})` : undefined,
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                          }}>
                          {pr?.status === 'searching' && (
                            <div className="w-6 h-6 border-2 border-grey-200 border-t-primary-500 rounded-full animate-spin" />
                          )}
                          {!pr?.imageUrl && pr?.status !== 'searching' && (
                            <p className={`text-[16px] ${pr?.status === 'missing' ? 'text-danger-500' : 'text-grey-400'}`}>
                              {pr?.status === 'missing' ? '검색 결과가 없습니다' : '사진 미리보기 영역'}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          <button onClick={() => photoUploadClick(i)}
                            className="py-2.5 rounded-lg text-[14px] font-bold bg-white border border-grey-300 text-grey-700 active:bg-grey-100">
                            직접 올리기
                          </button>
                          <button onClick={() => photoFindAnother(i)}
                            disabled={!pr?.candidates || pr.candidates.length <= 1}
                            className="py-2.5 rounded-lg text-[14px] font-bold bg-white border border-grey-300 text-grey-700 active:bg-grey-100 disabled:opacity-40">
                            다른 이미지
                          </button>
                          <button onClick={() => photoUseAI(i)}
                            className={`py-2.5 rounded-lg text-[14px] font-bold border ${
                              pr?.status === 'ai_generate'
                                ? 'bg-violet-500 text-white border-violet-500'
                                : 'bg-white border-grey-300 text-grey-700 active:bg-grey-100'
                            }`}>
                            AI가 그리기
                          </button>
                        </div>
                        {pr?.imageUrl && (
                          <button
                            onClick={() => setPhotoResolutions(prev => prev.filter(r => r.productIndex !== i))}
                            className="w-full py-1.5 text-[14px] text-danger-500">
                            사진 없이 만들기
                          </button>
                        )}
                      </>
                    );
                  })()}

                  {/* 상품별 강조 문구 (선택) — 이 상품에만 따로 적는 내용 */}
                  <div>
                    <label className="text-[16px] font-bold text-grey-500 block mb-2">이 상품에만 사용할 문구</label>
                    <input type="text"
                      value={p.badge || ''}
                      onChange={e => updateProduct(i, 'badge', e.target.value)}
                      placeholder="예: 2,500원, 1+1, NEW, 사장님 추천" className="input" />
                    <p className="text-[16px] text-grey-400 mt-2">이 상품에만 따로 표시하고 싶은 내용을 적으세요.<br />따로 표시할 내용이 없다면 비워둬도 돼요.</p>
                  </div>
                </div>
              ))}
              <button onClick={addProduct}
                className="w-full py-3 rounded-xl border-2 border-dashed border-grey-300 bg-transparent text-[15px] text-primary-600 font-bold active:bg-primary-100">
                + 상품 추가
              </button>
            </div>
          )}

          {/* ─── 선반/띠지 Step 1: 강조 문구 + 사진 ON/OFF ─── */}
          {(popType === 'shelf' || popType === 'banner') && wizardStep === 1 && (
            <div className="space-y-4">
              {/* 강조 문구 */}
              <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
                <label className="text-[16px] font-bold text-grey-500 block mb-3">POP에 넣을 문구</label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {BADGE_PRESETS.map(b => {
                    const active = badgeType === b;
                    return (
                      <button key={b} onClick={() => { setBadgeType(b); setBadgeFromPreset(true); }}
                        className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all active:scale-95 border ${
                          active ? 'bg-primary-500 text-white border-primary-500 shadow-sm' : 'bg-white text-grey-700 border-grey-200'
                        }`}>
                        {b}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 items-start">
                  <textarea
                    value={badgeType === '없음' ? '' : badgeType}
                    onChange={e => { setBadgeType(e.target.value); setBadgeFromPreset(false); setAiSuggestion(null); }}
                    placeholder="직접 입력 (예: 3개 사면 1개 더!)"
                    rows={2}
                    className="input resize-none flex-1" />
                  {!aiSuggestion && !aiSuggesting && (
                    <button
                      onClick={requestAISuggestion}
                      className="shrink-0 px-3 py-2.5 rounded-xl text-[16px] font-bold text-violet-600 bg-violet-50 border border-violet-200 active:bg-violet-100 self-stretch flex items-center">
                      AI 추천
                    </button>
                  )}
                  {aiSuggesting && (
                    <div className="shrink-0 px-3 py-2.5 flex items-center">
                      <div className="w-5 h-5 border-2 border-grey-200 border-t-violet-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {aiSuggestion && !aiSuggesting && (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mt-2">
                    <p className="text-[16px] font-bold text-violet-500 mb-2">AI 추천 문구</p>
                    <p className="text-[16px] font-bold text-grey-900 mb-4 whitespace-pre-wrap">{aiSuggestion}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setBadgeType(aiSuggestion); setAiSuggestion(null); }}
                        className="flex-1 py-2 rounded-lg text-[15px] font-bold text-white bg-violet-500 active:bg-violet-600">
                        적용
                      </button>
                      <button
                        onClick={() => requestAISuggestion()}
                        className="flex-1 py-2 rounded-lg text-[15px] font-bold text-violet-600 bg-white border border-violet-300 active:bg-violet-50">
                        다시 추천
                      </button>
                      <button
                        onClick={() => setAiSuggestion(null)}
                        className="flex-1 py-2 rounded-lg text-[15px] font-bold text-grey-600 bg-white border border-grey-300 active:bg-grey-100">
                        닫기
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ─── 선반/띠지 Step 2: 상품 정보 (선택) ─── */}
          {(popType === 'shelf' || popType === 'banner') && wizardStep === 2 && (
            <div className="space-y-4">
              {products.map((p, i) => (
                <div key={i} className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm space-y-4">
                  {products.length > 1 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[16px] text-grey-400 font-bold uppercase tracking-wider">상품 {i + 1}</span>
                      <button onClick={() => removeProduct(i)} className="text-[16px] text-danger-500 font-medium active:text-danger-700">삭제</button>
                    </div>
                  )}
                  <div>
                    <label className="text-[16px] font-bold text-grey-500 block mb-2">상품 이름</label>
                    <input type="text" value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)}
                      placeholder="예: 신라면" className="input" />
                  </div>
                  {/* 가격 */}
                  {!priceOpen[i] ? (
                    <button onClick={() => setPriceOpen(prev => ({ ...prev, [i]: true }))}
                      className="w-full py-2.5 rounded-xl text-[16px] font-medium text-grey-500 bg-grey-100 border border-grey-200 active:bg-grey-100 text-left px-3">
                      + 가격 입력
                    </button>
                  ) : (
                    <div className="space-y-2 bg-grey-100 rounded-xl p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[16px] font-bold text-grey-600">가격</span>
                        <button onClick={() => { setPriceOpen(prev => ({ ...prev, [i]: false })); updateProduct(i, 'price', ''); updateProduct(i, 'originalPrice', ''); }}
                          className="text-[16px] text-grey-400 active:text-grey-600">삭제</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[16px] text-grey-500 block mb-2">판매가</label>
                          <input type="number" inputMode="numeric" value={p.price}
                            onChange={e => updateProduct(i, 'price', e.target.value)}
                            placeholder="2,500" className="input" />
                        </div>
                        <div>
                          <label className="text-[16px] text-grey-400 block mb-2">정가</label>
                          <input type="number" inputMode="numeric" value={p.originalPrice}
                            onChange={e => updateProduct(i, 'originalPrice', e.target.value)}
                            placeholder="3,200" className="input text-grey-400" />
                        </div>
                      </div>
                      <p className="text-[16px] text-grey-400">판매가만 입력하면 가격 표시, 정가도 입력하면 할인 표시(취소선)가 돼요.</p>
                    </div>
                  )}
                </div>
              ))}
              {(() => {
                // 띠지/선반 방향별 상품 최대 개수
                const maxProducts = popType === 'banner'
                  ? (orientation === '가로' ? 3 : 4)
                  : popType === 'shelf'
                  ? (orientation === '가로' ? 3 : 4)
                  : 99;
                return products.length < maxProducts ? (
                  <button onClick={addProduct}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-grey-300 text-[16px] text-primary-500 font-bold active:bg-primary-100">
                    + 상품 추가 <span className="text-[14px] text-grey-400 ml-1">({products.length}/{maxProducts})</span>
                  </button>
                ) : (
                  <p className="text-[14px] text-grey-400 text-center py-2">
                    {orientation} 방향은 상품 최대 {maxProducts}개까지
                  </p>
                );
              })()}
            </div>
          )}

          {/* ─── 포스터 Step 2: 강조 문구 + 분위기 ─── */}
          {/* ─── 포스터 Step 1: POP 문구 ─── */}
          {popType === 'poster' && wizardStep === 1 && (
            <div className="space-y-4">
              {/* 강조 문구 — 선반/띠지와 동일한 구조 */}
              <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
                <label className="text-[16px] font-bold text-grey-500 block mb-3">POP에 넣을 문구</label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {BADGE_PRESETS.map(b => {
                    const active = badgeType === b;
                    return (
                      <button key={b} onClick={() => { setBadgeType(b); setBadgeFromPreset(true); }}
                        className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all active:scale-95 border ${
                          active ? 'bg-primary-500 text-white border-primary-500 shadow-sm' : 'bg-white text-grey-700 border-grey-200'
                        }`}>
                        {b}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 items-start">
                  <textarea
                    value={badgeType === '없음' ? '' : badgeType}
                    onChange={e => { setBadgeType(e.target.value); setBadgeFromPreset(false); setAiSuggestion(null); }}
                    placeholder="직접 입력 (예: 4캔 10,000원, 3개 사면 1개 더!)"
                    rows={2}
                    className="input resize-none flex-1"
                  />
                  {/* AI 문구 추천 — 문구 입력 옆에 배치 */}
                  {!aiSuggestion && !aiSuggesting && (
                    <button
                      onClick={requestAISuggestion}
                      className="shrink-0 px-3 py-2.5 rounded-xl text-[16px] font-bold text-violet-600 bg-violet-50 border border-violet-200 active:bg-violet-100 self-stretch flex items-center">
                      AI 추천
                    </button>
                  )}
                  {aiSuggesting && (
                    <div className="shrink-0 px-3 py-2.5 flex items-center">
                      <div className="w-5 h-5 border-2 border-grey-200 border-t-violet-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {aiSuggestion && !aiSuggesting && (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mt-2">
                    <p className="text-[16px] font-bold text-violet-500 mb-2">AI 추천 문구</p>
                    <p className="text-[16px] font-bold text-grey-900 mb-4 whitespace-pre-wrap">{aiSuggestion}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setBadgeType(aiSuggestion); setAiSuggestion(null); }}
                        className="flex-1 py-2 rounded-lg text-[15px] font-bold text-white bg-violet-500 active:bg-violet-600">
                        적용
                      </button>
                      <button
                        onClick={() => requestAISuggestion()}
                        className="flex-1 py-2 rounded-lg text-[15px] font-bold text-violet-600 bg-white border border-violet-300 active:bg-violet-50">
                        다시 추천
                      </button>
                      <button
                        onClick={() => setAiSuggestion(null)}
                        className="flex-1 py-2 rounded-lg text-[15px] font-bold text-grey-600 bg-white border border-grey-300 active:bg-grey-100">
                        닫기
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ─── 사진 자동 검색 + resolve (포스터 Step 3, 선반/띠지 Step 3) ─── */}
          {popType !== 'badge' && wizardStep === photoStep && (
            <div className="space-y-4">
              <input ref={resolveFileRef} type="file" accept="image/*" onChange={photoFileChange} className="hidden" />

              {/* 사진 ON/OFF — 선반/띠지만 (포스터는 사진 단계에서 상품별로 직접/AI/없이 선택) */}
              {(popType === 'shelf' || popType === 'banner') && (
                <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-3">
                      <p className="text-[16px] font-bold text-grey-800">상품 사진 사용</p>
                      <p className="text-[16px] text-grey-500 mt-0.5">
                        {photoEnabled ? '상품 사진을 POP에 넣어요.' : '텍스트만으로 만들어요.'}
                      </p>
                    </div>
                    <button
                      onClick={() => togglePhoto(!photoEnabled)}
                      className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${
                        photoEnabled ? 'bg-primary-500' : 'bg-grey-300'
                      }`}>
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${
                        photoEnabled ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>
                  {photoEnabled && (
                    <div className="mt-3 pt-3 border-t border-grey-100">
                      <label className="text-[16px] font-bold text-grey-500 block mb-2">검색할 상품명</label>
                      <input type="text" value={photoSearchName}
                        onChange={e => { setPhotoSearchName(e.target.value); setPhotoSearched(false); setPhotoResolutions([]); }}
                        placeholder="예: 농심 신라면 5개입 봉지" className="input" />
                      <p className="text-[16px] text-grey-400 mt-2">브랜드·용량까지 자세히 적으면 사진이 정확하게 검색돼요.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 분위기 — 포스터 전용 (배경 이미지 생성에 사용) */}
              {popType === 'poster' && (
                <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
                  <label className="text-[16px] font-bold text-grey-500 block mb-2">배경 분위기</label>
                  <p className="text-[16px] text-grey-400 mb-4">
                    여기서 고른 분위기로 <strong className="text-violet-500">배경 이미지</strong>가 만들어집니다.<br />비워두면 상품에 맞춰 자동으로 정해져요.
                  </p>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {[
                      { label: '맥주/음료', val: '차가운 얼음과 물방울이 맺힌 시원한 느낌, 어두운 네이비 배경, 맥주 TV 광고 스타일' },
                      { label: '라면/분식', val: '뜨끈한 김이 모락모락, 빨간색과 주황색 불꽃 효과, 라면 TV 광고처럼 따뜻하고 역동적인 느낌' },
                      { label: '과자/디저트', val: '달콤한 파스텔 핑크와 크림색 배경, 부드러운 조명, 디저트 브랜드 광고 느낌' },
                      { label: '건강식', val: '깨끗하고 신선한 초록과 흰색 배경, 자연광, 건강식 브랜드 광고 느낌' },
                      { label: '할인/특가', val: '강렬한 빨간색과 노란색, 폭발적인 세일 배너, 대형마트 할인 광고 느낌' },
                      { label: '프리미엄', val: '어두운 블랙 배경에 골드 포인트, 고급 브랜드 광고처럼 미니멀하고 세련된 느낌' },
                    ].map(p => (
                      <button key={p.label} onClick={() => setMoodDesc(p.val)}
                        className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all active:scale-95 border ${
                          moodDesc === p.val ? 'bg-violet-500 text-white border-violet-500 shadow-sm' : 'bg-white text-grey-700 border-grey-200'
                        }`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3 items-start">
                    <textarea
                      value={moodDesc}
                      onChange={e => { setMoodDesc(e.target.value); setMoodSuggestion(null); }}
                      placeholder="직접 입력 (예: 여름 해변 느낌, 크리스마스 분위기)"
                      rows={2}
                      className="input resize-none flex-1"
                    />
                    {!moodSuggestion && !moodSuggesting && (
                      <button
                        onClick={requestMoodSuggestion}
                        className="shrink-0 px-3 py-2.5 rounded-xl text-[16px] font-bold text-violet-600 bg-violet-50 border border-violet-200 active:bg-violet-100 self-stretch flex items-center">
                        AI 추천
                      </button>
                    )}
                    {moodSuggesting && (
                      <div className="shrink-0 px-3 py-2.5 flex items-center">
                        <div className="w-5 h-5 border-2 border-grey-200 border-t-violet-500 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {moodSuggestion && !moodSuggesting && (
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mt-2">
                      <p className="text-[16px] font-bold text-violet-500 mb-2">AI 추천 분위기</p>
                      <p className="text-[16px] font-bold text-grey-900 mb-4 whitespace-pre-wrap">{moodSuggestion}</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setMoodDesc(moodSuggestion); setMoodSuggestion(null); }}
                          className="flex-1 py-2 rounded-lg text-[15px] font-bold text-white bg-violet-500 active:bg-violet-600">
                          적용
                        </button>
                        <button
                          onClick={() => requestMoodSuggestion()}
                          className="flex-1 py-2 rounded-lg text-[15px] font-bold text-violet-600 bg-white border border-violet-300 active:bg-violet-50">
                          다시 추천
                        </button>
                        <button
                          onClick={() => setMoodSuggestion(null)}
                          className="flex-1 py-2 rounded-lg text-[15px] font-bold text-grey-600 bg-white border border-grey-300 active:bg-grey-100">
                          닫기
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 사진 OFF면 안내만 */}
              {!photoEnabled && (
                <div className="py-4 text-center text-grey-400 text-[16px]">
                  사진 없이 만들기로 설정됨.
                </div>
              )}

              {/* 포스터는 사진을 Step 2에서 이미 처리 — 여기선 분위기/방향만 */}
              {popType !== 'poster' && photoEnabled && photoResolutions.length === 0 && !photoSearched && (
                <div className="py-10 text-center text-grey-400 text-[16px]">사진 검색 중...</div>
              )}

              {popType !== 'poster' && photoEnabled && photoResolutions.map(r => {
                const bgClass = r.status === 'missing' ? 'border-grey-200 bg-grey-100'
                  : r.status === 'user_uploaded' ? 'border-primary-200 bg-primary-100'
                  : r.status === 'ai_generate' ? 'border-violet-200 bg-violet-50'
                  : 'border-grey-100 bg-white';
                const statusLabel = r.status === 'searching' ? '검색 중...'
                  : r.status === 'found' ? '자동 검색됨'
                  : r.status === 'user_uploaded' ? '직접 올림'
                  : r.status === 'ai_generate' ? 'AI 생성 예정'
                  : '검색 결과 없음 — 직접 올려주세요';
                return (
                  <div key={r.productIndex} className={`rounded-2xl border-2 p-3 shadow-sm ${bgClass}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-bold text-grey-800 truncate">{r.name}</p>
                        <p className="text-[16px] text-grey-500 mt-0.5">{statusLabel}</p>
                      </div>
                    </div>
                    <div className="w-full rounded-xl bg-white border border-grey-200 flex items-center justify-center overflow-hidden" style={{ height: 200 }}>
                      {r.status === 'searching' ? (
                        <div className="w-6 h-6 border-2 border-grey-200 border-t-primary-500 rounded-full animate-spin" />
                      ) : r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={displayUrl(r.imageUrl)} alt={r.name}
                          className="w-full h-full object-contain"
                          onError={(e) => { e.preventDefault(); (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      ) : r.status === 'ai_generate' ? (
                        <span className="text-[17px] text-violet-600 font-bold">AI가 그릴 예정</span>
                      ) : (
                        <span className="text-[16px] text-grey-400 text-center px-2">검색 결과 없음<br />아래에서 직접 올려주세요</span>
                      )}
                    </div>
                    {r.status !== 'searching' && (
                      <>
                        <div className="grid grid-cols-3 gap-3.5 mt-3">
                          <button onClick={() => photoUploadClick(r.productIndex)}
                            className="py-2 rounded-lg text-[14px] font-bold bg-white border border-grey-300 text-grey-700 active:bg-grey-100">
                            직접 올리기
                          </button>
                          <button onClick={() => photoFindAnother(r.productIndex)}
                            disabled={!r.candidates || r.candidates.length <= 1}
                            className="py-2 rounded-lg text-[14px] font-bold bg-white border border-grey-300 text-grey-700 active:bg-grey-100 disabled:opacity-40">
                            다른 이미지 찾기
                          </button>
                          <button onClick={() => photoUseAI(r.productIndex)}
                            className={`py-2 rounded-lg text-[14px] font-bold border ${
                              r.status === 'ai_generate'
                                ? 'bg-violet-500 text-white border-violet-500'
                                : 'bg-white border-grey-300 text-grey-700 active:bg-grey-100'
                            }`}>
                            AI가 그리기
                          </button>
                        </div>
                        <button
                          onClick={() => setPhotoResolutions(prev => prev.map(x => x.productIndex === r.productIndex ? { ...x, imageUrl: undefined, bgRemovedUrl: undefined, status: 'missing', candidates: undefined } : x))}
                          className="w-full py-1.5 text-[14px] text-danger-500 mt-1">
                          사진 없이 만들기
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

              {/* 방향 + 배경색 (사진 단계에 통합) */}
              {(popType === 'poster' || popType === 'shelf' || popType === 'banner') && (
                <div className="space-y-4 mt-4">
                  <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
                    <label className="text-[16px] font-bold text-grey-500 block mb-2">용지 방향</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['세로', '가로'] as const).map(o => {
                        const active = orientation === o;
                        return (
                          <button key={o} onClick={() => setOrientation(o)}
                            className={`py-3 rounded-xl text-[16px] font-bold transition-all active:scale-[0.97] border-2 ${
                              active ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-grey-600 border-grey-200'
                            }`}>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {(popType === 'shelf' || popType === 'banner') && (
                    <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
                      <label className="text-[16px] font-bold text-grey-500 block mb-2">배경색</label>
                      <div className="grid grid-cols-8 gap-3">
                        {BG_COLORS.map(c => {
                          const active = bgColor === c.hex;
                          return (
                            <button key={c.hex} onClick={() => setBgColor(c.hex)}
                              className={`aspect-square rounded-xl transition-all active:scale-90 ${active ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : ''}`}
                              style={{ backgroundColor: c.hex }}
                              title={c.name} />
                          );
                        })}
                      </div>
                      <p className="text-[16px] text-grey-500 mt-2">선택: {colorName(bgColor)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 포스터 Step 4 삭제됨 — 방향은 Step 3(사진)에 통합 */}

          {/* ─── 배지 POP 단계 ─── */}
          {popType === 'badge' && wizardStep === 1 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {BADGE_PRESETS.filter(b => b !== '없음').map(b => {
                  const active = badgeType === b;
                  return (
                    <button key={b} onClick={() => { setBadgeType(b); setBadgeFromPreset(true); }}
                      className={`px-3.5 py-2 rounded-xl text-[15px] font-bold transition-all active:scale-95 border ${
                        active ? 'bg-primary-500 text-white border-primary-500 shadow-sm' : 'bg-white text-grey-700 border-grey-200'
                      }`}>
                      {b}
                    </button>
                  );
                })}
              </div>
              <div className="pt-2">
                <label className="text-[16px] font-bold text-grey-500 block mb-2">직접 입력 (줄바꿈 가능)</label>
                <textarea
                  value={['1+1','2+1','3+1','덤증정'].includes(badgeType) ? '' : (badgeType === '없음' ? '' : badgeType)}
                  onChange={e => { setBadgeType(e.target.value); setBadgeFromPreset(false); }}
                  placeholder="예: 오늘만&#10;특가"
                  rows={2}
                  className="input text-[16px] resize-none" />
              </div>
            </div>
          )}

          {popType === 'badge' && wizardStep === 2 && (
            <div>
              <div className="grid grid-cols-4 gap-3">
                {BG_COLORS.map(c => {
                  const active = bgColor === c.hex;
                  return (
                    <button key={c.hex} onClick={() => setBgColor(c.hex)}
                      className={`aspect-square rounded-2xl transition-all active:scale-90 flex items-center justify-center ${active ? 'ring-4 ring-primary-500 ring-offset-2' : ''}`}
                      style={{ backgroundColor: c.hex }}>
                      <span className="text-white font-bold text-[16px] drop-shadow">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {popType === 'badge' && wizardStep === 3 && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                {(['세로', '가로'] as const).map(o => {
                  const active = orientation === o;
                  return (
                    <button key={o} onClick={() => setOrientation(o)}
                      className={`py-4 rounded-xl text-base font-bold transition-all active:scale-[0.97] border-2 ${
                        active ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-grey-600 border-grey-200'
                      }`}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-lg border-t border-grey-100 px-4 pt-3 pb-3">
          {generating && popType === 'poster' && (
            <p className="text-[14px] text-grey-500 text-center mb-2">⚠️ 페이지를 벗어나면 생성이 중단됩니다.</p>
          )}
          <div className="flex gap-3">
          <button onClick={prevStep}
            className="px-5 py-4 rounded-2xl text-[16px] font-bold bg-grey-100 text-grey-700 active:bg-grey-200">
            {wizardStep === 1 ? '취소' : '이전'}
          </button>

          <button onClick={nextStep} disabled={!canNext || generating}
            className="relative flex-1 py-4 rounded-2xl text-white font-bold text-base bg-gradient-to-r from-primary-500 to-violet-500 shadow-lg shadow-primary-500/30 disabled:opacity-60 disabled:shadow-none overflow-hidden">
            {generating && (
              <span className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-500 ease-out"
                style={{ width: `${genProgress}%` }} />
            )}
            <span className="relative">
              {generating ? `생성 중... ${genProgress}%` : wizardStep === totalSteps ? 'POP 만들기' : '다음'}
            </span>
          </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // 제안 화면
  // ═══════════════════════════════════════════
  if (view === 'suggestion') {
    const mainProduct = products[0];
    const productSummary = products
      .filter(p => p.name.trim())
      .map(p => {
        const parts = [p.name];
        if (p.originalPrice && p.price) parts.push(`${Number(p.originalPrice).toLocaleString()}→${Number(p.price).toLocaleString()}원`);
        else if (p.price) parts.push(`${Number(p.price).toLocaleString()}원`);
        return parts.join(' ');
      });

    return (
      <div className="flex flex-col h-full">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-grey-100 pt-safe">
          <div className="h-14 px-3 flex items-center gap-3">
            <button onClick={() => setView('form')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-grey-500 active:bg-grey-100">
              <span className="text-xl">←</span>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-[16px] leading-tight">확인</h1>
              <p className="text-[16px] text-grey-400 leading-tight">이 조건으로 만들까요?</p>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 pb-32">
          {/* 조건 요약 */}
          <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
            <h3 className="text-[16px] font-bold text-grey-800 mb-4">입력 정보</h3>
            <dl className="space-y-2 text-[16px]">
              <div className="flex">
                <dt className="w-20 text-grey-500">종류</dt>
                <dd className="flex-1 font-medium text-grey-800">{currentType.label}</dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-grey-500">방향</dt>
                <dd className="flex-1 font-medium text-grey-800">{orientation}</dd>
              </div>
              {popType !== 'badge' && productSummary.length > 0 && (
                <div className="flex">
                  <dt className="w-20 text-grey-500">상품</dt>
                  <dd className="flex-1 font-medium text-grey-800 space-y-1">
                    {productSummary.map((p, i) => <div key={i}>{p}</div>)}
                  </dd>
                </div>
              )}
              {badgeType && badgeType !== '없음' && (
                <div className="flex">
                  <dt className="w-20 text-grey-500">{popType === 'badge' ? '배지' : '행사'}</dt>
                  <dd className="flex-1 font-medium text-grey-800">{badgeType}</dd>
                </div>
              )}
              {popType !== 'poster' && (
                <div className="flex items-center">
                  <dt className="w-20 text-grey-500">배경색</dt>
                  <dd className="flex-1 font-medium text-grey-800 flex items-center gap-3">
                    <span className="inline-block w-4 h-4 rounded-full border border-grey-200" style={{ backgroundColor: bgColor }} />
                    {colorName(bgColor)}
                  </dd>
                </div>
              )}
              {photoEnabled && photoResolutions.length > 0 && (
                <div className="flex">
                  <dt className="w-20 text-grey-500">사진</dt>
                  <dd className="flex-1 font-medium text-grey-800">
                    {photoResolutions.filter(r => r.status === 'user_uploaded' || r.status === 'found').length}개 등록됨
                  </dd>
                </div>
              )}
              {!photoEnabled && popType !== 'badge' && (
                <div className="flex">
                  <dt className="w-20 text-grey-500">사진</dt>
                  <dd className="flex-1 font-medium text-grey-400">없음 (텍스트만)</dd>
                </div>
              )}
            </dl>
          </div>

          {/* AI 제안 — 포스터이거나 direction 필요한 경우에만 */}
          {popType !== 'badge' && (
            <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
              <h3 className="text-[16px] font-bold text-grey-800 mb-2">AI 제안</h3>
              <p className="text-[16px] text-grey-500 mb-4">상품에 어울리는 문구와 분위기를 제안해드려요.</p>

              {suggesting ? (
                <div className="py-6 flex items-center justify-center gap-3 text-grey-400">
                  <div className="w-4 h-4 border-2 border-grey-200 border-t-primary-500 rounded-full animate-spin" />
                  <span className="text-[16px]">생각 중...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 문구 */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[16px] font-bold text-grey-400 uppercase tracking-wider">문구</span>
                      <button
                        onClick={() => setEditingField(editingField === 'catchphrase' ? null : 'catchphrase')}
                        className="text-[16px] text-primary-500 font-medium active:text-primary-600"
                      >
                        {editingField === 'catchphrase' ? '완료' : '바꾸기'}
                      </button>
                    </div>
                    {editingField === 'catchphrase' ? (
                      <input
                        type="text"
                        value={catchphrase}
                        onChange={e => setCatchphrase(e.target.value)}
                        placeholder="POP에 들어갈 한 줄 문구"
                        className="input"
                        autoFocus
                      />
                    ) : (
                      <p className="text-[17px] font-bold text-grey-800 px-3 py-2.5 bg-primary-100 rounded-xl border border-primary-100">
                        {catchphrase || '(제안 없음)'}
                      </p>
                    )}
                  </div>

                  {/* 분위기 — 포스터나 direction 필요한 타입에서 */}
                  {popType === 'poster' && (
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[16px] font-bold text-grey-400 uppercase tracking-wider">분위기</span>
                        <button
                          onClick={() => setEditingField(editingField === 'direction' ? null : 'direction')}
                          className="text-[16px] text-primary-500 font-medium active:text-primary-600"
                        >
                          {editingField === 'direction' ? '완료' : '바꾸기'}
                        </button>
                      </div>
                      {editingField === 'direction' ? (
                        <input
                          type="text"
                          value={direction}
                          onChange={e => setDirection(e.target.value)}
                          placeholder="배경 분위기 (예: 시원한 얼음 느낌)"
                          className="input"
                          autoFocus
                        />
                      ) : (
                        <p className="text-[16px] text-grey-700 px-3 py-2.5 bg-violet-50 rounded-xl border border-violet-100">
                          {direction || '(제안 없음)'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-lg border-t border-grey-100 px-4 pt-3 pb-3">
          {generating && popType === 'poster' && (
            <p className="text-[14px] text-grey-500 text-center mb-2">⚠️ 페이지를 벗어나면 생성이 중단됩니다.</p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setView('form')}
              className="px-5 py-4 rounded-2xl text-[16px] font-bold bg-grey-100 text-grey-700 active:bg-grey-200">
              수정
            </button>
            <button onClick={() => confirmAndGenerate()} disabled={suggesting || generating}
              className="relative flex-1 py-4 rounded-2xl text-white font-bold text-base bg-gradient-to-r from-primary-500 to-violet-500 shadow-lg shadow-primary-500/30 active:scale-[0.98] transition-transform disabled:opacity-60 overflow-hidden">
              {generating && (
                <span className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-500 ease-out"
                  style={{ width: `${genProgress}%` }} />
              )}
              <span className="relative">
                {generating ? `생성 중... ${genProgress}%` : '이대로 만들기'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // 결과
  // ═══════════════════════════════════════════
  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-grey-100 pt-safe">
        <div className="h-14 px-3 flex items-center gap-3">
          <button onClick={() => setView('form')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-grey-500 active:bg-grey-100">
            <span className="text-xl">←</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-[16px] leading-tight">{currentType.label}</h1>
            <p className="text-[16px] text-grey-400 leading-tight">완성된 POP</p>
          </div>
          <button onClick={backToLanding}
            className="w-9 h-9 rounded-full flex items-center justify-center text-grey-500 active:bg-grey-100"
            title="홈으로">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 pb-32">
        {/* 결과 이미지 */}
        <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
          {resultImage && (
            <>
              <div className={`result-image-wrapper w-full rounded-xl overflow-hidden bg-grey-100 border border-grey-100 mb-4 ${refining ? 'opacity-50' : ''}`}
                style={{ aspectRatio: resultAspect, position: 'relative', filter: pageBlurred ? 'blur(20px)' : 'none', transition: 'filter 0.15s' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultImage} alt="생성된 POP" className="w-full h-full object-contain"
                  onContextMenu={e => e.preventDefault()}
                  style={{ WebkitTouchCallout: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                  onError={(e) => { e.preventDefault(); }} />
                <div className="pop-watermark-overlay" />
              </div>
              <div className="flex gap-3">
                {popType !== 'poster' && (
                  <button onClick={() => {
                    setView('form');
                    setWizardStep(1);
                    setPhotoSearched(false);
                    setPhotoResolutions([]);
                    setPhotoEnabled(false);
                  }}
                    className="flex-1 py-3 rounded-xl text-[16px] font-bold bg-grey-100 text-grey-700 active:bg-grey-200">
                    다시 만들기
                  </button>
                )}
                <button onClick={handleDownload}
                  className="flex-[2] py-3 rounded-xl text-[16px] font-bold text-white bg-gradient-to-r from-primary-500 to-violet-500 shadow-md shadow-primary-500/30 active:scale-[0.98] transition-transform">
                  PNG 다운로드
                </button>
              </div>
            </>
          )}
        </div>

        {/* 수정 채팅 — 모든 POP 종류에서 사용 가능 (Gemini image-to-image) */}
        {resultImage && (
          <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
            <h3 className="text-[16px] font-bold text-grey-800 mb-4">수정 요청</h3>

            {/* 수정 진행 중 표시 */}
            {refining && (
              <div className="flex justify-center py-4 mb-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}

            {/* 가이드형 입력 폼 */}
            {!refining && refineMode === 'text' && (() => {
              const hasExistingText = (badgeType && badgeType !== '없음') || products.some(p => p.name.trim()) || catchphrase.trim();
              const isAdd = !hasExistingText;
              return (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[16px] font-bold text-violet-600">{isAdd ? '텍스트 추가' : '텍스트 수정'}</span>
                  <button onClick={() => { setRefineMode(null); setRefineStep1(''); setRefineStep2(''); }}
                    className="text-[16px] text-grey-400">취소</button>
                </div>
                {isAdd ? (
                  <>
                    <div>
                      <label className="text-[16px] text-violet-500 block mb-2">추가할 텍스트를 입력해주세요</label>
                      <input type="text" value={refineStep2} onChange={e => setRefineStep2(e.target.value)}
                        placeholder="예: 오늘만 특가!" className="input" autoFocus
                        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && refineStep2.trim()) {
                          setRefineStep1('__ADD__');
                          setTimeout(() => submitGuidedRefine(), 0);
                        }}} />
                    </div>
                    <button onClick={() => { setRefineStep1('__ADD__'); setTimeout(() => submitGuidedRefine(), 0); }}
                      disabled={!refineStep2.trim()}
                      className="w-full py-2 rounded-lg text-[16px] font-bold text-white bg-violet-500 active:bg-violet-600 disabled:opacity-40">
                      추가 요청
                    </button>
                  </>
                ) : (
                  <>
                    {/* POP에 들어간 텍스트 목록 — 빠른 선택 */}
                    {(() => {
                      const texts = Array.from(new Set([
                        badgeType && badgeType !== '없음' ? badgeType : null,
                        // 포스터: 상품명은 이미지에 잘 안 박히므로 제외, 대신 상품별 badge 포함
                        ...(popType === 'poster'
                          ? products.map(p => p.badge?.trim() || null)
                          : [products[0]?.name?.trim() || null]),
                        catchphrase?.trim() || null,
                      ].filter(Boolean) as string[]));
                      return texts.length > 0 && !refineStep1 ? (
                        <div className="flex flex-wrap gap-3.5">
                          {texts.map(t => (
                            <button key={t} onClick={() => setRefineStep1(t)}
                              className="px-2.5 py-1 rounded-lg text-[16px] bg-white border border-violet-200 text-violet-600 active:bg-violet-100">
                              {t}
                            </button>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    <div>
                      <label className="text-[16px] text-violet-500 block mb-2">어떤 텍스트를 수정할까요?</label>
                      <input type="text" value={refineStep1} onChange={e => setRefineStep1(e.target.value)}
                        placeholder="예: 1+1" className="input" autoFocus />
                    </div>
                    <div>
                      <label className="text-[16px] text-violet-500 block mb-2">어떤 텍스트로 바꿀까요?</label>
                      <input type="text" value={refineStep2} onChange={e => setRefineStep2(e.target.value)}
                        placeholder="예: 2+1"
                        className="input"
                        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitGuidedRefine(); }} />
                    </div>
                    <button onClick={submitGuidedRefine} disabled={!refineStep1.trim() || !refineStep2.trim()}
                      className="w-full py-2 rounded-lg text-[16px] font-bold text-white bg-violet-500 active:bg-violet-600 disabled:opacity-40">
                      수정 요청
                    </button>
                  </>
                )}
              </div>
              );
            })()}

            {!refining && refineMode === 'color' && (
              <div className="bg-primary-100 border border-primary-200 rounded-xl p-3 mb-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[16px] font-bold text-primary-600">색감 변경</span>
                  <button onClick={() => { setRefineMode(null); setRefineStep1(''); }}
                    className="text-[16px] text-grey-400">취소</button>
                </div>
                <div>
                  <label className="text-[16px] text-primary-500 block mb-2">어떤 색감/분위기로 바꿀까요?</label>
                  <input type="text" value={refineStep1} onChange={e => setRefineStep1(e.target.value)}
                    placeholder="예: 따뜻한 톤, 시원한 느낌, 고급스럽게"
                    className="input" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitGuidedRefine(); }} />
                </div>
                <button onClick={submitGuidedRefine} disabled={!refineStep1.trim()}
                  className="w-full py-2 rounded-lg text-[16px] font-bold text-white bg-primary-500 active:bg-primary-600 disabled:opacity-40">
                  수정 요청
                </button>
              </div>
            )}

            {!refining && refineMode === 'bg' && (
              <div className="bg-success-100 border border-green-200 rounded-xl p-3 mb-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[16px] font-bold text-success-600">배경 변경</span>
                  <button onClick={() => { setRefineMode(null); setRefineStep1(''); }}
                    className="text-[16px] text-grey-400">취소</button>
                </div>
                <div>
                  <label className="text-[16px] text-success-1000 block mb-2">어떤 배경으로 바꿀까요?</label>
                  <input type="text" value={refineStep1} onChange={e => setRefineStep1(e.target.value)}
                    placeholder="예: 파란색, 크리스마스, 깨끗한 흰색"
                    className="input" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitGuidedRefine(); }} />
                </div>
                <button onClick={submitGuidedRefine} disabled={!refineStep1.trim()}
                  className="w-full py-2 rounded-lg text-[16px] font-bold text-white bg-success-1000 active:bg-success-600 disabled:opacity-40">
                  수정 요청
                </button>
              </div>
            )}

            {/* 버튼 — 맨 아래 */}
            {!refineMode && !refining && (() => {
              const hasText = (badgeType && badgeType !== '없음') || products.some(p => p.name.trim()) || catchphrase.trim();
              return (
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setRefineMode('text')}
                  className="py-2.5 rounded-xl text-[16px] font-bold bg-violet-50 border border-violet-200 text-violet-600 active:bg-violet-100">
                  {hasText ? '텍스트 수정' : '텍스트 추가'}
                </button>
                <button onClick={() => setRefineMode('color')}
                  className="py-2.5 rounded-xl text-[16px] font-bold bg-primary-100 border border-primary-200 text-primary-600 active:bg-primary-100">
                  색감 변경
                </button>
                <button onClick={() => setRefineMode('bg')}
                  className="py-2.5 rounded-xl text-[16px] font-bold bg-success-100 border border-green-200 text-success-600 active:bg-green-100">
                  배경 변경
                </button>
              </div>
              );
            })()}
            <div ref={chatEndRef} />
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-grey-100 p-5 shadow-sm">
      <h3 className="text-[16px] font-bold text-grey-800">{title}</h3>
      {description && <p className="text-[16px] text-grey-500 mt-2 mb-4 leading-relaxed">{description}</p>}
      {!description && <div className="mb-3" />}
      {children}
    </div>
  );
}
