'use client';

import { useState, useEffect, useRef } from 'react';
import { searchAddress, AddressResult, UserCoords } from '@/lib/trend/kakao-geocode';

interface Props {
  onSelect: (result: AddressResult) => void;
  onSkip: () => void;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function AddressInput({ onSelect, onSkip }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AddressResult | null>(null);
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const debounced = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!debounced || selected) return;
    setLoading(true);
    setError(null);
    searchAddress(debounced, coords ?? undefined)
      .then((r) => {
        setResults(r);
        if (r.length === 0) setError('검색 결과가 없어요. 다른 키워드를 시도해보세요.');
      })
      .catch(() => setError('주소 검색을 사용할 수 없어요. 잠시 후 다시 시도해주세요.'))
      .finally(() => setLoading(false));
  }, [debounced, coords]);

  const handleSelect = (r: AddressResult) => {
    setSelected(r);
    setQuery(r.address);
    setResults([]);
    onSelect(r);
  };

  const handleChange = (v: string) => {
    setQuery(v);
    setSelected(null);
    setError(null);
  };

  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lng: pos.coords.longitude, lat: pos.coords.latitude });
        setLocLoading(false);
        inputRef.current?.focus();
      },
      () => {
        // 권한 거부·실패 시 조용히 기존 동작 유지
        setLocLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="예: 역삼 GS25, 홍대 CU, 강남역 세븐일레븐"
            className="w-full px-4 py-3.5 rounded-xl border-2 border-grey-200 text-sm focus:outline-none focus:border-primary-400 bg-white"
            autoFocus
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-grey-400">
              검색 중...
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locLoading}
          className={`flex items-center gap-1 px-3 py-3.5 rounded-xl border-2 text-xs font-semibold whitespace-nowrap transition-all ${
            coords
              ? 'border-primary-400 bg-primary-100 text-primary-700'
              : 'border-grey-200 bg-white text-grey-600 hover:border-primary-200'
          } disabled:opacity-50`}
        >
          📍 {locLoading ? '위치 찾는 중' : coords ? '내 위치 적용됨' : '내 위치'}
        </button>
      </div>

      {coords && (
        <p className="text-xs text-primary-500 font-medium px-1">
          내 위치 근처 결과를 먼저 보여드려요
        </p>
      )}

      {/* 에러 */}
      {error && !selected && (
        <p className="text-xs text-danger-500 px-1">{error}</p>
      )}

      {/* 검색 결과 */}
      {results.length > 0 && !selected && (
        <div className="flex flex-col gap-1.5">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="flex flex-col items-start px-4 py-3 rounded-xl border border-grey-200 bg-white hover:border-primary-200 hover:bg-primary-100 text-left transition-all"
            >
              <div className="flex items-center gap-2 w-full">
                {r.placeName && (
                  <span className="text-sm text-grey-800 font-semibold">{r.placeName}</span>
                )}
                {r.distanceMeters !== undefined && (
                  <span className="ml-auto text-xs text-primary-500 font-medium whitespace-nowrap">
                    📍 {formatDistance(r.distanceMeters)}
                  </span>
                )}
              </div>
              <span className={`text-xs ${r.placeName ? 'text-grey-400 mt-0.5' : 'text-sm text-grey-800 font-medium'}`}>
                {r.address}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 선택 완료 */}
      {selected && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary-100 border-2 border-primary-300">
          <span className="text-primary-500 font-bold">✓</span>
          <span className="text-sm text-primary-800 font-medium">{selected.address}</span>
        </div>
      )}

      <button
        onClick={onSkip}
        className="text-xs text-grey-400 underline underline-offset-2 text-center mt-1"
      >
        주소 모르겠어요 (상권 분석 제외)
      </button>
    </div>
  );
}
