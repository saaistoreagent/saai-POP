/**
 * Gemini 이미지 위에 한글 텍스트 직접 오버레이
 * 그라데이션 바 없이 — 텍스트 외곽선+그림자로 가독성 확보
 * 배경과 어우러지도록
 */
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';

// 폰트 등록
const fontDirAlt = '/Users/hyeon/Desktop/pop/public/fonts';
function tryRegister(name: string, file: string) {
  try {
    const p = path.join(fontDirAlt, file);
    if (require('fs').existsSync(p)) {
      GlobalFonts.registerFromPath(p, name);
    }
  } catch {}
}
tryRegister('DoHyeon', 'DoHyeon.ttf');
tryRegister('Jua', 'Jua.ttf');
try { GlobalFonts.registerFromPath('/System/Library/Fonts/AppleSDGothicNeo.ttc', 'AppleSD'); } catch {}

const FONTS = {
  catch: 'DoHyeon, AppleSD, sans-serif',
  price: 'Jua, AppleSD, sans-serif',
  sub: 'Jua, AppleSD, sans-serif',
  badge: 'DoHyeon, AppleSD, sans-serif',
};

interface ProductOverlay {
  name: string;
  originalPrice?: number;
  price?: number;
}

interface OverlayOptions {
  imageBase64: string;
  catchphrase: string;
  subCopy: string;
  productName: string;
  price?: number;
  badgeType?: string;
  eventPeriod?: string;
  accentColor?: string;
  useOriginalSize?: boolean;
  /** 다중 상품 — 있으면 고정 위치에 각각 배치 */
  products?: ProductOverlay[];
  /** 유저 선택 방향 — Gemini 결과 비율과 무관하게 강제 */
  orientation?: '세로' | '가로';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = any;

/** 텍스트를 두꺼운 외곽선 + 강한 그림자로 그림 (그라데이션 바 없이도 읽힘) */
function popText(
  ctx: Ctx, text: string, x: number, y: number,
  fill: string, outlineW: number, fontSize: number,
) {
  ctx.save();
  // 다중 그림자로 입체감
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = fontSize * 0.3;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;
  // 외곽선
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = outlineW;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  // 그림자 리셋 후 채우기
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = fontSize * 0.15;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function wrapText(ctx: Ctx, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; }
    else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function overlayTextOnImage(options: OverlayOptions): Promise<string> {
  const { imageBase64, catchphrase, subCopy, productName, price, badgeType, eventPeriod, accentColor } = options;

  const img = await loadImage(imageBase64);

  // 카드용이면 원본 크기, 포스터면 A4 (유저 선택 방향 강제)
  let W: number, H: number;
  if (options.useOriginalSize) {
    W = img.width; H = img.height;
  } else if (options.orientation === '가로') {
    W = 1123; H = 794;
  } else if (options.orientation === '세로') {
    W = 794; H = 1123;
  } else if (img.width > img.height) {
    W = 1123; H = 794; // fallback: 이미지 비율 따름
  } else {
    W = 794; H = 1123;
  }
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as Ctx;

  // Gemini 이미지를 캔버스에 cover-fit (비율 유지하며 꽉 채우기, 넘치는 부분은 잘림)
  const imgRatio = img.width / img.height;
  const canvasRatio = W / H;
  let drawW: number, drawH: number, drawX: number, drawY: number;
  if (imgRatio > canvasRatio) {
    // 이미지가 캔버스보다 가로로 길다 → 높이를 맞추고 좌우 잘림
    drawH = H;
    drawW = H * imgRatio;
    drawX = (W - drawW) / 2;
    drawY = 0;
  } else {
    // 이미지가 캔버스보다 세로로 길다 → 너비를 맞추고 상하 잘림
    drawW = W;
    drawH = W / imgRatio;
    drawX = 0;
    drawY = (H - drawH) / 2;
  }
  // 빈 영역 방지를 위해 배경 깔기
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  const accent = accentColor || '#FF6B00';
  const prods = options.products || [];

  // ═══ 다중 상품 모드 — 한 장면 합성 + 상단 헤더/하단 가격 스트립 ═══
  if (prods.length >= 2) {
    // ─── 상단 헤더 영역 (어두운 그라데이션) ───
    const headerH = H * 0.18;
    const headerGrad = ctx.createLinearGradient(0, 0, 0, headerH);
    headerGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
    headerGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, W, headerH);

    // 캐치프레이즈
    if (catchphrase) {
      ctx.textAlign = 'center';
      let cs = Math.round(W * 0.075);
      ctx.font = `900 ${cs}px ${FONTS.catch}`;
      while (ctx.measureText(catchphrase).width > W * 0.9 && cs > 18) { cs -= 2; ctx.font = `900 ${cs}px ${FONTS.catch}`; }
      popText(ctx, catchphrase, W / 2, cs * 1.2, '#FFFFFF', cs * 0.12, cs);
    }

    // 배지 (캐치프레이즈 아래, 노란색 강조)
    if (badgeType && badgeType !== '없음') {
      let bs = Math.round(W * 0.06);
      ctx.font = `900 ${bs}px ${FONTS.badge}`;
      while (ctx.measureText(badgeType).width > W * 0.45 && bs > 14) { bs -= 2; ctx.font = `900 ${bs}px ${FONTS.badge}`; }
      ctx.textAlign = 'center';
      // 노란색 알약 배경
      const bw = ctx.measureText(badgeType).width + bs * 1.2;
      const bh = bs * 1.6;
      const bx = W / 2 - bw / 2;
      const by = (catchphrase ? Math.round(W * 0.075) * 1.2 + 8 : 16);
      ctx.save();
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      // 둥근 사각형
      const r = bh / 2;
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + bw - r, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + r, r);
      ctx.lineTo(bx + bw, by + bh - r);
      ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
      ctx.lineTo(bx + r, by + bh);
      ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
      ctx.lineTo(bx, by + r);
      ctx.arcTo(bx, by, bx + r, by, r);
      ctx.closePath();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#1F2937';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeType, W / 2, by + bh / 2 + bs * 0.05);
      ctx.textBaseline = 'alphabetic';
    }

    // ─── 하단 가격 스트립 ───
    const allSamePrice = prods.every(p => p.price && p.price === prods[0].price);
    const stripH = H * 0.22;
    const stripY = H - stripH;

    // 어두운 반투명 + 그라데이션
    const footerGrad = ctx.createLinearGradient(0, stripY, 0, H);
    footerGrad.addColorStop(0, 'rgba(0,0,0,0)');
    footerGrad.addColorStop(0.3, 'rgba(0,0,0,0.7)');
    footerGrad.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = footerGrad;
    ctx.fillRect(0, stripY, W, stripH);

    if (allSamePrice && prods[0].price) {
      // 가격 통일 → 큰 가격 한 줄
      const p = prods[0];
      const labelText = `${prods.length}개 골라담기`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const labelSize = Math.round(W * 0.04);
      ctx.font = `700 ${labelSize}px ${FONTS.sub}`;
      popText(ctx, labelText, W / 2, stripY + stripH * 0.35, 'rgba(255,255,255,0.9)', labelSize * 0.08, labelSize);

      // 정상가 취소선 (있으면)
      if (p.originalPrice && p.price && p.originalPrice > p.price) {
        const opSize = Math.round(W * 0.045);
        ctx.font = `700 ${opSize}px ${FONTS.price}`;
        const opStr = p.originalPrice.toLocaleString('ko-KR') + '원';
        const opX = W / 2;
        const opY = stripY + stripH * 0.55;
        popText(ctx, opStr, opX, opY, 'rgba(255,255,255,0.6)', opSize * 0.08, opSize);
        const opW = ctx.measureText(opStr).width;
        ctx.strokeStyle = '#FF6060'; ctx.lineWidth = 3; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(opX - opW / 2 - 4, opY - opSize * 0.3); ctx.lineTo(opX + opW / 2 + 4, opY - opSize * 0.3); ctx.stroke();
      }

      const priceSize = Math.round(W * 0.13);
      ctx.font = `900 ${priceSize}px ${FONTS.price}`;
      popText(ctx, p.price!.toLocaleString('ko-KR') + '원', W / 2, stripY + stripH * 0.92, '#FFD700', priceSize * 0.1, priceSize);
    } else {
      // 가격 다름 → 각 상품을 가로 행으로 나열
      const cols = prods.length;
      const colW = W / cols;
      const lineY1 = stripY + stripH * 0.4;
      const lineY2 = stripY + stripH * 0.78;
      let nameSize = Math.round(W * 0.028);
      let priceSize = Math.round(W * 0.05);

      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      for (let i = 0; i < prods.length; i++) {
        const p = prods[i];
        const cx = colW * (i + 0.5);
        // 상품명
        if (p.name) {
          let ns = nameSize;
          ctx.font = `700 ${ns}px ${FONTS.catch}`;
          while (ctx.measureText(p.name).width > colW * 0.9 && ns > 11) { ns -= 1; ctx.font = `700 ${ns}px ${FONTS.catch}`; }
          popText(ctx, p.name, cx, lineY1, '#FFFFFF', ns * 0.08, ns);
        }
        // 가격
        if (p.price) {
          let ps = priceSize;
          const priceStr = p.price.toLocaleString('ko-KR') + '원';
          ctx.font = `900 ${ps}px ${FONTS.price}`;
          while (ctx.measureText(priceStr).width > colW * 0.9 && ps > 14) { ps -= 1; ctx.font = `900 ${ps}px ${FONTS.price}`; }
          popText(ctx, priceStr, cx, lineY2, '#FFD700', ps * 0.1, ps);
        }
      }
    }

    return `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`;
  }

