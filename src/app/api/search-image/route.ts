import { NextRequest } from 'next/server';

const NAVER_CLIENT_ID = 'id_430ivqYvXj93qAg9i';
const NAVER_CLIENT_SECRET = 'h0l8SQ5hLq';

/** 네이버 쇼핑 API → 제품 이미지 검색 (누끼 이미지 제공) */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) return Response.json({ images: [] });

  try {
    // 네이버 쇼핑 검색 API
    const res = await fetch(
      `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=10&sort=sim`,
      {
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        },
      }
    );

    if (!res.ok) {
      console.error('[search-image] 네이버 API 에러:', res.status);
      return Response.json({ images: [] });
    }

    const data = await res.json();
    const results = (data.items || [])
      .filter((item: { image: string }) => item.image)
      .slice(0, 10)
      .map((item: { image: string; title: string }) => ({
        url: item.image,
        thumbnail: item.image,
        originalUrl: item.image,
        title: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
      }));

    return Response.json({ images: results });
  } catch (e) {
    console.error('[search-image] error:', e);
    return Response.json({ images: [] });
  }
}
