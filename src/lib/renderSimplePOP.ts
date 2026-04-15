import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import path from 'path';

const fontDir = path.join(process.cwd(), 'public', 'fonts');
try { GlobalFonts.registerFromPath(path.join(fontDir, 'DoHyeon.ttf'), 'DoHyeon'); } catch {}
try { GlobalFonts.registerFromPath(path.join(fontDir, 'Jua.ttf'), 'Jua'); } catch {}
try { GlobalFonts.registerFromPath('/System/Library/Fonts/AppleSDGothicNeo.ttc', 'AppleSD'); } catch {}

const FB = 'DoHyeon, AppleSD, sans-serif';
const FP = 'Jua, AppleSD, sans-serif';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = any;
interface ProductInfo { name: string; originalPrice?: number | null; price?: number | null; }
const A4W = 794, A4H = 1123;

function isLight(hex: string): boolean {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  } catch { return true; }
}
function textColor(bg: string) { return isLight(bg) ? '#1F2937' : '#FFFFFF'; }
function priceColor(bg: string) { return isLight(bg) ? '#DC2626' : '#FFD700'; }

/** AI 카드 1개를 그리드에 복사 배치 */
export async function tileImageToSheet(
  imageBase64: string, cols: number, rows: number, isLandscape: boolean,
): Promise<string> {
  const { loadImage } = require('@napi-rs/canvas');
  const W = isLandscape ? A4H : A4W, H = isLandscape ? A4W : A4H;
  const cellW = Math.floor(W / cols), cellH = Math.floor(H / rows);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);

  const img = await loadImage(imageBase64);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.drawImage(img, c * cellW, r * cellH, cellW, cellH);
    }
  }
  // 절취선
  ctx.setLineDash([8, 4]); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
  for (let c = 1; c < cols; c++) { ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, H); ctx.stroke(); }
  for (let r = 1; r < rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(W, r * cellH); ctx.stroke(); }

  return rotateIfLandscape(canvas, !!isLandscape);
}

/** 정상가 취소선 그리기 — 배경 밝기에 따라 색 적응 */
function drawOriginalPrice(ctx: Ctx, op: number, cx: number, y: number, fontSize: number, bg?: string) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const isBgLight = bg ? isLight(bg) : false;
  ctx.fillStyle = isBgLight ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.85)';
  ctx.font = 'bold ' + fontSize + 'px ' + FP;
  const str = op.toLocaleString('ko-KR') + '원';
  ctx.fillText(str, cx, y);
  const w = ctx.measureText(str).width;
  ctx.strokeStyle = isBgLight ? '#B91C1C' : '#FF5050';
  ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.12));
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(cx - w / 2 - 4, y); ctx.lineTo(cx + w / 2 + 4, y); ctx.stroke();
}

/** 상품 사진을 지정된 박스에 object-contain으로 그리기. 실패 시 조용히 스킵. */
async function drawProductPhoto(
  ctx: Ctx, src: string | null | undefined,
  x: number, y: number, w: number, h: number,
): Promise<boolean> {
  if (!src) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const img: any = await loadImage(src);
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let dw: number, dh: number, dx: number, dy: number;
    if (imgRatio > boxRatio) { dw = w; dh = w / imgRatio; dx = x; dy = y + (h - dh) / 2; }
    else { dh = h; dw = h * imgRatio; dx = x + (w - dw) / 2; dy = y; }
    ctx.drawImage(img, dx, dy, dw, dh);
    return true;
  } catch {
    return false;
  }
}

/** 여러 이미지 미리 로드 (null/URL/data URL 섞여 있음) */
async function preloadImages(srcs: (string | null | undefined)[]): Promise<(unknown | null)[]> {
  return Promise.all(srcs.map(async s => {
    if (!s) return null;
    try {
      return await loadImage(s);
    } catch {
      return null;
    }
  }));
}

/** 텍스트가 maxW 안에 들어가도록 폰트 사이즈를 줄여 반환 (찌그러짐 방지) */
function fitFontSize(ctx: Ctx, text: string, maxW: number, baseFs: number, family: string, minFs = 12): number {
  let fs = baseFs;
  ctx.font = 'bold ' + fs + 'px ' + family;
  while (ctx.measureText(text).width > maxW && fs > minFs) {
    fs -= 2;
    ctx.font = 'bold ' + fs + 'px ' + family;
  }
  return fs;
}