  // ═══ 단일 상품 모드 ═══

  // ═══ 캐치프레이즈 (상단 중앙, 크게) ═══
  if (catchphrase) {
    ctx.textAlign = 'center';
    let catchSize = Math.round(W * 0.09);
    ctx.font = `900 ${catchSize}px ${FONTS.catch}`;
    // 글자수에 맞게 자동 크기 조절
    while (ctx.measureText(catchphrase).width > W * 0.9 && catchSize > 20) {
      catchSize -= 2;
      ctx.font = `900 ${catchSize}px ${FONTS.catch}`;
    }
    const lines = wrapText(ctx, catchphrase, W * 0.85);
    let y = catchSize * 1.4;
    for (const line of lines) {
      popText(ctx, line, W / 2, y, '#FFFFFF', catchSize * 0.15, catchSize);
      y += catchSize * 1.2;
    }
  }

  // ═══ 배지 (배경 없이 텍스트만 크게) ═══
  if (badgeType && badgeType !== '없음') {
    let badgeSize = Math.round(W * 0.12);
    ctx.font = `900 ${badgeSize}px ${FONTS.badge}`;
    while (ctx.measureText(badgeType).width > W * 0.4 && badgeSize > 20) {
      badgeSize -= 2;
      ctx.font = `900 ${badgeSize}px ${FONTS.badge}`;
    }
    const bY = catchphrase ? H * 0.18 : H * 0.08;
    ctx.textAlign = 'center';
    popText(ctx, badgeType, W / 2, bY, '#FFD700', badgeSize * 0.15, badgeSize);
  }

