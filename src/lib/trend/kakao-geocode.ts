export interface AddressResult {
  placeName: string;           // 장소명 (예: 역삼역, 스타벅스 역삼점)
  address: string;             // 도로명/지번 주소
  cx: number;                  // longitude
  cy: number;                  // latitude
  distanceMeters?: number;     // 유저 좌표 기준 거리 (coords 전달 시)
}

export interface UserCoords {
  lng: number;
  lat: number;
}

export async function searchAddress(
  query: string,
  coords?: UserCoords,
): Promise<AddressResult[]> {
  if (!query.trim()) return [];

  // keyword 검색: 장소명·주소 모두 지원 (역삼역, 강남구 역삼동 123 등)
  // 좌표 전달 시 거리순 정렬 (sort=distance 요구 params: x, y)
  const params = new URLSearchParams({
    path: '/v2/local/search/keyword.json',
    query,
    category_group_code: 'CS2',
    size: coords ? '10' : '5',
  });
  if (coords) {
    params.set('x', String(coords.lng));
    params.set('y', String(coords.lat));
    params.set('sort', 'distance');
  }

  const res = await fetch(`/api/trend/kakao?${params.toString()}`);
  if (!res.ok) throw new Error(`Kakao geocode ${res.status}`);
  const json = await res.json();

  return (json.documents ?? []).map((doc: {
    place_name: string;
    road_address_name: string;
    address_name: string;
    x: string;
    y: string;
    distance?: string;
  }) => ({
    placeName: doc.place_name,
    address: doc.road_address_name || doc.address_name || doc.place_name,
    cx: parseFloat(doc.x),
    cy: parseFloat(doc.y),
    distanceMeters: doc.distance ? parseInt(doc.distance, 10) : undefined,
  }));
}
