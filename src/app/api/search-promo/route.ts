import { NextRequest } from 'next/server';

/** 모든 편의점에서 상품명 검색 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.toLowerCase() || '';
  if (!query || query.length < 2) {
    return Response.json({ items: [] });
  }

  // 4개 편의점 × 2타입 = 8개 동시 요청은 너무 무거움
  // 대신 각 편의점 1페이지만 빠르게 검색
  const stores = [
    { id: 'cu', url: 'https://cu.bgfretail.com/event/plusAjax.do', method: 'POST' as const },
    { id: 'seven', url: 'https://www.7-eleven.co.kr/product/listMoreAjax.asp', method: 'POST' as const },
  ];

  const results: { name: string; price: number; imageUrl: string; badge: string; store: string }[] = [];

  // CU 검색 (1페이지, 40개)
  try {
    const cuRes = await fetch('https://cu.bgfretail.com/event/plusAjax.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'pageIndex=1&listType=1',
      cache: 'no-store',
    });
    if (cuRes.ok) {
      const html = await cuRes.text();
      const blocks = html.split('<li class="prod_list">').slice(1);
      for (const block of blocks) {
        const nameMatch = block.match(/<div class="name"><p>(.*?)<\/p><\/div>/);
        if (!nameMatch || !nameMatch[1].toLowerCase().includes(query)) continue;
        const priceMatch = block.match(/<div class="price"><strong>([\d,]+)<\/strong>/);
        const imgMatch = block.match(/src="(\/\/tqklhszfkvzk[^"]+)"/);
        const badgeMatch = block.match(/<span class="plus(\d)">(\d\+\d)<\/span>/);
        results.push({
          name: nameMatch[1],
          price: parseInt((priceMatch?.[1] || '0').replace(/,/g, '')),
          imageUrl: imgMatch ? 'https:' + imgMatch[1] : '',
          badge: badgeMatch?.[2] || '행사',
          store: 'cu',
        });
      }
    }
  } catch { /* skip */ }

  // 세븐일레븐 검색 (100개)
  try {
    const sevenRes = await fetch('https://www.7-eleven.co.kr/product/listMoreAjax.asp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'intPageSize=100&intPage=1&pTab=1',
      cache: 'no-store',
    });
    if (sevenRes.ok) {
      const html = await sevenRes.text();
      let m;
      const names: string[] = [], prices: string[] = [], images: string[] = [];
      const nr = /<span class="tit_product">(.*?)<\/span>/g;
      const pr = /<dd class="price_list">\s*<span>([\d,]+)<\/span>/g;
      const ir = /src="(\/upload\/product\/[^"]+)"/g;
      while ((m = nr.exec(html)) !== null) names.push(m[1]);
      while ((m = pr.exec(html)) !== null) prices.push(m[1]);
      while ((m = ir.exec(html)) !== null) images.push('https://www.7-eleven.co.kr' + m[1]);
      for (let i = 0; i < names.length; i++) {
        if (names[i].toLowerCase().includes(query)) {
          results.push({
            name: names[i],
            price: parseInt((prices[i] || '0').replace(/,/g, '')),
            imageUrl: images[i] || '',
            badge: '1+1',
            store: 'seven',
          });
        }
      }
    }
  } catch { /* skip */ }

  return Response.json({ items: results.slice(0, 20) });
}