/** 가중치 기반 세로 배치 — 요소별 가중치에 따라 공간 비례 배분 */
interface LayoutItem {
  weight: number;
  draw: (centerY: number, slotH: number) => void;
}
function layoutVertical(items: LayoutItem[], areaY: number, areaH: number, pad: number) {
  if (items.length === 0) return;
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const availH = areaH - pad * 2;
  let curY = areaY + pad;
  for (const item of items) {
    const slotH = (item.weight / totalWeight) * availH;
    item.draw(curY + slotH / 2, slotH);
    curY += slotH;
  }
}

/** 케이스별 좌우/상하 배치 (선반/띠지 공통). 영역(x,y,w,h) 안에서 배지/이름/가격을 편의점 POP 스타일로 배치 */
function drawProductBlock(
  ctx: Ctx,
  opts: {
    x: number; y: number; w: number; h: number;
    badge?: string;
    name?: string;
    price?: number | null;
    originalPrice?: number | null;
    bg: string;  // 카드/스트립 배경색
    badgeBg: string;
    badgeTc: string;
  }
) {
  const { x, y, w, h, badge, name, price, originalPrice, bg, badgeBg, badgeTc } = opts;
  const hasBadge = !!(badge && badge !== '없음');
  const hasName = !!name;
  const hasPrice = !!(price && price > 0);
  const count = (hasBadge ? 1 : 0) + (hasName ? 1 : 0) + (hasPrice ? 1 : 0);
  if (count === 0) return;

  const pad = Math.min(h, w) * 0.05;
  const cx = x + w / 2;
  const cy = y + h / 2;

  // 1요소 — 가운데 크게
  if (count === 1) {
    if (hasBadge) {
      const bh = h * 0.55;
      ctx.font = 'bold ' + Math.round(bh * 0.6) + 'px ' + FB;
      const btw = ctx.measureText(badge!).width + bh * 0.6;
      const bw = Math.max(bh * 1.5, Math.min(w * 0.7, btw));
      drawBadge(ctx, badge!, cx - bw / 2, cy - bh / 2, bw, bh, badgeBg, badgeTc);
    } else if (hasName) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
      fitFontSize(ctx, name!, w * 0.85, Math.round(h * 0.45), FB);
      ctx.fillText(name!, cx, cy);
    } else if (hasPrice) {
      drawPriceInline(ctx, price!, originalPrice, cx, cy, Math.round(h * 0.45), bg, 'center', w - pad * 2);
    }
    return;
  }

  const gap = Math.max(10, w * 0.03);

  // 2요소
  if (count === 2) {
    if (hasBadge && (hasName || hasPrice)) {
      // 배지 좌측 작게 + 이름/가격 나머지 공간 가운데 크게
      const badgeW = Math.min(w * 0.22, h * 1.3);
      const bh = Math.min(h * 0.55, badgeW * 0.65);
      ctx.font = 'bold ' + Math.round(bh * 0.6) + 'px ' + FB;
      const btw = ctx.measureText(badge!).width + bh * 0.5;
      const bw = Math.max(bh * 1.3, Math.min(badgeW, btw));
      drawBadge(ctx, badge!, x + pad, cy - bh / 2, bw, bh, badgeBg, badgeTc);

      // 나머지 영역 가운데에 이름/가격
      const restX = x + pad + bw + gap;
      const restRight = x + w - pad;
      const restW = restRight - restX;
      const restCx = restX + restW / 2;
      if (hasName) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
        fitFontSize(ctx, name!, restW * 0.95, Math.round(h * 0.5), FB);
        ctx.fillText(name!, restCx, cy);
      } else if (hasPrice) {
        drawPriceInline(ctx, price!, originalPrice, restCx, cy, Math.round(h * 0.5), bg, 'center', restW * 0.95);
      }
    } else if (hasName && hasPrice) {
      // 이름 좌, 가격 우 (반반)
      const halfW = (w - pad * 2 - gap) / 2;
      const leftCx = x + pad + halfW / 2;
      const rightCx = x + pad + halfW + gap + halfW / 2;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
      fitFontSize(ctx, name!, halfW * 0.95, Math.round(h * 0.45), FB);
      ctx.fillText(name!, leftCx, cy);
      drawPriceInline(ctx, price!, originalPrice, rightCx, cy, Math.round(h * 0.45), bg, 'center', halfW * 0.95);
    }
    return;
  }

  // 3요소
  const isWide = w / h >= 2; // 띠지: 가로 비율 높음 → 3열 가로 분할

  if (isWide) {
    // 띠지 스타일: [배지 좌] | [이름 중] | [가격 우] 한 줄
    const thirdW = (w - pad * 2 - gap * 2) / 3;
    const badgeCx = x + pad + thirdW / 2;
    const nameCx = x + pad + thirdW + gap + thirdW / 2;
    const priceCx = x + pad + thirdW * 2 + gap * 2 + thirdW / 2;

    const bh = h * 0.55;
    ctx.font = 'bold ' + Math.round(bh * 0.6) + 'px ' + FB;
    const btw = ctx.measureText(badge!).width + bh * 0.5;
    const bw = Math.max(bh * 1.3, Math.min(thirdW * 0.9, btw));
    drawBadge(ctx, badge!, badgeCx - bw / 2, cy - bh / 2, bw, bh, badgeBg, badgeTc);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
    fitFontSize(ctx, name!, thirdW * 0.95, Math.round(h * 0.35), FB);
    ctx.fillText(name!, nameCx, cy);

    drawPriceInline(ctx, price!, originalPrice, priceCx, cy, Math.round(h * 0.35), bg, 'center', thirdW * 0.95);
    return;
  }

  // 선반 스타일: 상단(배지 좌 + 이름 우) / 하단(가격 강조)
  const topH = h * 0.4;
  const botH = h * 0.5;
  const topCy = y + pad + topH / 2;
  const botCy = y + h - pad - botH / 2;

  const bh = topH * 0.75;
  ctx.font = 'bold ' + Math.round(bh * 0.6) + 'px ' + FB;
  const btw = ctx.measureText(badge!).width + bh * 0.5;
  const bw = Math.max(bh * 1.3, Math.min(w * 0.3, btw));
  drawBadge(ctx, badge!, x + pad, topCy - bh / 2, bw, bh, badgeBg, badgeTc);

  const nameX = x + pad + bw + gap;
  const nameRight = x + w - pad;
  const nameW = nameRight - nameX;
  if (nameW > 20) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
    fitFontSize(ctx, name!, nameW * 0.95, Math.round(topH * 0.8), FB);
    ctx.fillText(name!, nameX + nameW / 2, topCy);
  }

  drawPriceInline(ctx, price!, originalPrice, cx, botCy, Math.round(botH * 0.6), bg, 'center', w - pad * 2);
}