  // ═══ 상품명 (하단 좌측) ═══
  ctx.textAlign = 'left';
  const nameSize = Math.round(W * 0.05);
  ctx.font = `900 ${nameSize}px ${FONTS.catch}`;
  popText(ctx, productName, W * 0.05, H * 0.84, '#FFFFFF', nameSize * 0.12, nameSize);

  // ═══ subCopy (비어있으면 스킵) ═══
  if (subCopy) {
    const subSize = Math.round(W * 0.028);
    ctx.font = `700 ${subSize}px ${FONTS.sub}`;
    popText(ctx, subCopy, W * 0.05, H * 0.89, '#FFE066', subSize * 0.1, subSize);
  }

  // ═══ 정상가 (취소선) + 판매가 ═══
  if (price && price > 0) {
    // 정상가 (있으면 취소선)
    const op = prods.length > 0 ? prods[0]?.originalPrice : undefined;
    if (op && op > price) {
      ctx.textAlign = 'right';
      const opSize = Math.round(W * 0.04);
      ctx.font = `700 ${opSize}px ${FONTS.price}`;
      const opStr = op.toLocaleString('ko-KR') + '원';
      const opX = W * 0.93, opY = H * 0.88;
      popText(ctx, opStr, opX, opY, 'rgba(255,255,255,0.5)', opSize * 0.08, opSize);
      // 취소선
      const opW = ctx.measureText(opStr).width;
      ctx.strokeStyle = 'rgba(255,100,100,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(opX - opW - 5, opY); ctx.lineTo(opX + 5, opY); ctx.stroke();
    }
    // 판매가
    ctx.textAlign = 'right';
    const priceStr = price.toLocaleString('ko-KR');
    const priceSize = Math.round(W * 0.13);
    ctx.font = `900 ${priceSize}px ${FONTS.price}`;
    popText(ctx, priceStr, W * 0.86, H * 0.94, '#FFD700', priceSize * 0.12, priceSize);
    const wonSize = Math.round(W * 0.05);
    ctx.font = `900 ${wonSize}px ${FONTS.price}`;
    popText(ctx, '원', W * 0.93, H * 0.94, '#FFD700', wonSize * 0.12, wonSize);
  }

  // ═══ 행사 기간 ═══
  if (eventPeriod) {
    ctx.textAlign = 'center';
    const epSize = Math.round(W * 0.022);
    ctx.font = `700 ${epSize}px ${FONTS.sub}`;
    popText(ctx, eventPeriod, W / 2, H * 0.98, 'rgba(255,255,255,0.8)', epSize * 0.08, epSize);
  }

  return `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`;
}
