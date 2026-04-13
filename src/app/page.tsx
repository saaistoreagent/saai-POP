'use client';

import { useState, useRef, useEffect } from 'react';

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
  name: string;       // 검색용 (자세한 이름)
  displayName: string; // POP에 표시할 이름 (짧게)
  originalPrice: string;
  price: string;
}

interface POPTypeInfo {
  value: POPType;
  label: string;
  detail: string;
  count: { 세로: string; 가로: string };
}

const POP_TYPES: POPTypeInfo[] = [
  { value: 'poster', label: '행사 포스터', detail: '매장 벽면이나 냉장고에 붙이는 큰 포스터', count: { 세로: '1장', 가로: '1장' } },
  { value: 'badge', label: '행사 배지', detail: '상품 옆에 붙이는 행사 표시 딱지', count: { 세로: '15개 (3×5)', 가로: '12개 (4×3)' } },
  { value: 'shelf', label: '선반 가격표', detail: '선반에 끼워 넣는 상품별 가격표', count: { 세로: '8개 (2×4)', 가로: '6개 (2×3)' } },
  { value: 'banner', label: '띠지', detail: '선반 앞면에 길게 붙이는 가로 띠', count: { 세로: '4줄', 가로: '3줄' } },
];

const BADGE_PRESETS = ['없음', '1+1', '2+1', '3+1', '덤증정', '품절대란', '신상출시', '소진임박', '에디터픽'];

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
  candidates?: string[];
  candidateIndex?: number;
}

// 외부 URL은 프록시 통해 표시 (CORS/핫링크 우회)
function displayUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('/')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