/** 가격 인라인 그리기 (정가 취소선 → 할인가). cx, cy 가운데 정렬. maxW 초과 시 자동 축소. 반환: 그려진 전체 너비 */
function drawPriceInline(ctx: Ctx, price: number, originalPrice: number | null | undefined, cx: number, cy: number, priceFs: number, bg: string, align: 'left' | 'center' | 'right' = 'center', maxW = Infinity): number {
  const hasOrig = originalPrice && originalPrice > price;
  const priceStr = price.toLocaleString('ko-KR') + '원';
  const isBgLight = isLight(bg);

  // maxW 체크: 전체 너비가 maxW 초과하면 priceFs 축소
  const computeTotalW = (fs: number) => {
    if (hasOrig) {
      const ofs = Math.round(fs * 0.55);
      const origStr = originalPrice!.toLocaleString('ko-KR') + '원';
      const gap = ofs * 0.8;
      ctx.font = 'bold ' + ofs + 'px ' + FP;
      const ow = ctx.measureText(origStr).width;
      ctx.font = 'bold ' + fs + 'px ' + FP;
      const pw = ctx.measureText(priceStr).width;
      return ow + gap + pw;
    }
    ctx.font = 'bold ' + fs + 'px ' + FP;
    return ctx.measureText(priceStr).width;
  };
  while (computeTotalW(priceFs) > maxW && priceFs > 12) priceFs -= 2;

  if (hasOrig) {
    const origFs = Math.round(priceFs * 0.55);
    const origStr = originalPrice!.toLocaleString('ko-KR') + '원';
    const gap = origFs * 0.8;
    ctx.font = 'bold ' + origFs + 'px ' + FP;
    const origW = ctx.measureText(origStr).width;
    ctx.font = 'bold ' + priceFs + 'px ' + FP;
    const priceW = ctx.measureText(priceStr).width;
    const totalW = origW + gap + priceW;
    let curX = align === 'center' ? cx - totalW / 2 : align === 'right' ? cx - totalW : cx;
    // 정가 (취소선)
    ctx.fillStyle = isBgLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + origFs + 'px ' + FP;
    ctx.fillText(origStr, curX, cy);
    ctx.strokeStyle = isBgLight ? '#B91C1C' : '#FF5050';
    ctx.lineWidth = Math.max(2, Math.round(origFs * 0.1));
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(curX - 2, cy); ctx.lineTo(curX + origW + 2, cy); ctx.stroke();
    curX += origW + gap;
    // 할인가
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold ' + priceFs + 'px ' + FP;
    ctx.fillText(priceStr, curX, cy);
    return totalW;
  } else {
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + priceFs + 'px ' + FP;
    ctx.fillText(priceStr, cx, cy);
    return ctx.measureText(priceStr).width;
  }
}

