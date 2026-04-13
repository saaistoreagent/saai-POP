/**
 * 배경 제거 — Web Worker에서 실행하여 메인 스레드 차단 방지
 */
export function removeBg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const worker = new Worker(
        new URL('./removeBgWorker.ts', import.meta.url)
      );
      worker.onmessage = (e) => {
        worker.terminate();
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.url);
        }
      };
      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };
      worker.postMessage({ imageData: reader.result, fileName: file.name, fileType: file.type });
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}
