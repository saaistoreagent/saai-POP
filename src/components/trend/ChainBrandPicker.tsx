'use client';

import { ChainBrand } from '@/lib/trend/types';

const BRANDS: { value: ChainBrand; emoji: string; color: string }[] = [
  { value: 'CU', emoji: '🟣', color: 'border-purple-400 bg-purple-50' },
  { value: 'GS25', emoji: '🔵', color: 'border-blue-400 bg-primary-100' },
  { value: '세븐일레븐', emoji: '🟢', color: 'border-green-400 bg-success-100' },
  { value: '이마트24', emoji: '🟡', color: 'border-yellow-400 bg-yellow-50' },
  { value: '미니스톱', emoji: '🔴', color: 'border-red-400 bg-danger-100' },
  { value: '기타', emoji: '⚪', color: 'border-grey-300 bg-bg-primary' },
];

interface Props {
  value: ChainBrand | null;
  onChange: (v: ChainBrand) => void;
}

export default function ChainBrandPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {BRANDS.map((b) => (
        <button
          key={b.value}
          onClick={() => onChange(b.value)}
          className={`
            flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all
            ${value === b.value
              ? `${b.color} border-opacity-100 shadow-sm scale-[1.02]`
              : 'border-grey-200 bg-white hover:border-grey-300 hover:bg-bg-primary'
            }
          `}
        >
          <span className="text-xl">{b.emoji}</span>
          <span className={`font-semibold text-sm ${value === b.value ? 'text-grey-800' : 'text-grey-600'}`}>
            {b.value}
          </span>
          {value === b.value && (
            <span className="ml-auto text-xs font-bold text-grey-500">✓</span>
          )}
        </button>
      ))}
    </div>
  );
}
