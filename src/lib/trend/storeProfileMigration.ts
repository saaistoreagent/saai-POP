const STORE_KEY = 'storeProfile';

const VALID_LABELS = new Set([
  '오피스가',
  '주택가-가족',
  '주택가-고급',
  '주택가-신축',
  '주택가-1인가구',
  '학교앞-초중고',
  '학교앞-대학가',
  '역세권',
  '유흥가',
  '관광지',
  '병원/관공서',
  '교외 상권',
]);

export function migrateStoreProfile(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const profile = JSON.parse(raw);
    if (!profile || !Array.isArray(profile.locationType)) return;

    const original: string[] = profile.locationType;
    const migrated = original
      .map((v) => {
        if (v === '주택가') return '주택가-가족';
        if (v === '학교앞') return '학교앞-초중고';
        return v;
      })
      .filter((v) => VALID_LABELS.has(v));

    const changed =
      migrated.length !== original.length ||
      migrated.some((v, i) => v !== original[i]);

    if (changed) {
      profile.locationType = migrated;
      window.localStorage.setItem(STORE_KEY, JSON.stringify(profile));
    }
  } catch {
    // silent — corrupted profile will fail naturally at read sites
  }
}
