import { removeBackground } from '@imgly/background-removal';

self.onmessage = async (e: MessageEvent) => {
  try {
    const { imageData, fileName, fileType } = e.data;
    const file = new File([imageData], fileName, { type: fileType });
    const blob = await removeBackground(file, {
      output: { format: 'image/png', quality: 0.9 },
    });
    // Blob → base64 data URL
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:image/png;base64,${base64}`;
    self.postMessage({ url: dataUrl });
  } catch (err) {
    self.postMessage({ error: (err as Error).message || '배경 제거 실패' });
  }
};
