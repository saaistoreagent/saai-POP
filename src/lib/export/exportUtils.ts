import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const toImageOptions = {
  cacheBust: true,
  pixelRatio: 2,
  skipFonts: true,
  // 외부 이미지 CORS 에러 방지: 실패하면 빈 이미지로 대체
  imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  fetchRequestInit: { mode: 'cors' as RequestMode },
};

export async function exportToPng(element: HTMLElement, filename: string) {
  try {
    const dataUrl = await toPng(element, toImageOptions);
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (e) {
    console.error('[export] PNG error:', e);
    alert('PNG 저장에 실패했습니다. 다시 시도해주세요.');
  }
}

export async function exportToPdf(element: HTMLElement, filename: string, size: 'a4' | 'a5' = 'a4') {
  try {
    const dataUrl = await toPng(element, toImageOptions);
    const sizeMm = { a4: { w: 210, h: 297 }, a5: { w: 148, h: 210 } };
    const { w, h } = sizeMm[size];
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [w, h] });
    pdf.addImage(dataUrl, 'PNG', 0, 0, w, h);
    pdf.save(filename);
  } catch (e) {
    console.error('[export] PDF error:', e);
    alert('PDF 저장에 실패했습니다. 다시 시도해주세요.');
  }
}
