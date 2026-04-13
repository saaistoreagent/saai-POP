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
    if (imgRatio > boxRatio) {
      dw = w;
      dh = w / imgRatio;
      dx = x;
      dy = y + (h - dh) / 2;
    } else {
      dh = h;
      dw = h * imgRatio;
      dx = x + (w - dw) / 2;
      dy = y;
    }
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
  return rotateIfLandscape(canvas, !!isLandscape);
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

  for (let i = 0; i < cols * rows; i++) {
    const p = products.length > 0 ? products[i % products.length] : { name: '', price: null };
    const photo = productImages && productImages[i % Math.max(productImages.length, 1)];
    const col = i % cols, row = Math.floor(i / cols);
    const x = col * cellW, y = row * cellH;
    const pad = 3;

    // 카드 배경
    let cardBg: string;
    if (bgColor) { cardBg = bgColor; }
    else if (hasBadge) { cardBg = i % 2 === 0 ? bc.bg : bc.bgAlt; }
    else { cardBg = i % 2 === 0 ? '#1E293B' : '#0F172A'; }
    ctx.fillStyle = cardBg;
    ctx.fillRect(x + pad, y + pad, cellW - pad * 2, cellH - pad * 2);
    const tc = textColor(cardBg), pc = priceColor(cardBg);

    const hasName = !!p.name, hasPrice = !!(p.price && p.price > 0);
    // 배지: 카드 배경색을 글자색으로 가져감
    const badgeBg = isLight(cardBg) ? '#1F2937' : '#FFFFFF';
    const badgeTc = cardBg;

    // ─── 사진 있는 경우: 상단 사진 + 하단 텍스트 — 전체 조합 분기 ───
    if (photo) {
      const photoMargin = 10;
      const photoAreaH = cellH * 0.48;
      const pX = x + pad + photoMargin, pY = y + pad + photoMargin;
      const pW = cellW - pad * 2 - photoMargin * 2, pH = photoAreaH - photoMargin;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(pX, pY, pW, pH);
      await drawProductPhoto(ctx, photo, pX + 4, pY + 4, pW - 8, pH - 8);

      const tY = y + photoAreaH;
      const tH = cellH - photoAreaH - pad;
      const cx = x + cellW / 2;
      const bh = cellH * 0.14;

      // 배지 그릴 때 가운데 정렬 헬퍼
      const drawCenteredBadge = (by: number) => {
        // 배지 텍스트 측정해서 너비 자동
        ctx.font = 'bold ' + Math.round(bh * 0.6) + 'px ' + FB;
        const btw = ctx.measureText(badgeType!).width + bh * 0.6;
        const bWidth = Math.max(bh * 1.5, btw);
        drawBadge(ctx, badgeType!, cx - bWidth / 2, by, bWidth, bh, badgeBg, badgeTc);
        return by + bh + 5;
      };

      if (hasBadge && hasName && hasPrice) {
        const afterBadge = drawCenteredBadge(tY + 3);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
        fitFontSize(ctx, p.name, cellW * 0.85, Math.round(cellH * 0.09), FB);
        ctx.fillText(p.name, cx, afterBadge + tH * 0.12);
        if (p.originalPrice && p.originalPrice > p.price!) drawOriginalPrice(ctx, p.originalPrice, cx, tY + tH * 0.55, Math.round(cellH * 0.07), cardBg);
        ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
        ctx.font = 'bold ' + Math.round(cellH * 0.13) + 'px ' + FP;
        ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', cx, tY + tH * 0.82);
      } else if (hasBadge && hasName) {
        drawCenteredBadge(tY + tH * 0.15);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
        fitFontSize(ctx, p.name, cellW * 0.85, Math.round(cellH * 0.13), FB);
        ctx.fillText(p.name, cx, tY + tH * 0.65);
      } else if (hasBadge && hasPrice) {
        drawCenteredBadge(tY + tH * 0.1);
        if (p.originalPrice && p.originalPrice > p.price!) drawOriginalPrice(ctx, p.originalPrice, cx, tY + tH * 0.4, Math.round(cellH * 0.07), cardBg);
        ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + Math.round(cellH * 0.17) + 'px ' + FP;
        ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', cx, tY + tH * 0.7);
      } else if (hasBadge) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
        const bf = (badgeType || '').length > 3 ? Math.round(cellH * 0.14) : Math.round(cellH * 0.18);
        ctx.font = 'bold ' + bf + 'px ' + FB;
        ctx.fillText(badgeType!, cx, tY + tH / 2);
      } else if (hasName && hasPrice) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
        fitFontSize(ctx, p.name, cellW * 0.85, Math.round(cellH * 0.1), FB);
        ctx.fillText(p.name, cx, tY + tH * 0.2);
        if (p.originalPrice && p.originalPrice > p.price!) drawOriginalPrice(ctx, p.originalPrice, cx, tY + tH * 0.45, Math.round(cellH * 0.07), cardBg);
        ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
        ctx.font = 'bold ' + Math.round(cellH * 0.15) + 'px ' + FP;
        ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', cx, tY + tH * 0.75);
      } else if (hasName) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
        fitFontSize(ctx, p.name, cellW * 0.85, Math.round(cellH * 0.14), FB);
        ctx.fillText(p.name, cx, tY + tH / 2);
      } else if (hasPrice) {
        if (p.originalPrice && p.originalPrice > p.price!) drawOriginalPrice(ctx, p.originalPrice, cx, tY + tH * 0.3, Math.round(cellH * 0.08), cardBg);
        ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + Math.round(cellH * 0.2) + 'px ' + FP;
        ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', cx, tY + tH * 0.6);
      }
      continue;
    }

    // 가운데 정렬 배지 헬퍼 (사진 없는 경우)
    const cardCx = x + cellW / 2;
    const drawCenterBadgeNP = (by: number, maxW: number) => {
      const bfs = Math.round(cellH * 0.12);
      ctx.font = 'bold ' + bfs + 'px ' + FB;
      const btw = ctx.measureText(badgeType!).width + bfs * 0.8;
      const bWidth = Math.max(cellH * 0.2, Math.min(maxW, btw));
      const bHeight = cellH * 0.14;
      drawBadge(ctx, badgeType!, cardCx - bWidth / 2, by, bWidth, bHeight, badgeBg, badgeTc);
      return by + bHeight + 8;
    };

    if (hasBadge && hasName && hasPrice) {
      const afterB = drawCenterBadgeNP(y + pad + 8, cellW * 0.5);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
      fitFontSize(ctx, p.name, cellW * 0.85, Math.round(cellH * 0.16), FB);
      ctx.fillText(p.name, cardCx, afterB + cellH * 0.08);
      if (p.originalPrice && p.originalPrice > p.price!) drawOriginalPrice(ctx, p.originalPrice, cardCx, y + cellH * 0.62, Math.round(cellH * 0.1), cardBg);
      ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(cellH * 0.22) + 'px ' + FP;
      ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', cardCx, y + cellH * 0.82);
    } else if (hasBadge && hasName) {
      drawCenterBadgeNP(y + cellH * 0.2, cellW * 0.5);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
      fitFontSize(ctx, p.name, cellW * 0.85, Math.round(cellH * 0.22), FB);
      ctx.fillText(p.name, cardCx, y + cellH * 0.6);
    } else if (hasBadge && hasPrice) {
      drawCenterBadgeNP(y + cellH * 0.15, cellW * 0.5);
      if (p.originalPrice && p.originalPrice > p.price!) drawOriginalPrice(ctx, p.originalPrice, cardCx, y + cellH * 0.45, Math.round(cellH * 0.1), cardBg);
      ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(cellH * 0.28) + 'px ' + FP;
      ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', cardCx, y + cellH * 0.7);
    } else if (hasBadge) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
      const bf = (badgeType || '').length > 3 ? Math.round(cellH * 0.3) : Math.round(cellH * 0.4);
      ctx.font = 'bold ' + bf + 'px ' + FB;
      ctx.fillText(badgeType!, cardCx, y + cellH / 2);
    } else if (hasName && hasPrice) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold ' + Math.round(cellH * 0.2) + 'px ' + FB;
      ctx.fillText(p.name, x + cellW / 2, y + cellH * 0.35, cellW * 0.85);
      if (p.originalPrice && p.originalPrice > p.price!) drawOriginalPrice(ctx, p.originalPrice, x + cellW / 2, y + cellH * 0.52, Math.round(cellH * 0.13), cardBg);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold ' + Math.round(cellH * 0.28) + 'px ' + FP;
      ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', x + cellW / 2, y + cellH * 0.73);
    } else if (hasName) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold ' + Math.round(cellH * 0.24) + 'px ' + FB;
      ctx.fillText(p.name, x + cellW / 2, y + cellH / 2, cellW * 0.85);
    } else if (hasPrice) {
      if (p.originalPrice && p.originalPrice > p.price!) drawOriginalPrice(ctx, p.originalPrice, x + cellW / 2, y + cellH * 0.32, Math.round(cellH * 0.13), cardBg);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFD700';
      ctx.font = 'bold ' + Math.round(cellH * 0.35) + 'px ' + FP;
      ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', x + cellW / 2, y + cellH * 0.55);
    }
  }
  // 절취선
  ctx.setLineDash([8, 4]); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
  for (let c = 1; c < cols; c++) { ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, H); ctx.stroke(); }
  for (let r = 1; r < rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(W, r * cellH); ctx.stroke(); }
  return rotateIfLandscape(canvas, !!isLandscape);
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
  const W = isLandscape ? A4H : A4W, H = isLandscape ? A4W : A4H;
  const rows = isLandscape ? 3 : 4;
  const stripH = Math.floor(H / rows);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as Ctx;
  const hasBadge = badgeType && badgeType !== '없음';
  const bc = getBadgeColors(badgeType || '');

  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);

  for (let r = 0; r < rows; r++) {
    const p = products.length > 0 ? products[r % products.length] : { name: '', price: null };
    const photo = productImages && productImages[r % Math.max(productImages.length, 1)];
    const y = r * stripH;

    let stripBg: string;
    if (bgColor) { stripBg = bgColor; }
    else if (hasBadge) { stripBg = r % 2 === 0 ? bc.bg : bc.bgAlt; }
    else { stripBg = r % 2 === 0 ? '#1E293B' : '#334155'; }
    ctx.fillStyle = stripBg;
    ctx.fillRect(0, y, W, stripH - 1);
    const stc = textColor(stripBg), spc = priceColor(stripBg);

    const hasName = !!p.name, hasPrice = !!(p.price && p.price > 0);

    // ─── 사진 있는 경우: 좌측 사진 + 우측 텍스트 — 전체 조합 분기 ───
    if (photo) {
      const photoMargin = 10;
      const photoW = stripH * 0.85;
      const photoH = stripH - photoMargin * 2;
      const pX = photoMargin, pY = y + photoMargin;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(pX, pY, photoW, photoH);
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

      if (hasBadge && hasName && hasPrice) {
        const hasOrigP = !!(p.originalPrice && p.originalPrice > p.price!);
        if (hasOrigP) {
          // 할인: 상단(배지+이름), 하단(가격)
          const afterBadge = drawInlineBadge(y + stripH * 0.32);
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
          fitFontSize(ctx, p.name, W - afterBadge - 20, Math.round(stripH * 0.2), FB);
          ctx.fillText(p.name, afterBadge, y + stripH * 0.32);
          drawOriginalPrice(ctx, p.originalPrice!, W - 60, y + stripH * 0.55, Math.round(stripH * 0.11), stripBg);
          ctx.textAlign = 'right'; ctx.fillStyle = '#FFD700';
          ctx.font = 'bold ' + Math.round(stripH * 0.3) + 'px ' + FP;
          ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', W - 15, y + stripH * 0.72);
        } else {
          // 할인 없음: 1줄 (배지+이름 좌, 가격 우)
          const afterBadge = drawInlineBadge(y + stripH / 2);
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
          fitFontSize(ctx, p.name, tW * 0.35, Math.round(stripH * 0.2), FB);
          ctx.fillText(p.name, afterBadge, y + stripH / 2);
          ctx.textAlign = 'right'; ctx.fillStyle = '#FFD700';
          ctx.font = 'bold ' + Math.round(stripH * 0.28) + 'px ' + FP;
          ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', W - 15, y + stripH / 2);
        }
      } else if (hasBadge && hasName) {
        // 배지 위 + 이름 아래, 둘 다 가운데
        const badgeW2 = tW * 0.4, badgeH2 = stripH * 0.22;
        drawBadge(ctx, badgeType!, tCx - badgeW2 / 2, y + stripH * 0.15, badgeW2, badgeH2, badgeBgP, badgeTcP);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
        fitFontSize(ctx, p.name, tW * 0.9, Math.round(stripH * 0.32), FB);
        ctx.fillText(p.name, tCx, y + stripH * 0.65);
      } else if (hasBadge && hasPrice) {
        // 배지 위, 가격 아래
        drawInlineBadge(y + stripH * 0.3);
        if (p.originalPrice && p.originalPrice > p.price!) drawOriginalPrice(ctx, p.originalPrice, tCx, y + stripH * 0.5, Math.round(stripH * 0.12), stripBg);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.round(stripH * 0.32) + 'px ' + FP;
        ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', tCx, y + stripH * 0.7);
      } else if (hasBadge) {
        // 배지만 — 크게 가운데
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
        const bf = (badgeType || '').length > 3 ? Math.round(stripH * 0.25) : Math.round(stripH * 0.35);
        ctx.font = 'bold ' + bf + 'px ' + FB;
        ctx.fillText(badgeType!, tCx, y + stripH / 2);
      } else if (hasName && hasPrice) {
        const hasOrigP2 = !!(p.originalPrice && p.originalPrice > p.price!);
        if (hasOrigP2) {
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
          fitFontSize(ctx, p.name, tW * 0.55, Math.round(stripH * 0.2), FB);
          ctx.fillText(p.name, tX, y + stripH * 0.35);
          drawOriginalPrice(ctx, p.originalPrice!, W - 60, y + stripH * 0.35, Math.round(stripH * 0.11), stripBg);
          ctx.textAlign = 'right'; ctx.fillStyle = '#FFD700';
          ctx.font = 'bold ' + Math.round(stripH * 0.3) + 'px ' + FP;
          ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', W - 15, y + stripH * 0.68);
        } else {
          // 할인 없음: 이름 + 가격 같은 줄
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left'; ctx.fillStyle = '#FFFFFF';
          fitFontSize(ctx, p.name, tW * 0.5, Math.round(stripH * 0.25), FB);
          ctx.fillText(p.name, tX, y + stripH / 2);
          ctx.textAlign = 'right'; ctx.fillStyle = '#FFD700';
          ctx.font = 'bold ' + Math.round(stripH * 0.3) + 'px ' + FP;
          ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', W - 15, y + stripH / 2);
        }
      } else if (hasName) {
        // 이름만 — 가운데 크게
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
        fitFontSize(ctx, p.name, tW * 0.9, Math.round(stripH * 0.4), FB);
        ctx.fillText(p.name, tCx, y + stripH / 2);
      } else if (hasPrice) {
        // 가격만 — 가운데 크게
        if (p.originalPrice && p.originalPrice > p.price!) drawOriginalPrice(ctx, p.originalPrice, tCx, y + stripH * 0.35, Math.round(stripH * 0.12), stripBg);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.round(stripH * 0.45) + 'px ' + FP;
        ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', tCx, y + stripH * 0.6);
      }
      continue;
    }

    // 배지: 띠지 배경색을 글자색으로 가져감 (배경 밝으면 어두운 패널, 어두우면 흰 패널)
    const badgeBg2 = isLight(stripBg) ? '#1F2937' : '#FFFFFF';
    const badgeTc2 = stripBg;

    if (hasBadge && hasName && hasPrice) {
      const bw = W * 0.15, bh = stripH * 0.5;
      drawBadge(ctx, badgeType!, W * 0.02, y + (stripH - bh) / 2, bw, bh, badgeBg2, badgeTc2);
      const tx = W * 0.19;
      const hasOrig = !!(p.originalPrice && p.originalPrice > p.price!);
      if (hasOrig) {
        // 할인: 배지 | 이름(상단) | 정상가 취소선 + 가격(하단)
        const ps = Math.round(stripH * 0.35);
        ctx.font = 'bold ' + ps + 'px ' + FP;
        const pw = ctx.measureText(p.price!.toLocaleString('ko-KR') + '원').width + 30;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
        fitFontSize(ctx, p.name, W - tx - pw - 20, Math.round(stripH * 0.3), FB);
        ctx.fillText(p.name, tx + (W - tx - pw - 10) / 2, y + stripH * 0.35);
        drawOriginalPrice(ctx, p.originalPrice!, W - 20 - pw / 2, y + stripH * 0.25, Math.round(stripH * 0.18), stripBg);
        ctx.textAlign = 'right'; ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + ps + 'px ' + FP;
        ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', W - 20, y + stripH * 0.68);
      } else {
        // 할인 없음: 배지 | 이름 + 가격 같은 줄
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left'; ctx.fillStyle = '#FFFFFF';
        fitFontSize(ctx, p.name, W * 0.4, Math.round(stripH * 0.32), FB);
        ctx.fillText(p.name, tx, y + stripH / 2);
        ctx.textAlign = 'right'; ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.round(stripH * 0.38) + 'px ' + FP;
        ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', W - 20, y + stripH / 2);
      }
    } else if (hasBadge && hasName) {
      const bw = W * 0.15, bh = stripH * 0.5;
      drawBadge(ctx, badgeType!, W * 0.02, y + (stripH - bh) / 2, bw, bh, badgeBg2, badgeTc2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
      const nameMaxW = W * 0.73;
      fitFontSize(ctx, p.name, nameMaxW, Math.round(stripH * 0.45), FB);
      ctx.fillText(p.name, W * 0.19 + (W * 0.78) / 2, y + stripH / 2);
    } else if (hasBadge && hasPrice) {
      const bw = W * 0.15, bh = stripH * 0.5;
      drawBadge(ctx, badgeType!, W * 0.02, y + (stripH - bh) / 2, bw, bh, badgeBg2, badgeTc2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFD700';
      ctx.font = 'bold ' + Math.round(stripH * 0.5) + 'px ' + FP;
      ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', W * 0.19 + (W * 0.78) / 2, y + stripH / 2);
    } else if (hasBadge) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
      const bf = (badgeType || '').length > 3 ? Math.round(stripH * 0.4) : Math.round(stripH * 0.55);
      ctx.font = 'bold ' + bf + 'px ' + FB;
      ctx.fillText(badgeType!, W / 2, y + stripH / 2);
    } else if (hasName && hasPrice) {
      const hasOrig = !!(p.originalPrice && p.originalPrice > p.price!);
      if (hasOrig) {
        // 할인: 2줄 — 이름 상단, 정상가 취소선 + 가격 하단
        const ps = Math.round(stripH * 0.35);
        ctx.font = 'bold ' + ps + 'px ' + FP;
        const pw = ctx.measureText(p.price!.toLocaleString('ko-KR') + '원').width + 30;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
        fitFontSize(ctx, p.name, W - pw - 30, Math.round(stripH * 0.32), FB);
        ctx.fillText(p.name, (W - pw) / 2, y + stripH * 0.35);
        drawOriginalPrice(ctx, p.originalPrice!, W - 20 - pw / 2, y + stripH * 0.25, Math.round(stripH * 0.18), stripBg);
        ctx.textAlign = 'right'; ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + ps + 'px ' + FP;
        ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', W - 20, y + stripH * 0.68);
      } else {
        // 할인 없음: 1줄 — 이름 좌측, 가격 우측, 같은 높이
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left'; ctx.fillStyle = '#FFFFFF';
        fitFontSize(ctx, p.name, W * 0.5, Math.round(stripH * 0.35), FB);
        ctx.fillText(p.name, W * 0.05, y + stripH / 2);
        ctx.textAlign = 'right'; ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.round(stripH * 0.4) + 'px ' + FP;
        ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', W - 20, y + stripH / 2);
      }
    } else if (hasName) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
      fitFontSize(ctx, p.name, W * 0.9, Math.round(stripH * 0.45), FB);
      ctx.fillText(p.name, W / 2, y + stripH / 2);
    } else if (hasPrice) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFD700';
      ctx.font = 'bold ' + Math.round(stripH * 0.55) + 'px ' + FP;
      ctx.fillText(p.price!.toLocaleString('ko-KR') + '원', W / 2, y + stripH / 2);
    }
  }

  // 절취선 (흰색)
  ctx.setLineDash([6, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
  for (let r = 1; r < rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * stripH); ctx.lineTo(W, r * stripH); ctx.stroke(); }
  return rotateIfLandscape(canvas, !!isLandscape);
}
