// 네이버 웹 검색으로 상품 관련 실시간 정보를 수집
export interface ProductSearchResult {
  snippets: string[]; // 검색 결과 본문 요약 (HTML 태그 제거)
  query: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

export async function searchProductInfo(
  productName: string,
  category: string
): Promise<ProductSearchResult> {
  const query = `${productName} 편의점`;

  try {
    const params = new URLSearchParams({ query, display: '5', sort: 'sim' });
    const res = await fetch(`/api/naver-search?${params.toString()}`);
    if (!res.ok) return { snippets: [], query };

    const json = await res.json();
    const items: { title: string; description: string }[] = json.items ?? [];

    const snippets = items
      .map((item) => {
        const title = stripHtml(item.title);
        const desc = stripHtml(item.description);
        return `${title}: ${desc}`;
      })
      .filter((s) => s.length > 10)
      .slice(0, 4);

    return { snippets, query };
  } catch {
    return { snippets: [], query };
  }
}
