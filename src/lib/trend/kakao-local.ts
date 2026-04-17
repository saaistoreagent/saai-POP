// Kakao Local API 카테고리 검색 래퍼
// Docs: https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-category

export interface KakaoPlace {
  id: string;
  name: string;           // 장소명 (예: "GS25 역삼점")
  categoryCode: string;   // CS2, SW8 등
  categoryName: string;   // 카카오 계층 텍스트
  address: string;        // 도로명 주소
  phone?: string;
  distanceMeters: number; // 기준 좌표로부터 거리
  lng: number;
  lat: number;
}

// 관심 카테고리 코드 — 공식 카카오 카테고리 그룹 코드
export const KAKAO_CATEGORIES = {
  convenienceStore: 'CS2',   // 편의점
  subway:           'SW8',   // 지하철역
  school:           'SC4',   // 학교 (초·중·고·대학)
  academy:          'AC5',   // 학원
  cafe:             'CE7',   // 카페
  restaurant:       'FD6',   // 음식점
  tourism:          'AT4',   // 관광명소
  culture:          'CT1',   // 문화시설
  mart:             'MT1',   // 대형마트
  hospital:         'HP8',   // 병원
  publicOffice:     'PO3',   // 공공기관
} as const;

export type KakaoCategoryCode = typeof KAKAO_CATEGORIES[keyof typeof KAKAO_CATEGORIES];

interface KakaoDoc {
  id: string;
  place_name: string;
  category_group_code: string;
  category_name: string;
  road_address_name: string;
  address_name: string;
  phone: string;
  distance: string;
  x: string;
  y: string;
}

async function searchByCategory(
  code: KakaoCategoryCode,
  cx: number,
  cy: number,
  radius: number,
  page = 1,
): Promise<KakaoPlace[]> {
  const params = new URLSearchParams({
    path: '/v2/local/search/category.json',
    category_group_code: code,
    x: String(cx),
    y: String(cy),
    radius: String(radius),
    sort: 'distance',
    page: String(page),
    size: '15',
  });

  try {
    const res = await fetch(`/api/trend/kakao?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    const docs: KakaoDoc[] = json.documents ?? [];
    return docs.map((d) => ({
      id: d.id,
      name: d.place_name,
      categoryCode: d.category_group_code,
      categoryName: d.category_name,
      address: d.road_address_name || d.address_name,
      phone: d.phone || undefined,
      distanceMeters: parseInt(d.distance, 10) || 0,
      lng: parseFloat(d.x),
      lat: parseFloat(d.y),
    }));
  } catch {
    return [];
  }
}

export interface AreaLandmarks {
  convenienceStores: KakaoPlace[];
  subway: KakaoPlace[];
  schools: KakaoPlace[];
  academies: KakaoPlace[];
  cafes: KakaoPlace[];
  restaurants: KakaoPlace[];
  tourism: KakaoPlace[];
  culture: KakaoPlace[];
  marts: KakaoPlace[];
  hospitals: KakaoPlace[];
  publicOffices: KakaoPlace[];
}

const CACHE_TTL = 24 * 60 * 60 * 1000;

function cacheKey(cx: number, cy: number, radius: number) {
  return `kakao_area_v1_${cx.toFixed(4)}_${cy.toFixed(4)}_${radius}`;
}

export async function scanNearby(
  cx: number,
  cy: number,
  radius = 500,
): Promise<AreaLandmarks> {
  const key = cacheKey(cx, cy, radius);
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return data;
    }
  } catch {
    // cache 파싱 실패 무시
  }

  const [
    convenienceStores,
    subway,
    schools,
    academies,
    cafes,
    restaurants,
    tourism,
    culture,
    marts,
    hospitals,
    publicOffices,
  ] = await Promise.all([
    searchByCategory(KAKAO_CATEGORIES.convenienceStore, cx, cy, radius),
    searchByCategory(KAKAO_CATEGORIES.subway, cx, cy, radius),
    searchByCategory(KAKAO_CATEGORIES.school, cx, cy, radius),
    searchByCategory(KAKAO_CATEGORIES.academy, cx, cy, radius),
    searchByCategory(KAKAO_CATEGORIES.cafe, cx, cy, radius),
    searchByCategory(KAKAO_CATEGORIES.restaurant, cx, cy, radius),
    searchByCategory(KAKAO_CATEGORIES.tourism, cx, cy, radius),
    searchByCategory(KAKAO_CATEGORIES.culture, cx, cy, radius),
    searchByCategory(KAKAO_CATEGORIES.mart, cx, cy, radius),
    searchByCategory(KAKAO_CATEGORIES.hospital, cx, cy, radius),
    searchByCategory(KAKAO_CATEGORIES.publicOffice, cx, cy, radius),
  ]);

  const landmarks: AreaLandmarks = {
    convenienceStores,
    subway,
    schools,
    academies,
    cafes,
    restaurants,
    tourism,
    culture,
    marts,
    hospitals,
    publicOffices,
  };

  try {
    localStorage.setItem(key, JSON.stringify({ data: landmarks, ts: Date.now() }));
  } catch {
    // 용량 초과 등 무시
  }

  return landmarks;
}

// 체인 편의점 추출: 상호명에 주요 체인명 포함 여부로 분류
const CHAIN_BRANDS = ['CU', 'GS25', '세븐일레븐', '7-Eleven', '이마트24', 'emart24', '미니스톱', 'MINISTOP'];
export function classifyConvenienceStores(places: KakaoPlace[]) {
  const chains: Record<string, KakaoPlace[]> = {};
  const independents: KakaoPlace[] = [];
  for (const p of places) {
    const matched = CHAIN_BRANDS.find((b) => p.name.includes(b));
    if (matched) {
      const normalized = matched === '7-Eleven' ? '세븐일레븐'
        : matched === 'emart24' ? '이마트24'
        : matched === 'MINISTOP' ? '미니스톱'
        : matched;
      (chains[normalized] ||= []).push(p);
    } else {
      independents.push(p);
    }
  }
  return { chains, independents };
}

// 학교 세분화: 이름 기반
export function classifySchools(places: KakaoPlace[]) {
  const elementary = places.filter((p) => /초등학교/.test(p.name));
  const middle = places.filter((p) => /중학교/.test(p.name) && !/중·?고|중고/.test(p.name));
  const high = places.filter((p) => /고등학교/.test(p.name));
  const university = places.filter((p) => /대학교|대학$|University/i.test(p.name));
  const other = places.filter((p) =>
    !elementary.includes(p) && !middle.includes(p) && !high.includes(p) && !university.includes(p),
  );
  return { elementary, middle, high, university, other };
}
