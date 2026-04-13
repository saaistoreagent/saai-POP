import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';

const fontDirAlt = path.join(process.cwd(), 'public', 'fonts');
function tryReg(name: string, file: string) {
  try {
    const p = path.join(fontDirAlt, file);
    if (require('fs').existsSync(p)) { GlobalFonts.registerFromPath(p, name); }
  } catch {}
}
tryReg('DoHyeon', 'DoHyeon.ttf');
tryReg('Jua', 'Jua.ttf');
try { GlobalFonts.registerFromPath('/System/Library/Fonts/AppleSDGothicNeo.ttc', 'AppleSD'); } catch {}

const FONT = 'DoHyeon, Jua, AppleSD, sans-serif';

interface ComposePOPOptions {
  width: number;
  height: number;
  productName: string;
  price: number;
  catchphrase: string;
  subCopy: string;
  badgeType?: string;
  productImageUrl?: string | null;
  bgColor: string;
  accentColor: string;
}

function strokeText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  fill: string, sw: number,
) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = sw;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; }
    else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = any;

/**
 * Canvas 러프 레이아웃 — Gemini가 참고할 텍스트 배치도
 * 심플하게: 상단 캐치프레이즈, 중앙 비움(상품 자리), 하단 상품명+가격
 * 텍스트가 정확하고 중복 없이 한 번씩만.
 */
export async function composePOPImage(options: ComposePOPOptions): Promise<Buffer> {
  const { width, height, productName, price, catchphrase, subCopy, badgeType, bgColor, accentColor } = options;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d') as Ctx;
  const hasBadge = badgeType && badgeType !== '없음';

  // ── 배경: 어두운 단색 (Gemini가 교체할 영역) ──
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, width, height);

  // ── 상단 20%: 캐치프레이즈 (어두운 영역) ──
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, width, height * 0.2);

  ctx.textAlign = 'center';
  ctx.font = `900 ${Math.round(width * 0.08)}px ${FONT}`;
  const catchLines = wrapText(ctx, catchphrase, width * 0.85);
  let y = height * 0.08;
  for (const line of catchLines) {
    strokeText(ctx, line, width / 2, y, '#FFFFFF', 8);
    y += Math.round(width * 0.09);
  }

  // ── 배지 (캐치프레이즈 아래) ──
  if (hasBadge) {
    const bW = Math.round(width * 0.2);
    const bH = Math.round(height * 0.06);
    const bX = (width - bW) / 2;
    const bY = y + 5;

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(bX, bY, bW, bH, 12);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.round(bH * 0.7)}px ${FONT}`;
    strokeText(ctx, badgeType!, width / 2, bY + bH * 0.73, '#FFFFFF', 4);
  }

  // ── 중앙 50%: 비워둠 (상품 이미지 자리) ──
  // Gemini가 여기에 상품 이미지를 넣을 것

  // ── 하단 25%: 상품명 + 가격 (어두운 영역) ──
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, height * 0.75, width, height * 0.25);

  // 상품명 (좌하단)
  ctx.textAlign = 'left';
  ctx.font = `900 ${Math.round(width * 0.05)}px ${FONT}`;
  strokeText(ctx, productName, width * 0.05, height * 0.83, '#FFFFFF', 5);

  // subCopy
  ctx.font = `700 ${Math.round(width * 0.025)}px ${FONT}`;
  strokeText(ctx, subCopy, width * 0.05, height * 0.88, '#FFE066', 2);

  // 가격 (우하단, 크게)
  if (price && price > 0 && !isNaN(price)) {
    ctx.textAlign = 'right';
    const priceStr = price.toLocaleString('ko-KR');
    ctx.font = `900 ${Math.round(width * 0.14)}px ${FONT}`;
    strokeText(ctx, priceStr, width * 0.88, height * 0.93, '#FFD700', 10);
    const pw = ctx.measureText(priceStr).width;
    ctx.font = `900 ${Math.round(width * 0.05)}px ${FONT}`;
    strokeText(ctx, '원', width * 0.93, height * 0.93, '#FFD700', 5);
  }

  return canvas.toBuffer('image/png');
}
