import { removeBackground } from '@imgly/background-removal-node';

const cache = new Map<string, Buffer>();

/** 서버 사이드 배경 제거 — 결과를 메모리 캐시 */
export async function removeBgServer(imageBuffer: Buffer): Promise<Buffer> {
  // 간단한 해시로 캐시 키 생성
  const key = imageBuffer.length + '-' + imageBuffer[0] + '-' + imageBuffer[imageBuffer.length - 1];
  if (cache.has(key)) return cache.get(key)!;

  const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
  const result = await removeBackground(blob, {
    output: { format: 'image/png', quality: 0.9 },
  });

  const arrayBuffer = await result.arrayBuffer();
  const resultBuffer = Buffer.from(arrayBuffer);

  // 캐시 (최대 50개)
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, resultBuffer);
  return resultBuffer;
}
