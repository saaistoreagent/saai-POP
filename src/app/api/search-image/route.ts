import { NextRequest } from 'next/server';

/** DuckDuckGo 이미지 검색 — 상품 패키지/제품 사진 찾기 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) return Response.json({ images: [] });

  try {
    // 상품 사진 검색 — 쓸데없는 필터 없이 단순하게
    const searchQuery = `${query} 제품 사진`;

    // 1. VQD 토큰 획득
    const pageRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } }
    );
    const pageHtml = await pageRes.text();
    const vqdMatch = pageHtml.match(/vqd="([^"]+)"/);
    if (!vqdMatch) return Response.json({ images: [] });

    // 2. 이미지 검색 API
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=kr-kr&o=json&q=${encodeURIComponent(searchQuery)}&vqd=${vqdMatch[1]}&f=size:Medium`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://duckduckgo.com/',
        },
      }
    );
    if (!imgRes.ok) return Response.json({ images: [] });

    const data = await imgRes.json();

    // 결과 필터링: 너무 작거나 이상한 이미지 제외
    const results = (data.results || [])
      .filter((r: { width: number; height: number; image: string }) => {
        // 최소 크기 필터
        if (r.width < 200 || r.height < 200) return false;
        // 비율 필터 (너무 가로로 길거나 세로로 긴 이미지 제외)
        const ratio = r.width / r.height;
        if (ratio > 3 || ratio < 0.3) return false;
        // 아이콘/로고 사이즈 제외
        if (r.width < 300 && r.height < 300) return false;
        return true;
      })
      .slice(0, 10)
      .map((r: { image: string; thumbnail: string; title: string }) => ({
        // DDG CDN 썸네일을 기본 URL로 — 외부 핫링크 차단에 안 걸림
        url: r.thumbnail || r.image,
        thumbnail: r.thumbnail,
        originalUrl: r.image,
        title: r.title,
      }));

    return Response.json({ images: results });
  } catch (e) {
    console.error('[search-image] error:', e);
    return Response.json({ images: [] });
  }
}