/** 배지 그리기 — 줄바꿈 지원, 텍스트에 맞게 너비 자동 조절, 폰트 축소. w는 최대 너비. */
function drawBadge(ctx: Ctx, text: string, x: number, y: number, w: number, h: number, bg: string, tc: string) {
  const lines = text.split('\n').filter(l => l.trim());
  const lineCount = Math.max(lines.length, 1);

  // 줄 수에 따라 기본 폰트 크기 조절
  const baseFsRatio = lineCount === 1 ? (text.length > 3 ? 0.5 : 0.65)
    : lineCount === 2 ? 0.35 : 0.25;
  const baseFs = Math.round(h * baseFsRatio);

  // 가장 긴 줄 기준으로 폰트 축소
  const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '');
  const fs = fitFontSize(ctx, longestLine, w * 0.88, baseFs, FB, 8);
  ctx.font = 'bold ' + fs + 'px ' + FB;

  // 배지 너비: 가장 긴 줄 기준
  const maxLineW = Math.max(...lines.map(l => ctx.measureText(l).width));
  const pad = h * 0.3;
  const badgeW = Math.max(h, Math.min(w, maxLineW + pad * 2));

  // 배경 (둥근 모서리)
  ctx.fillStyle = bg;
  const r = h * 0.2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + badgeW - r, y);
  ctx.arcTo(x + badgeW, y, x + badgeW, y + r, r);
  ctx.lineTo(x + badgeW, y + h - r);
  ctx.arcTo(x + badgeW, y + h, x + badgeW - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();

  // 텍스트 (줄별로 그리기)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = tc;
  const lineH = fs * 1.2;
  const totalTextH = lineCount * lineH;
  const startY = y + (h - totalTextH) / 2 + lineH / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + badgeW / 2, startY + i * lineH);
  }
}

