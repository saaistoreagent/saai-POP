import { NextRequest } from 'next/server';

export interface PromoItem {
  name: string;
  price: number;
  imageUrl: string;
  badge: string;
  store: string;
}

/** CU — 전체 페이지 순회, HTML에서 실제 배지(1+1/2+1) 파싱 */
async function fetchCU(type: string): Promise<PromoItem[]> {
  const all: PromoItem[] = [];

  for (let page = 1; page <= 3; page++) {
    const res = await fetch('https://cu.bgfretail.com/event/plusAjax.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `pageIndex=${page}&listType=1`,
      cache: 'no-store',
    });
    if (!res.ok) break;
    const html = await res.text();

    // 각 상품 블록 단위로 분리
    const blocks = html.split('<li class="prod_list">').slice(1);
    if (blocks.length === 0) break;

    for (const block of blocks) {
      const nameMatch = block.match(/<div class="name"><p>(.*?)<\/p><\/div>/);
      const priceMatch = block.match(/<div class="price"><strong>([\d,]+)<\/strong>/);
      const imgMatch = block.match(/src="(\/\/tqklhszfkvzk[^"]+)"/);
      if (!nameMatch) continue;

      // 주석이 아닌 실제 <span class="plusN"> 태그에서 배지 추출
      const badgeMatch = block.match(/<span class="plus(\d)">(\d\+\d)<\/span>/);
      const badge = badgeMatch ? badgeMatch[2] : '1+1';

      // type 필터링
      if (badge !== type) continue;

      all.push({
        name: nameMatch[1],
        price: parseInt((priceMatch?.[1] || '0').replace(/,/g, '')),
        imageUrl: imgMatch ? 'https:' + imgMatch[1] : '',
        badge,
        store: 'cu',
      });
    }
  }
  return all;
}

/** 세븐일레븐 — pageSize 크게 잡아 한번에 가져오기 */
async function fetchSeven(type: string): Promise<PromoItem[]> {
  const pTab = type === '2+1' ? '2' : '1';
  const res = await fetch('https://www.7-eleven.co.kr/product/listMoreAjax.asp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `intPageSize=30&intPage=1&pTab=${pTab}`,
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const html = await res.text();
  const names: string[] = [], prices: string[] = [], images: string[] = [];
  let m;
  const nr = /<span class="tit_product">(.*?)<\/span>/g;
  const pr = /<dd class="price_list">\s*<span>([\d,]+)<\/span>/g;
  const ir = /src="(\/upload\/product\/[^"]+)"/g;
  while ((m = nr.exec(html)) !== null) names.push(m[1]);
  while ((m = pr.exec(html)) !== null) prices.push(m[1]);
  while ((m = ir.exec(html)) !== null) images.push('https://www.7-eleven.co.kr' + m[1]);
  return names.map((name, i) => ({
    name, price: parseInt((prices[i] || '0').replace(/,/g, '')),
    imageUrl: images[i] || '', badge: type, store: 'seven',
  }));
}

