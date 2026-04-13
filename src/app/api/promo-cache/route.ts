import { NextRequest } from 'next/server';

interface CachedPromo {
  name: string;
  price: number;
  imageUrl: string;
  badge: string;
  store: string;
}

/** 서버 메모리 캐시 — 클라이언트가 store별로 요청해서 채움 */
let cache: CachedPromo[] = [];
let stores: Record<string, CachedPromo[]> = {};

/** 특수문자/공백 제거 → 순수 텍스트만 비교 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^가-힣a-z0-9]/g, '');
}

/** GET ?action=search&q=새우깡 → 검색 */
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'search';
  const query = request.nextUrl.searchParams.get('q') || '';

  if (action === 'search' && query) {
    const nq = normalize(query);
    // 각 검색어 단어별로 분리해서 모두 포함하는지 체크
    const words = query.toLowerCase().split(/\s+/).map(w => normalize(w)).filter(Boolean);

    const results = cache.filter(item => {
      const nn = normalize(item.name);
      // 방법 1: 정규화된 이름에 정규화된 쿼리 전체가 포함
      if (nn.includes(nq)) return true;
      // 방법 2: 모든 단어가 정규화된 이름에 포함
      if (words.length > 1 && words.every(w => nn.includes(w))) return true;
      // 방법 3: 쿼리가 이름에 포함 (원본 비교)
      if (item.name.toLowerCase().includes(query.toLowerCase())) return true;
      return false;
    }).slice(0, 10);

    return Response.json({ total: cache.length, items: results });
  }

  return Response.json({ total: cache.length, items: [] });
}

/** POST: 클라이언트가 크롤링한 데이터를 서버에 저장 */
export async function POST(request: NextRequest) {
  try {
    const { store, items } = await request.json() as { store: string; items: CachedPromo[] };
    if (store && items?.length) {
      stores[store] = items;
      cache = Object.values(stores).flat();
      console.log(`[promo-cache] ${store}: ${items.length}개 저장 (전체: ${cache.length}개)`);
    }
    return Response.json({ ok: true, total: cache.length });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