export default function Home() {
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
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [refineInput, setRefineInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineMode, setRefineMode] = useState<'text' | 'color' | 'bg' | null>(null);
  const [refineStep1, setRefineStep1] = useState('');
  const [refineStep2, setRefineStep2] = useState('');

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
    // 포스터(AI): 보통 10~25초 소요
    setGenProgress(5);
    let progress = 5;
    const interval = setInterval(() => {
      // 90%까지 점진적 증가, 이후 API 완료까지 대기
      if (progress < 90) {
        progress += Math.max(1, Math.floor((90 - progress) * 0.08));
        setGenProgress(progress);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [generating, popType]);

  const currentType = POP_TYPES.find(t => t.value === popType)!;

  function enterForm(t: POPType) {
    setPopType(t);
    setView('form');
    setWizardStep(1);
    setResultImage(null);
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
      // 포스터만 Step 1에서 상품명 필수
      if (wizardStep === 1 && popType === 'poster') {
        if (!products.some(p => p.name.trim())) { alert('상품명을 입력해주세요.'); return; }
      }
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

  // 상품 사진 자동 검색
  async function searchProductPhotos() {
    // 선반/띠지: photoSearchName 사용, 포스터: products[].name 사용
    const useSearchName = (popType === 'shelf' || popType === 'banner') && photoSearchName.trim();
    const searchTargets = useSearchName
      ? [{ name: photoSearchName.trim(), index: 0 }]
      : products.filter(p => p.name.trim()).map((p, i) => ({ name: p.name.trim(), index: i }));

    if (searchTargets.length === 0) return;

    setPhotoSearched(true);
    const initial: PhotoResolution[] = searchTargets.map(t => ({
      productIndex: t.index,
      name: t.name,
      status: 'searching',
    }));
    setPhotoResolutions(initial);

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
    setPhotoResolutions(results);
  }


  // 사진 해결 핸들러들
  function photoFindAnother(idx: number) {
    setPhotoResolutions(prev => prev.map(r => {
      if (r.productIndex !== idx) return r;
      if (!r.candidates || r.candidates.length <= 1) return r;
      const next = ((r.candidateIndex ?? 0) + 1) % r.candidates.length;
      return { ...r, imageUrl: r.candidates[next], candidateIndex: next, status: 'found' };
    }));
  }
  function photoUseAI(idx: number) {
    setPhotoResolutions(prev => prev.map(r =>
      r.productIndex === idx ? { ...r, status: 'ai_generate', imageUrl: undefined } : r
    ));
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
        r.productIndex === idx ? { ...r, status: 'user_uploaded', imageUrl: dataUrl } : r
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
    const mainProduct = products[0];
    if (popType === 'poster' && !mainProduct?.name.trim()) {
      alert('상품명을 입력해주세요.');
      return;
    }

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
    if (!photoEnabled) return [];

    // photoResolutions에 있는 이미지 수집
    if (photoResolutions.length > 0) {
      const result: (string | null)[] = [];
      for (const r of photoResolutions) {
        if ((r.status === 'found' || r.status === 'user_uploaded') && r.imageUrl) {
          result.push(r.imageUrl);
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
          originalPrice: mainProduct?.originalPrice ? Number(mainProduct.originalPrice) : null,
          price: mainProduct?.price ? Number(mainProduct.price) : null,
          direction: finalDirection.trim() || null,
          catchphraseInput: finalCatchphrase.trim() || null,
          category: cat,
          premium: useAI,
          bgColor,
          // 포스터: catchphrase가 메인 텍스트이므로 badge 중복 방지
          badgeType: popType === 'poster' ? null : (badgeType && badgeType !== '없음' ? badgeType : null),
          productImageUrl: resolvedImages[0] || null,
          productImages: resolvedImages,
          noSearch: true, // 이미 Step 2에서 검색 끝남
          eventPeriod: null,
          orientation,
          additionalProducts: products.slice(1).filter(p => p.name.trim()).map(p => ({
            name: p.name.trim(),
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
        // 이미지를 미리 로드해서 레이아웃 깨짐 방지
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = data.bgImage;
        });
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
      <div className="app-shell pb-safe">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-gray-100 pt-safe">
          <div className="h-14 px-5 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-[15px] leading-tight">POP 메이커</h1>
              <p className="text-[13px] text-gray-400 leading-tight">편의점 POP를 자동으로 만들어드려요</p>
            </div>
            <span className="text-[13px] font-medium text-blue-500 bg-blue-50 px-2 py-1 rounded-full">BETA</span>
          </div>
        </header>

        <main className="flex-1 px-4 py-5">
          <div className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-2xl p-4 mb-5 border border-blue-100">
            <p className="text-sm font-bold text-gray-800">안녕하세요!</p>
            <p className="text-[13px] text-gray-600 mt-1 leading-relaxed">
              어떤 POP를 만들고 싶으세요?
            </p>
          </div>

          <div className="space-y-3">
            {POP_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => enterForm(t.value)}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform text-left"
              >
                <div className="flex">
                  <div className="w-28 h-28 shrink-0 bg-gray-50 flex items-center justify-center border-r border-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/example/${t.value}`}
                      alt={`${t.label} 예시`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                    />
                  </div>
                  <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-bold text-[14px] text-gray-900 mb-1">{t.label}</h3>
                      <p className="text-[13px] text-gray-500 leading-snug">{t.detail}</p>
                    </div>
                    <p className="text-[13px] text-blue-500 font-medium mt-2">
                      {t.count.세로 === t.count.가로
                        ? `A4 한 장에 ${t.count.세로}`
                        : `세로 ${t.count.세로} · 가로 ${t.count.가로}`}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="text-[13px] text-gray-400 mt-6 text-center leading-relaxed">
            PNG로 다운로드해서 A4 용지에 인쇄하세요.<br />
            가위로 잘라 매장에 붙이면 됩니다.
          </p>
        </main>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // 폼 (위저드)
  // ═══════════════════════════════════════════
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
        ['상품 정보', '포스터에 들어갈 상품 정보를 입력해주세요.'],
        ['문구와 분위기', '포스터에 넣을 문구와 배경 분위기를 선택해주세요. 모두 선택사항입니다.'],
        ['사진 확인', '상품 사진을 확인하고 용지 방향을 선택해주세요.'],
      ][wizardStep - 1] as [string, string];
    } else {
      [stepTitle, stepDesc] = [
        ['문구와 사진', 'POP에 들어갈 문구를 입력하고, 상품 사진 사용 여부를 선택해주세요.'],
        ['상품 정보 (선택)', 'POP에 표시할 상품 이름과 가격입니다. 건너뛰어도 됩니다.'],
        ['마지막 설정', (photoEnabled ? '상품 사진을 확인하고 ' : '') + '용지 방향과 배경색을 선택해주세요.'],
      ][wizardStep - 1] as [string, string];
    }

    const canNext = (() => {
      if (popType === 'badge') {
        if (wizardStep === 1) return badgeType && badgeType !== '없음';
        return true;
      }
      // 포스터: Step 1에서 상품명 필수
      if (popType === 'poster' && wizardStep === 1) return products.some(p => p.name.trim());
      // 선반/띠지: 상품명 없어도 됨 (문구만으로 OK)
      return true;
    })();

    return (
      <div className="app-shell pb-safe">
        {/* 로딩은 버튼에 표시 */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-gray-100 pt-safe">
          <div className="h-14 px-3 flex items-center gap-2">
            <button onClick={prevStep}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 active:bg-gray-100">
              <span className="text-xl">←</span>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-[14px] leading-tight">{currentType.label}</h1>
              <p className="text-[13px] text-gray-400 leading-tight">단계 {wizardStep} / {totalSteps}</p>
            </div>
          </div>
          {/* 진행 바 */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
              style={{ width: `${(wizardStep / totalSteps) * 100}%` }}
            />
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4 pb-32">
          {/* 단계 제목 */}
          <div>
            <h2 className="text-[20px] font-bold text-gray-900">{stepTitle}</h2>
            <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">{stepDesc}</p>
          </div>

          {/* ─── 포스터 Step 1: 상품 정보 ─── */}
          {popType === 'poster' && wizardStep === 1 && (
            <div className="space-y-3">
              {products.map((p, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-2.5">
                  {products.length > 1 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-gray-400 font-bold uppercase tracking-wider">상품 {i + 1}</span>
                      <button onClick={() => removeProduct(i)} className="text-[13px] text-red-400 font-medium active:text-red-600">삭제</button>
                    </div>
                  )}
                  <div>
                    <label className="text-[13px] font-bold text-gray-500 block mb-1">상품 이름 (사진 검색용)</label>
                    <input type="text" value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)}
                      placeholder="예: 카스 후레쉬 500ml 캔맥주" className="input" />
                    <p className="text-[13px] text-gray-400 mt-1">브랜드·용량까지 자세히 적으면 사진이 정확하게 검색됩니다.</p>
                  </div>
                  {/* 가격 */}
                  {!priceOpen[i] ? (
                    <button onClick={() => setPriceOpen(prev => ({ ...prev, [i]: true }))}
                      className="w-full py-2.5 rounded-xl text-[13px] font-medium text-gray-500 bg-gray-50 border border-gray-200 active:bg-gray-100 text-left px-3">
                      + 가격 입력
                    </button>
                  ) : (
                    <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] font-bold text-gray-600">가격</span>
                        <button onClick={() => { setPriceOpen(prev => ({ ...prev, [i]: false })); updateProduct(i, 'price', ''); updateProduct(i, 'originalPrice', ''); }}
                          className="text-[13px] text-gray-400 active:text-gray-600">삭제</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[13px] text-gray-500 block mb-1">판매가</label>
                          <input type="number" inputMode="numeric" value={p.price}
                            onChange={e => updateProduct(i, 'price', e.target.value)}
                            placeholder="2,500" className="input" />
                        </div>
                        <div>
                          <label className="text-[13px] text-gray-400 block mb-1">정가</label>
                          <input type="number" inputMode="numeric" value={p.originalPrice}
                            onChange={e => updateProduct(i, 'originalPrice', e.target.value)}
                            placeholder="3,200" className="input text-gray-400" />
                        </div>
                      </div>
                      <p className="text-[13px] text-gray-400">판매가만 입력하면 가격 표시, 정가도 입력하면 할인 표시(취소선)가 됩니다.</p>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addProduct}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-blue-500 font-bold active:bg-blue-50">
                + 상품 추가
              </button>
            </div>
          )}

          {/* ─── 선반/띠지 Step 1: 강조 문구 + 사진 ON/OFF ─── */}
          {(popType === 'shelf' || popType === 'banner') && wizardStep === 1 && (
            <div className="space-y-4">
              {/* 강조 문구 */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <label className="text-[13px] font-bold text-gray-500 block mb-1">POP에 넣을 문구</label>
                <p className="text-[13px] text-gray-400 mb-3">POP에 크게 들어갈 문구예요. 아래에서 고르거나 직접 적어주세요.</p>
                <div className="flex flex-wrap gap-2">
                  {BADGE_PRESETS.map(b => {
                    const active = badgeType === b;
                    return (
                      <button key={b} onClick={() => { setBadgeType(b); setBadgeFromPreset(true); }}
                        className={`px-3.5 py-2 rounded-xl text-[14px] font-bold transition-all active:scale-95 border ${
                          active ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-gray-700 border-gray-200'
                        }`}>
                        {b}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[13px] text-gray-500 mt-3 mb-1">위에 없는 문구는 여기에 직접 적어주세요 (줄바꿈 가능)</p>
                <div className="flex gap-2 items-start">
                  <textarea
                    value={badgeType === '없음' ? '' : badgeType}
                    onChange={e => { setBadgeType(e.target.value); setBadgeFromPreset(false); setAiSuggestion(null); }}
                    placeholder="예: 3개 사면&#10;1개 더!"
                    rows={2}
                    className="input resize-none flex-1" />
                  {!aiSuggestion && !aiSuggesting && (
                    <button
                      onClick={requestAISuggestion}
                      className="shrink-0 px-3 py-2.5 rounded-xl text-[13px] font-bold text-violet-600 bg-violet-50 border border-violet-200 active:bg-violet-100 self-stretch flex items-center">
                      AI 추천
                    </button>
                  )}
                  {aiSuggesting && (
                    <div className="shrink-0 px-3 py-2.5 flex items-center">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {aiSuggestion && !aiSuggesting && (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mt-2">
                    <p className="text-[13px] font-bold text-violet-500 mb-1">AI 추천 문구</p>
                    <p className="text-[15px] font-bold text-gray-900 mb-3 whitespace-pre-wrap">{aiSuggestion}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setBadgeType(aiSuggestion); setAiSuggestion(null); }}
                        className="flex-1 py-2 rounded-lg text-[13px] font-bold text-white bg-violet-500 active:bg-violet-600">
                        적용
                      </button>
                      <button
                        onClick={() => requestAISuggestion()}
                        className="flex-1 py-2 rounded-lg text-[13px] font-bold text-violet-600 bg-white border border-violet-300 active:bg-violet-50">
                        다시 추천
                      </button>
                      <button
                        onClick={() => setAiSuggestion(null)}
                        className="flex-1 py-2 rounded-lg text-[13px] font-bold text-gray-600 bg-white border border-gray-300 active:bg-gray-50">
                        닫기
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 사진 ON/OFF */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-3">
                    <p className="text-[13px] font-bold text-gray-800">상품 사진 넣기</p>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      {photoEnabled
                        ? '상품 사진이 POP에 들어갑니다.'
                        : '텍스트만으로 만듭니다.'}
                    </p>
                  </div>
                  <button
                    onClick={() => togglePhoto(!photoEnabled)}
                    className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${
                      photoEnabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${
                        photoEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {photoEnabled && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <label className="text-[13px] font-bold text-gray-500 block mb-1">검색할 상품명</label>
                    <input type="text" value={photoSearchName}
                      onChange={e => { setPhotoSearchName(e.target.value); setPhotoSearched(false); setPhotoResolutions([]); }}
                      placeholder="예: 농심 신라면 5개입 봉지" className="input" />
                    <p className="text-[13px] text-gray-400 mt-1">브랜드·용량까지 자세히 적으면 사진이 정확하게 검색됩니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── 선반/띠지 Step 2: 상품 정보 (선택) ─── */}
          {(popType === 'shelf' || popType === 'banner') && wizardStep === 2 && (
            <div className="space-y-3">
              {products.map((p, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-2.5">
                  {products.length > 1 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-gray-400 font-bold uppercase tracking-wider">상품 {i + 1}</span>
                      <button onClick={() => removeProduct(i)} className="text-[13px] text-red-400 font-medium active:text-red-600">삭제</button>
                    </div>
                  )}
                  <div>
                    <label className="text-[13px] font-bold text-gray-500 block mb-1">상품 이름</label>
                    <input type="text" value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)}
                      placeholder="예: 신라면" className="input" />
                  </div>
                  {/* 가격 */}
                  {!priceOpen[i] ? (
                    <button onClick={() => setPriceOpen(prev => ({ ...prev, [i]: true }))}
                      className="w-full py-2.5 rounded-xl text-[13px] font-medium text-gray-500 bg-gray-50 border border-gray-200 active:bg-gray-100 text-left px-3">
                      + 가격 입력
                    </button>
                  ) : (
                    <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] font-bold text-gray-600">가격</span>
                        <button onClick={() => { setPriceOpen(prev => ({ ...prev, [i]: false })); updateProduct(i, 'price', ''); updateProduct(i, 'originalPrice', ''); }}
                          className="text-[13px] text-gray-400 active:text-gray-600">삭제</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[13px] text-gray-500 block mb-1">판매가</label>
                          <input type="number" inputMode="numeric" value={p.price}
                            onChange={e => updateProduct(i, 'price', e.target.value)}
                            placeholder="2,500" className="input" />
                        </div>
                        <div>
                          <label className="text-[13px] text-gray-400 block mb-1">정가</label>
                          <input type="number" inputMode="numeric" value={p.originalPrice}
                            onChange={e => updateProduct(i, 'originalPrice', e.target.value)}
                            placeholder="3,200" className="input text-gray-400" />
                        </div>
                      </div>
                      <p className="text-[13px] text-gray-400">판매가만 입력하면 가격 표시, 정가도 입력하면 할인 표시(취소선)가 됩니다.</p>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addProduct}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-blue-500 font-bold active:bg-blue-50">
                + 상품 추가
              </button>
            </div>
          )}

          {/* ─── 포스터 Step 2: 강조 문구 + 분위기 ─── */}
          {popType === 'poster' && wizardStep === 2 && (
            <div className="space-y-4">
              {/* 강조 문구 — 선반/띠지와 동일한 구조 */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <label className="text-[13px] font-bold text-gray-500 block mb-1">POP에 넣을 문구</label>
                <p className="text-[13px] text-gray-400 mb-3">포스터에 크게 들어갈 문구예요. 아래에서 고르거나 직접 적어주세요.</p>
                <div className="flex flex-wrap gap-2">
                  {BADGE_PRESETS.map(b => {
                    const active = badgeType === b;
                    return (
                      <button key={b} onClick={() => { setBadgeType(b); setBadgeFromPreset(true); }}
                        className={`px-3.5 py-2 rounded-xl text-[14px] font-bold transition-all active:scale-95 border ${
                          active ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-gray-700 border-gray-200'
                        }`}>
                        {b}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[13px] text-gray-500 mt-3 mb-1">위에 없는 문구는 여기에 직접 적어주세요 (줄바꿈 가능)</p>
                <div className="flex gap-2 items-start">
                  <textarea
                    value={badgeType === '없음' ? '' : badgeType}
                    onChange={e => { setBadgeType(e.target.value); setBadgeFromPreset(false); setAiSuggestion(null); }}
                    placeholder="예: 3개 사면&#10;1개 더!"
                    rows={2}
                    className="input resize-none flex-1"
                  />
                  {/* AI 문구 추천 — 문구 입력 옆에 배치 */}
                  {!aiSuggestion && !aiSuggesting && (
                    <button
                      onClick={requestAISuggestion}
                      className="shrink-0 px-3 py-2.5 rounded-xl text-[13px] font-bold text-violet-600 bg-violet-50 border border-violet-200 active:bg-violet-100 self-stretch flex items-center">
                      AI 추천
                    </button>
                  )}
                  {aiSuggesting && (
                    <div className="shrink-0 px-3 py-2.5 flex items-center">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {aiSuggestion && !aiSuggesting && (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mt-2">
                    <p className="text-[13px] font-bold text-violet-500 mb-1">AI 추천 문구</p>
                    <p className="text-[15px] font-bold text-gray-900 mb-3 whitespace-pre-wrap">{aiSuggestion}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setBadgeType(aiSuggestion); setAiSuggestion(null); }}
                        className="flex-1 py-2 rounded-lg text-[13px] font-bold text-white bg-violet-500 active:bg-violet-600">
                        적용
                      </button>
                      <button
                        onClick={() => requestAISuggestion()}
                        className="flex-1 py-2 rounded-lg text-[13px] font-bold text-violet-600 bg-white border border-violet-300 active:bg-violet-50">
                        다시 추천
                      </button>
                      <button
                        onClick={() => setAiSuggestion(null)}
                        className="flex-1 py-2 rounded-lg text-[13px] font-bold text-gray-600 bg-white border border-gray-300 active:bg-gray-50">
                        닫기
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 분위기 */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <label className="text-[13px] font-bold text-gray-500 block mb-1">어떤 느낌으로 만들까요? (선택)</label>
                <p className="text-[13px] text-gray-400 mb-3">
                  이걸 바탕으로 <strong className="text-violet-500">배경 이미지</strong>가 만들어져요. 비워두면 상품에 어울리게 자동으로 정해져요.
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { label: '맥주/음료', val: '차가운 얼음과 물방울이 맺힌 시원한 느낌, 어두운 네이비 배경, 맥주 TV 광고 스타일' },
                    { label: '라면/분식', val: '뜨끈한 김이 모락모락, 빨간색과 주황색 불꽃 효과, 라면 TV 광고처럼 따뜻하고 역동적인 느낌' },
                    { label: '과자/디저트', val: '달콤한 파스텔 핑크와 크림색 배경, 부드러운 조명, 디저트 브랜드 광고 느낌' },
                    { label: '건강식', val: '깨끗하고 신선한 초록과 흰색 배경, 자연광, 건강식 브랜드 광고 느낌' },
                    { label: '할인/특가', val: '강렬한 빨간색과 노란색, 폭발적인 세일 배너, 대형마트 할인 광고 느낌' },
                    { label: '프리미엄', val: '어두운 블랙 배경에 골드 포인트, 고급 브랜드 광고처럼 미니멀하고 세련된 느낌' },
                  ].map(p => (
                    <button key={p.label} onClick={() => setMoodDesc(p.val)}
                      className={`px-3.5 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 border ${
                        moodDesc === p.val ? 'bg-violet-500 text-white border-violet-500 shadow-sm' : 'bg-white text-gray-700 border-gray-200'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={moodDesc}
                  onChange={e => setMoodDesc(e.target.value)}
                  placeholder="위에 없는 느낌은 직접 적어주세요&#10;예: 여름 해변 느낌, 크리스마스 분위기, 깔끔한 흰 배경"
                  rows={2}
                  className="input resize-none"
                />
              </div>
            </div>
          )}

          {/* ─── 사진 자동 검색 + resolve (포스터 Step 3, 선반/띠지 Step 3) ─── */}
          {popType !== 'badge' && wizardStep === photoStep && (
            <div className="space-y-3">
              <input ref={resolveFileRef} type="file" accept="image/*" onChange={photoFileChange} className="hidden" />

              {/* 사진 OFF면 안내만 */}
              {!photoEnabled && (
                <div className="py-4 text-center text-gray-400 text-[13px]">
                  사진 없이 만들기로 설정됨. (이전 단계에서 변경 가능)
                </div>
              )}

              {photoEnabled && photoResolutions.length === 0 && !photoSearched && (
                <div className="py-10 text-center text-gray-400 text-[13px]">검색 시작 중...</div>
              )}

              {photoEnabled && photoResolutions.map(r => {
                const bgClass = r.status === 'missing' ? 'border-gray-200 bg-gray-50'
                  : r.status === 'user_uploaded' ? 'border-blue-200 bg-blue-50'
                  : r.status === 'ai_generate' ? 'border-violet-200 bg-violet-50'
                  : 'border-gray-100 bg-white';
                const statusLabel = r.status === 'searching' ? '검색 중...'
                  : r.status === 'found' ? '자동 검색됨'
                  : r.status === 'user_uploaded' ? '직접 올림'
                  : r.status === 'ai_generate' ? 'AI가 그릴 예정'
                  : '검색 결과 없음 — 직접 올려주세요';
                return (
                  <div key={r.productIndex} className={`rounded-2xl border-2 p-3 shadow-sm ${bgClass}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-800 truncate">{r.name}</p>
                        <p className="text-[13px] text-gray-500 mt-0.5">{statusLabel}</p>
                      </div>
                    </div>
                    <div className="w-full rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden" style={{ height: 300 }}>
                      {r.status === 'searching' ? (
                        <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                      ) : r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={displayUrl(r.imageUrl)} alt={r.name}
                          className="w-full h-full object-contain"
                          onError={(e) => { e.preventDefault(); (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      ) : r.status === 'ai_generate' ? (
                        <span className="text-[14px] text-violet-600 font-bold">AI가 그릴 예정</span>
                      ) : (
                        <span className="text-[13px] text-gray-400 text-center px-2">검색 결과 없음<br />아래에서 직접 올려주세요</span>
                      )}
                    </div>
                    {r.status !== 'searching' && (
                      <div className="grid grid-cols-3 gap-1.5 mt-3">
                        <button onClick={() => photoUploadClick(r.productIndex)}
                          className="py-1.5 rounded-lg text-[13px] font-bold bg-white border border-gray-300 text-gray-700 active:bg-gray-100">
                          직접 올리기
                        </button>
                        <button onClick={() => photoFindAnother(r.productIndex)}
                          disabled={!r.candidates || r.candidates.length <= 1}
                          className="py-1.5 rounded-lg text-[13px] font-bold bg-white border border-gray-300 text-gray-700 active:bg-gray-100 disabled:opacity-40">
                          다른 이미지 찾기
                        </button>
                        <button onClick={() => photoUseAI(r.productIndex)}
                          className={`py-1.5 rounded-lg text-[13px] font-bold border ${
                            r.status === 'ai_generate'
                              ? 'bg-violet-500 text-white border-violet-500'
                              : 'bg-white border-gray-300 text-gray-700 active:bg-gray-100'
                          }`}>
                          AI가 그리기
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 방향 + 배경색 (사진 단계에 통합) */}
              {(popType === 'poster' || popType === 'shelf' || popType === 'banner') && (
                <div className="space-y-4 mt-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <label className="text-[13px] font-bold text-gray-500 block mb-2">용지 방향</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['세로', '가로'] as const).map(o => {
                        const active = orientation === o;
                        return (
                          <button key={o} onClick={() => setOrientation(o)}
                            className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97] border-2 ${
                              active ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'
                            }`}>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {(popType === 'shelf' || popType === 'banner') && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                      <label className="text-[13px] font-bold text-gray-500 block mb-2">배경색</label>
                      <div className="grid grid-cols-8 gap-2">
                        {BG_COLORS.map(c => {
                          const active = bgColor === c.hex;
                          return (
                            <button key={c.hex} onClick={() => setBgColor(c.hex)}
                              className={`aspect-square rounded-xl transition-all active:scale-90 ${active ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`}
                              style={{ backgroundColor: c.hex }}
                              title={c.name} />
                          );
                        })}
                      </div>
                      <p className="text-[13px] text-gray-500 mt-2">선택: {colorName(bgColor)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 포스터 Step 4 삭제됨 — 방향은 Step 3(사진)에 통합 */}

          {/* ─── 배지 POP 단계 ─── */}
          {popType === 'badge' && wizardStep === 1 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {BADGE_PRESETS.filter(b => b !== '없음').map(b => {
                  const active = badgeType === b;
                  return (
                    <button key={b} onClick={() => { setBadgeType(b); setBadgeFromPreset(true); }}
                      className={`px-3.5 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 border ${
                        active ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-gray-700 border-gray-200'
                      }`}>
                      {b}
                    </button>
                  );
                })}
              </div>
              <div className="pt-2">
                <label className="text-[13px] font-bold text-gray-500 block mb-1">직접 입력 (줄바꿈 가능)</label>
                <textarea
                  value={['1+1','2+1','3+1','덤증정'].includes(badgeType) ? '' : (badgeType === '없음' ? '' : badgeType)}
                  onChange={e => { setBadgeType(e.target.value); setBadgeFromPreset(false); }}
                  placeholder="예: 오늘만&#10;특가"
                  rows={2}
                  className="input text-sm resize-none" />
              </div>
            </div>
          )}

          {popType === 'badge' && wizardStep === 2 && (
            <div>
              <div className="grid grid-cols-4 gap-2">
                {BG_COLORS.map(c => {
                  const active = bgColor === c.hex;
                  return (
                    <button key={c.hex} onClick={() => setBgColor(c.hex)}
                      className={`aspect-square rounded-2xl transition-all active:scale-90 flex items-center justify-center ${active ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
                      style={{ backgroundColor: c.hex }}>
                      <span className="text-white font-bold text-[13px] drop-shadow">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {popType === 'badge' && wizardStep === 3 && (
            <div>
              <div className="grid grid-cols-2 gap-2">
                {(['세로', '가로'] as const).map(o => {
                  const active = orientation === o;
                  return (
                    <button key={o} onClick={() => setOrientation(o)}
                      className={`py-4 rounded-xl text-base font-bold transition-all active:scale-[0.97] border-2 ${
                        active ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'
                      }`}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-lg border-t border-gray-100 px-4 pt-3 pb-3 flex gap-2">
          <button onClick={prevStep}
            className="px-5 py-4 rounded-2xl text-sm font-bold bg-gray-100 text-gray-700 active:bg-gray-200">
            {wizardStep === 1 ? '취소' : '이전'}
          </button>

          <button onClick={nextStep} disabled={!canNext || generating}
            className="flex-1 py-4 rounded-2xl text-white font-bold text-base bg-gradient-to-r from-blue-500 to-violet-500 shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:shadow-none">
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                생성 중...
              </span>
            ) : wizardStep === totalSteps ? '만들기' : '다음'}
          </button>
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
      <div className="app-shell pb-safe">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-gray-100 pt-safe">
          <div className="h-14 px-3 flex items-center gap-2">
            <button onClick={() => setView('form')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 active:bg-gray-100">
              <span className="text-xl">←</span>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-[15px] leading-tight">확인</h1>
              <p className="text-[13px] text-gray-400 leading-tight">이 조건으로 만들까요?</p>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 pb-32">
          {/* 조건 요약 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-[13px] font-bold text-gray-800 mb-3">입력 정보</h3>
            <dl className="space-y-2 text-[13px]">
              <div className="flex">
                <dt className="w-20 text-gray-500">종류</dt>
                <dd className="flex-1 font-medium text-gray-800">{currentType.label}</dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-gray-500">방향</dt>
                <dd className="flex-1 font-medium text-gray-800">{orientation}</dd>
              </div>
              {popType !== 'badge' && productSummary.length > 0 && (
                <div className="flex">
                  <dt className="w-20 text-gray-500">상품</dt>
                  <dd className="flex-1 font-medium text-gray-800 space-y-1">
                    {productSummary.map((p, i) => <div key={i}>{p}</div>)}
                  </dd>
                </div>
              )}
              {badgeType && badgeType !== '없음' && (
                <div className="flex">
                  <dt className="w-20 text-gray-500">{popType === 'badge' ? '배지' : '행사'}</dt>
                  <dd className="flex-1 font-medium text-gray-800">{badgeType}</dd>
                </div>
              )}
              {popType !== 'poster' && (
                <div className="flex items-center">
                  <dt className="w-20 text-gray-500">배경색</dt>
                  <dd className="flex-1 font-medium text-gray-800 flex items-center gap-2">
                    <span className="inline-block w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: bgColor }} />
                    {colorName(bgColor)}
                  </dd>
                </div>
              )}
              {photoEnabled && photoResolutions.length > 0 && (
                <div className="flex">
                  <dt className="w-20 text-gray-500">사진</dt>
                  <dd className="flex-1 font-medium text-gray-800">
                    {photoResolutions.filter(r => r.status === 'user_uploaded' || r.status === 'found').length}개 사용됨
                  </dd>
                </div>
              )}
              {!photoEnabled && popType !== 'badge' && (
                <div className="flex">
                  <dt className="w-20 text-gray-500">사진</dt>
                  <dd className="flex-1 font-medium text-gray-400">없음 (텍스트만)</dd>
                </div>
              )}
            </dl>
          </div>

          {/* AI 제안 — 포스터이거나 direction 필요한 경우에만 */}
          {popType !== 'badge' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="text-[13px] font-bold text-gray-800 mb-1">AI 제안</h3>
              <p className="text-[13px] text-gray-500 mb-3">상품에 어울리는 문구와 분위기를 제안해드려요.</p>

              {suggesting ? (
                <div className="py-6 flex items-center justify-center gap-2 text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-[13px]">생각 중...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 문구 */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-bold text-gray-400 uppercase tracking-wider">문구</span>
                      <button
                        onClick={() => setEditingField(editingField === 'catchphrase' ? null : 'catchphrase')}
                        className="text-[13px] text-blue-500 font-medium active:text-blue-600"
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
                      <p className="text-[14px] font-bold text-gray-800 px-3 py-2.5 bg-blue-50 rounded-xl border border-blue-100">
                        {catchphrase || '(제안 없음)'}
                      </p>
                    )}
                  </div>

                  {/* 분위기 — 포스터나 direction 필요한 타입에서 */}
                  {popType === 'poster' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-bold text-gray-400 uppercase tracking-wider">분위기</span>
                        <button
                          onClick={() => setEditingField(editingField === 'direction' ? null : 'direction')}
                          className="text-[13px] text-blue-500 font-medium active:text-blue-600"
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
                        <p className="text-[13px] text-gray-700 px-3 py-2.5 bg-violet-50 rounded-xl border border-violet-100">
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

        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-lg border-t border-gray-100 px-4 pt-3 pb-3 flex gap-2">
          <button onClick={() => setView('form')}
            className="px-5 py-4 rounded-2xl text-sm font-bold bg-gray-100 text-gray-700 active:bg-gray-200">
            수정
          </button>
          <button onClick={() => confirmAndGenerate()} disabled={suggesting || generating}
            className="flex-1 py-4 rounded-2xl text-white font-bold text-base bg-gradient-to-r from-blue-500 to-violet-500 shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-transform disabled:opacity-40">
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                생성 중...
              </span>
            ) : '이대로 만들기'}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // 결과
  // ═══════════════════════════════════════════
  return (
    <div className="app-shell pb-safe">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-gray-100 pt-safe">
        <div className="h-14 px-3 flex items-center gap-2">
          <button onClick={backToLanding}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 active:bg-gray-100">
            <span className="text-xl">←</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-[15px] leading-tight">{currentType.label}</h1>
            <p className="text-[13px] text-gray-400 leading-tight">완성된 POP</p>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        {/* 결과 이미지 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          {resultImage && (
            <>
              <div className={`rounded-xl overflow-hidden bg-gray-50 border border-gray-100 mb-3 ${refining ? 'opacity-50' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultImage} alt="생성된 POP" className="w-full h-auto"
                  onError={(e) => { e.preventDefault(); }} />
              </div>
              <div className="flex gap-2">
                {popType !== 'poster' && (
                  <button onClick={() => {
                    setView('form');
                    setWizardStep(1);
                    setPhotoSearched(false);
                    setPhotoResolutions([]);
                    setPhotoEnabled(false);
                  }}
                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 active:bg-gray-200">
                    다시 만들기
                  </button>
                )}
                <button onClick={handleDownload}
                  className="flex-[2] py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-violet-500 shadow-md shadow-blue-500/30 active:scale-[0.98] transition-transform">
                  PNG 다운로드
                </button>
              </div>
            </>
          )}
        </div>

        {/* 수정 채팅 — 모든 POP 종류에서 사용 가능 (Gemini image-to-image) */}
        {resultImage && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-[13px] font-bold text-gray-800 mb-3">수정 요청</h3>

            {/* 수정 진행 중 표시 */}
            {refining && (
              <div className="flex justify-center py-4 mb-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}

            {/* 가이드형 입력 폼 */}
            {!refining && refineMode === 'text' && (() => {
              const hasExistingText = (badgeType && badgeType !== '없음') || products.some(p => p.name.trim()) || catchphrase.trim();
              const isAdd = !hasExistingText;
              return (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-violet-600">{isAdd ? '텍스트 추가' : '텍스트 수정'}</span>
                  <button onClick={() => { setRefineMode(null); setRefineStep1(''); setRefineStep2(''); }}
                    className="text-[13px] text-gray-400">취소</button>
                </div>
                {isAdd ? (
                  <>
                    <div>
                      <label className="text-[13px] text-violet-500 block mb-1">추가할 텍스트를 입력해주세요</label>
                      <input type="text" value={refineStep2} onChange={e => setRefineStep2(e.target.value)}
                        placeholder="예: 오늘만 특가!" className="input" autoFocus
                        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && refineStep2.trim()) {
                          setRefineStep1('__ADD__');
                          setTimeout(() => submitGuidedRefine(), 0);
                        }}} />
                    </div>
                    <button onClick={() => { setRefineStep1('__ADD__'); setTimeout(() => submitGuidedRefine(), 0); }}
                      disabled={!refineStep2.trim()}
                      className="w-full py-2 rounded-lg text-[13px] font-bold text-white bg-violet-500 active:bg-violet-600 disabled:opacity-40">
                      추가 요청
                    </button>
                  </>
                ) : (
                  <>
                    {/* POP에 들어간 텍스트 목록 — 빠른 선택 */}
                    {(() => {
                      const texts = [
                        badgeType && badgeType !== '없음' ? badgeType : null,
                        products[0]?.name?.trim() || null,
                        catchphrase?.trim() || null,
                      ].filter(Boolean) as string[];
                      return texts.length > 0 && !refineStep1 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {texts.map(t => (
                            <button key={t} onClick={() => setRefineStep1(t)}
                              className="px-2.5 py-1 rounded-lg text-[13px] bg-white border border-violet-200 text-violet-600 active:bg-violet-100">
                              {t}
                            </button>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    <div>
                      <label className="text-[13px] text-violet-500 block mb-1">어떤 텍스트를 수정할까요?</label>
                      <input type="text" value={refineStep1} onChange={e => setRefineStep1(e.target.value)}
                        placeholder="예: 1+1" className="input" autoFocus />
                    </div>
                    <div>
                      <label className="text-[13px] text-violet-500 block mb-1">어떤 텍스트로 바꿀까요?</label>
                      <input type="text" value={refineStep2} onChange={e => setRefineStep2(e.target.value)}
                        placeholder="예: 2+1"
                        className="input"
                        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitGuidedRefine(); }} />
                    </div>
                    <button onClick={submitGuidedRefine} disabled={!refineStep1.trim() || !refineStep2.trim()}
                      className="w-full py-2 rounded-lg text-[13px] font-bold text-white bg-violet-500 active:bg-violet-600 disabled:opacity-40">
                      수정 요청
                    </button>
                  </>
                )}
              </div>
              );
            })()}

            {!refining && refineMode === 'color' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-blue-600">색감 변경</span>
                  <button onClick={() => { setRefineMode(null); setRefineStep1(''); }}
                    className="text-[13px] text-gray-400">취소</button>
                </div>
                <div>
                  <label className="text-[13px] text-blue-500 block mb-1">어떤 색감/분위기로 바꿀까요?</label>
                  <input type="text" value={refineStep1} onChange={e => setRefineStep1(e.target.value)}
                    placeholder="예: 따뜻한 톤, 시원한 느낌, 고급스럽게"
                    className="input" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitGuidedRefine(); }} />
                </div>
                <button onClick={submitGuidedRefine} disabled={!refineStep1.trim()}
                  className="w-full py-2 rounded-lg text-[13px] font-bold text-white bg-blue-500 active:bg-blue-600 disabled:opacity-40">
                  수정 요청
                </button>
              </div>
            )}

            {!refining && refineMode === 'bg' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-green-600">배경 변경</span>
                  <button onClick={() => { setRefineMode(null); setRefineStep1(''); }}
                    className="text-[13px] text-gray-400">취소</button>
                </div>
                <div>
                  <label className="text-[13px] text-green-500 block mb-1">어떤 배경으로 바꿀까요?</label>
                  <input type="text" value={refineStep1} onChange={e => setRefineStep1(e.target.value)}
                    placeholder="예: 파란색, 크리스마스, 깨끗한 흰색"
                    className="input" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitGuidedRefine(); }} />
                </div>
                <button onClick={submitGuidedRefine} disabled={!refineStep1.trim()}
                  className="w-full py-2 rounded-lg text-[13px] font-bold text-white bg-green-500 active:bg-green-600 disabled:opacity-40">
                  수정 요청
                </button>
              </div>
            )}

            {/* 버튼 — 맨 아래 */}
            {!refineMode && !refining && (() => {
              const hasText = (badgeType && badgeType !== '없음') || products.some(p => p.name.trim()) || catchphrase.trim();
              return (
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setRefineMode('text')}
                  className="py-2.5 rounded-xl text-[13px] font-bold bg-violet-50 border border-violet-200 text-violet-600 active:bg-violet-100">
                  {hasText ? '텍스트 수정' : '텍스트 추가'}
                </button>
                <button onClick={() => setRefineMode('color')}
                  className="py-2.5 rounded-xl text-[13px] font-bold bg-blue-50 border border-blue-200 text-blue-600 active:bg-blue-100">
                  색감 변경
                </button>
                <button onClick={() => setRefineMode('bg')}
                  className="py-2.5 rounded-xl text-[13px] font-bold bg-green-50 border border-green-200 text-green-600 active:bg-green-100">
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
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <h3 className="text-[13px] font-bold text-gray-800">{title}</h3>
      {description && <p className="text-[13px] text-gray-500 mt-1 mb-3 leading-relaxed">{description}</p>}
      {!description && <div className="mb-3" />}
      {children}
    </div>
  );
}