/** GS25 — 페이지 순회 + 중복 감지 시 조기 중단 + 이름 기반 dedup */
async function fetchGS25(type: string): Promise<PromoItem[]> {
  try {
  const eventType = type === '2+1' ? 'TWO_TO_ONE' : 'ONE_TO_ONE';
  const pageRes = await fetch('https://gs25.gsretail.com/gscvs/ko/products/event-goods', {
    cache: 'no-store',
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!pageRes.ok) { console.error('[gs25] main page:', pageRes.status); return []; }
  const pageHtml = await pageRes.text();
  const tokenMatch = pageHtml.match(/value="([a-f0-9-]{36})"/);
  if (!tokenMatch) { console.error('[gs25] no CSRF token found'); return []; }
  const cookie = pageRes.headers.get('set-cookie') || '';
  const sessionId = cookie.match(/JSESSIONID=([^;]+)/)?.[1] || '';

  const all: PromoItem[] = [];
  const seenNames = new Set<string>();
  let prevPageKeys: string | null = null;

  for (let page = 1; page <= 50; page++) {
    const res = await fetch('https://gs25.gsretail.com/gscvs/ko/products/event-goods-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://gs25.gsretail.com/gscvs/ko/products/event-goods',
        'Cookie': sessionId ? `JSESSIONID=${sessionId}` : '',
      },
      body: `CSRFToken=${tokenMatch[1]}&parameterList%5B0%5D.is498=N&parameterList%5B0%5D.isEvent=Y&parameterList%5B0%5D.eventTypeList=${eventType}&parameterList%5B0%5D.paginationInfo.pageIndex=${page}`,
      cache: 'no-store',
    });
    if (!res.ok) break;
    try {
      const text = await res.text();
      const json = JSON.parse(text.startsWith('"') ? JSON.parse(text) : text);
      const results = json.results || [];
      if (results.length === 0) break;

      // Build a fingerprint of this page's results to detect duplicate pages
      const pageKeys = results.map((r: Record<string, unknown>) => r.goodsNm).join('|');
      if (prevPageKeys !== null && pageKeys === prevPageKeys) {
        // Server returned the same items as previous page — pagination is broken, stop
        break;
      }
      prevPageKeys = pageKeys;

      for (const r of results) {
        const name: string = r.goodsNm || '';
        // Deduplicate by product name
        if (seenNames.has(name)) continue;
        seenNames.add(name);

        // Preserve the original badge from the API (e.g. "덤증정", "1+1", "2+1")
        const badge: string = r.eventTypeNm || type;

        all.push({
          name,
          price: r.price || 0,
          imageUrl: r.attFileNm || '',
          badge,
          store: 'gs25',
        });
      }
    } catch {
      break;
    }
  }
  return all;
  } catch (e) {
    console.error('[gs25] error:', e);
    return [];
  }
}

/** 이마트24 — 전체 페이지 순회 */
async function fetchEmart24(type: string): Promise<PromoItem[]> {
  const all: PromoItem[] = [];

  for (let page = 1; page <= 3; page++) {
    const res = await fetch(`https://emart24.co.kr/goods/event?page=${page}`, { cache: 'no-store' });
    if (!res.ok) break;
    const html = await res.text();

    const names: string[] = [];
    const prices: string[] = [];
    const images: string[] = [];
    const badges: string[] = [];

    let m;
    const nr = /href="#none">([^<]+)<\/a>/g;
    const pr = /class="price">([\d,]+)\s*원/g;
    const ir = /src="(https:\/\/msave\.emart24[^"]+)"/g;
    const br = /(onepl|twopl|gola)/g;

    while ((m = nr.exec(html)) !== null) names.push(m[1].trim());
    while ((m = pr.exec(html)) !== null) prices.push(m[1]);
    while ((m = ir.exec(html)) !== null) images.push(m[1]);
    while ((m = br.exec(html)) !== null) badges.push(m[1] === 'onepl' ? '1+1' : m[1] === 'twopl' ? '2+1' : '골라담기');

    if (names.length === 0) break;

    for (let i = 0; i < names.length; i++) {
      const badge = badges[i] || '1+1';
      if (type === '1+1' && badge !== '1+1') continue;
      if (type === '2+1' && badge !== '2+1') continue;
      all.push({
        name: names[i],
        price: parseInt((prices[i] || '0').replace(/,/g, '')),
        imageUrl: images[i] || '',
        badge,
        store: 'emart24',
      });
    }
  }
  return all;
}

export async function GET(request: NextRequest) {
  const store = request.nextUrl.searchParams.get('store') || 'cu';
  const type = request.nextUrl.searchParams.get('type') || '1+1';

  try {
    let items: PromoItem[] = [];
    switch (store) {
      case 'cu': items = await fetchCU(type); break;
      case 'seven': items = await fetchSeven(type); break;
      case 'gs25': items = await fetchGS25(type); break;
      case 'emart24': items = await fetchEmart24(type); break;
    }
    return Response.json({ items, store, type });
  } catch (e) {
    console.error('[promo] error:', e);
    return Response.json({ items: [], store, type });
  }
}