/** 캔버스를 PNG base64로 변환 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function canvasToDataUrl(canvas: any): string {
  return 'data:image/png;base64,' + canvas.toBuffer('image/png').toString('base64');
}

/** 가로형일 때 90도 회전 — A4 세로 인쇄 후 종이를 돌려서 읽는 방식 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rotateIfLandscape(canvas: any, isLandscape: boolean): string {
  if (!isLandscape) return canvasToDataUrl(canvas);
  const src = canvas;
  const dst = createCanvas(src.height, src.width);
  const ctx = dst.getContext('2d') as Ctx;
  ctx.translate(src.height, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return canvasToDataUrl(dst);
}

function getBadgeColors(type: string) {
  switch (type) {
    case '1+1': return { bg: '#E91E90', bgAlt: '#C4167A' };
    case '2+1': return { bg: '#4CAF50', bgAlt: '#2E7D32' };
    case '3+1': return { bg: '#00BCD4', bgAlt: '#00838F' };
    case '덤증정': return { bg: '#DC2626', bgAlt: '#991B1B' };
    default: return { bg: '#DC2626', bgAlt: '#B91C1C' };
  }
}

// ════════════════════════════════════════
// 행사 배지 — 레퍼런스 재현
// ════════════════════════════════════════
export function renderBadgeSheet(badgeType: string, isLandscape: boolean, customColor?: string): string {
  const W = isLandscape ? A4H : A4W, H = isLandscape ? A4W : A4H;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as Ctx;
  const bc = getBadgeColors(badgeType);
  const cols = isLandscape ? 4 : 3, rows = isLandscape ? 3 : 5;
  const bw = Math.floor(W / cols), bh = Math.floor(H / rows);

  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * bw, y = r * bh;
      const cellBg = customColor || ((r + c) % 2 === 0 ? bc.bg : bc.bgAlt);
      ctx.fillStyle = cellBg;
      ctx.fillRect(x, y, bw, bh);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor(cellBg);
      // 글자수 기반 자동 크기 — 잘리지 않게
      let fs = Math.round(bh * 0.7);
      ctx.font = 'bold ' + fs + 'px ' + FB;
      while (ctx.measureText(badgeType).width > bw * 0.85 && fs > 10) {
        fs -= 2;
        ctx.font = 'bold ' + fs + 'px ' + FB;
      }
      ctx.fillText(badgeType, x + bw / 2, y + bh / 2);
    }
  }
  // 절취선 (배경 위에 그려야 보임)
  ctx.setLineDash([8, 4]); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
  for (let c = 1; c < cols; c++) { ctx.beginPath(); ctx.moveTo(c * bw, 0); ctx.lineTo(c * bw, H); ctx.stroke(); }
  for (let r = 1; r < rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * bh); ctx.lineTo(W, r * bh); ctx.stroke(); }
  return canvasToDataUrl(canvas);
}

// ════════════════════════════════════════
// 선반 가격표 — 카드 전체가 색깔, 임팩트 있게
// ════════════════════════════════════════
export async function renderShelfSheet(
  products: ProductInfo[],
  badgeType?: string,
  isLandscape?: boolean,
  bgColor?: string,
  productImages?: (string | null | undefined)[],
): Promise<string> {
  const W = isLandscape ? A4H : A4W, H = isLandscape ? A4W : A4H;
  const cols = 2, rows = isLandscape ? 3 : 4;
  const cellW = Math.floor(W / cols), cellH = Math.floor(H / rows);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as Ctx;
  const hasBadge = badgeType && badgeType !== '없음';
  const bc = getBadgeColors(badgeType || '');
  const hasPhotos = !!(productImages && productImages.some(p => p));

  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);

  // 그룹핑: N개 상품을 총 셀에 균등 배분 (연속된 칸에 같은 상품)
  const totalCells = cols * rows;
  const validProducts = products.filter(p => p.name || p.price);
  const prodCount = Math.max(validProducts.length, 1);
  const baseCells = Math.floor(totalCells / prodCount);
  const extra = totalCells - baseCells * prodCount;
  // 앞쪽 상품일수록 1칸씩 더 (baseCells+1), 나머지는 baseCells
  const productIndexForCell: number[] = [];
  for (let pi = 0; pi < prodCount; pi++) {
    const cnt = baseCells + (pi < extra ? 1 : 0);
    for (let c = 0; c < cnt; c++) productIndexForCell.push(pi);
  }

  // 문구만 있고 상품/사진 없으면: 컬러 배경은 유지 + 배지 흰 박스 없이 텍스트만
  const textOnlyMode = hasBadge && validProducts.length === 0 && !hasPhotos;

  for (let i = 0; i < cols * rows; i++) {
    const pIdx = productIndexForCell[i] ?? 0;
    const p = validProducts.length > 0 ? validProducts[pIdx] : { name: '', price: null };
    const photo = productImages && productImages[pIdx];
    const col = i % cols, row = Math.floor(i / cols);
    const x = col * cellW, y = row * cellH;
    const pad = 3;

    // 카드 배경 (textOnlyMode도 컬러 배경 유지)
    let cardBg: string;
    if (bgColor) { cardBg = bgColor; }
    else if (hasBadge) { cardBg = i % 2 === 0 ? bc.bg : bc.bgAlt; }
    else { cardBg = i % 2 === 0 ? '#1E293B' : '#0F172A'; }
    ctx.fillStyle = cardBg;
    ctx.fillRect(x + pad, y + pad, cellW - pad * 2, cellH - pad * 2);
    const tc = textColor(cardBg), pc = priceColor(cardBg);

    const hasName = !!p.name, hasPrice = !!(p.price && p.price > 0);

    // 텍스트 전용 모드: 흰 박스 없이 텍스트만 크게
    if (textOnlyMode) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = isLight(cardBg) ? '#1F2937' : '#FFFFFF';
      const lines = badgeType!.split('\n').filter(l => l.trim());
      const lineCount = Math.max(lines.length, 1);
      const baseFs = lineCount === 1 ? cellH * 0.55 : lineCount === 2 ? cellH * 0.35 : cellH * 0.24;
      let fs = baseFs;
      ctx.font = 'bold ' + Math.round(fs) + 'px ' + FB;
      const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '');
      while (ctx.measureText(longestLine).width > (cellW - pad * 2) * 0.85 && fs > 16) {
        fs -= 2; ctx.font = 'bold ' + Math.round(fs) + 'px ' + FB;
      }
      const lineH = fs * 1.2;
      const startY = y + cellH / 2 - (lineCount * lineH) / 2 + lineH / 2;
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li], x + cellW / 2, startY + li * lineH);
      }
      continue;
    }

    // 배지: 카드 배경색을 글자색으로 가져감
    const badgeBg = isLight(cardBg) ? '#1F2937' : '#FFFFFF';
    const badgeTc = cardBg;

    // ─── 사진 있는 경우: 상단 사진 + 하단 텍스트 ───
    if (photo) {
      const photoMargin = 6;
      const hasAnyText = hasBadge || hasName || hasPrice;
      const photoAreaH = hasAnyText ? cellH * 0.58 : cellH - pad * 2;
      const pX = x + pad + photoMargin, pY = y + pad + photoMargin;
      const pW = cellW - pad * 2 - photoMargin * 2, pH = photoAreaH - photoMargin * 2;
      await drawProductPhoto(ctx, photo, pX, pY, pW, pH);

      const textPad = 8;
      const tY = y + photoAreaH;
      const tH = cellH - photoAreaH - pad;
      const cx = x + cellW / 2;

      // 사진 아래 텍스트 영역에 편의점 POP 스타일 배치
      drawProductBlock(ctx, {
        x: x + pad, y: tY, w: cellW - pad * 2, h: tH - pad,
        badge: badgeType, name: p.name, price: p.price, originalPrice: p.originalPrice,
        bg: cardBg, badgeBg, badgeTc,
      });
      continue;
    }

    const cardCx = x + cellW / 2;

    // 사진 없을 때 — 셀 전체에 편의점 POP 스타일 배치
    drawProductBlock(ctx, {
      x: x + pad, y: y + pad, w: cellW - pad * 2, h: cellH - pad * 2,
      badge: badgeType, name: p.name, price: p.price, originalPrice: p.originalPrice,
      bg: cardBg, badgeBg, badgeTc,
    });
  }
  // 절취선
  ctx.setLineDash([8, 4]); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
  for (let c = 1; c < cols; c++) { ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, H); ctx.stroke(); }
  for (let r = 1; r < rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(W, r * cellH); ctx.stroke(); }
  return canvasToDataUrl(canvas);
}

// ════════════════════════════════════════
// 띠지 — 색깔 꽉 찬 가로 배너
// ════════════════════════════════════════
export async function renderBannerSheet(
  products: ProductInfo[],
  catchphrase: string,
  badgeType?: string,
  isLandscape?: boolean,
  bgColor?: string,
  productImages?: (string | null | undefined)[],
): Promise<string> {
  // 가로 모드: A4를 가로로 놓고 가로 띠 3줄 (회전 없이 그대로 인쇄)
  const W = isLandscape ? A4H : A4W, H = isLandscape ? A4W : A4H;
  const rows = isLandscape ? 3 : 4;
  const stripH = Math.floor(H / rows);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as Ctx;
  const hasBadge = badgeType && badgeType !== '없음';
  const bc = getBadgeColors(badgeType || '');

  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);

  // 그룹핑: 띠지는 한 줄 = 한 상품
  const validProductsB = products.filter(p => p.name || p.price);
  const bCount = Math.max(validProductsB.length, 1);
  const baseRows = Math.floor(rows / bCount);
  const extraRows = rows - baseRows * bCount;
  const prodIdxForRow: number[] = [];
  for (let pi = 0; pi < bCount; pi++) {
    const cnt = baseRows + (pi < extraRows ? 1 : 0);
    for (let c = 0; c < cnt; c++) prodIdxForRow.push(pi);
  }

  // 문구만 + 상품/사진 없으면: 컬러 배경 유지 + 배지 흰 박스 없이 텍스트만
  const bTextOnlyMode = hasBadge && validProductsB.length === 0 && !(productImages && productImages.some(p => p));

  for (let r = 0; r < rows; r++) {
    const pIdx = prodIdxForRow[r] ?? 0;
    const p = validProductsB.length > 0 ? validProductsB[pIdx] : { name: '', price: null };
    const photo = productImages && productImages[pIdx];
    const y = r * stripH;

    let stripBg: string;
    if (bgColor) { stripBg = bgColor; }
    else if (hasBadge) { stripBg = r % 2 === 0 ? bc.bg : bc.bgAlt; }
    else { stripBg = r % 2 === 0 ? '#1E293B' : '#334155'; }
    ctx.fillStyle = stripBg;
    ctx.fillRect(0, y, W, stripH - 1);
    const stc = textColor(stripBg), spc = priceColor(stripBg);

    const hasName = !!p.name, hasPrice = !!(p.price && p.price > 0);

    // 텍스트 전용 모드: 흰 박스 없이 텍스트만 크게
    if (bTextOnlyMode) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = isLight(stripBg) ? '#1F2937' : '#FFFFFF';
      const lines = badgeType!.split('\n').filter(l => l.trim());
      const lineCount = Math.max(lines.length, 1);
      const baseFs = lineCount === 1 ? stripH * 0.65 : lineCount === 2 ? stripH * 0.42 : stripH * 0.3;
      let fs = baseFs;
      ctx.font = 'bold ' + Math.round(fs) + 'px ' + FB;
      const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '');
      while (ctx.measureText(longestLine).width > W * 0.85 && fs > 16) {
        fs -= 2; ctx.font = 'bold ' + Math.round(fs) + 'px ' + FB;
      }
      const lineH = fs * 1.2;
      const startY = y + stripH / 2 - (lineCount * lineH) / 2 + lineH / 2;
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li], W / 2, startY + li * lineH);
      }
      continue;
    }

    // ─── 사진 있는 경우: 좌측 사진 + 우측 텍스트 ───
    if (photo) {
      const hasAnyText = hasBadge || hasName || hasPrice;
      const photoMargin = 10;
      const photoW = hasAnyText ? stripH * 0.85 : stripH;
      const photoH = stripH - photoMargin * 2;
      const pX = hasAnyText ? photoMargin : (W - photoW) / 2, pY = y + photoMargin;
      await drawProductPhoto(ctx, photo, pX + 4, pY + 4, photoW - 8, photoH - 8);

      const tX = pX + photoW + 15;
      const tW = W - tX - 15;
      const tCx = tX + tW / 2;
      const badgeBgP = isLight(stripBg) ? '#1F2937' : '#FFFFFF';
      const badgeTcP = stripBg;
      const bw = tW * 0.3, bh = stripH * 0.17;

      // 배지를 인라인으로 그리는 헬퍼 (배지 옆에 텍스트 넣을 때 사용)
      const drawInlineBadge = (by: number) => {
        const ibw = bw + 4, ibh = bh + 2;
        drawBadge(ctx, badgeType!, tX, by - ibh / 2, ibw, ibh, badgeBgP, badgeTcP);
        return tX + ibw + 10; // 배지 뒤 텍스트 시작 X
      };
      // 띠지 사진 있을 때 — 우측 영역에 POP 스타일 배치
      drawProductBlock(ctx, {
        x: tX, y: y, w: tW, h: stripH,
        badge: badgeType, name: p.name, price: p.price, originalPrice: p.originalPrice,
        bg: stripBg, badgeBg: badgeBgP, badgeTc: badgeTcP,
      });
      continue;

    }
    // 띠지 사진 없을 때 — 전체 너비에 POP 스타일 배치
    const badgeBg2 = isLight(stripBg) ? '#1F2937' : '#FFFFFF';
    const badgeTc2 = stripBg;
    drawProductBlock(ctx, {
      x: 0, y: y, w: W, h: stripH,
      badge: badgeType, name: p.name, price: p.price, originalPrice: p.originalPrice,
      bg: stripBg, badgeBg: badgeBg2, badgeTc: badgeTc2,
    });
  }


  // 절취선 (흰색)
  ctx.setLineDash([6, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
  for (let r = 1; r < rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * stripH); ctx.lineTo(W, r * stripH); ctx.stroke(); }
  return canvasToDataUrl(canvas);
}
