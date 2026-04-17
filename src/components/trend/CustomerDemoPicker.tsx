'use client';

import { CustomerProfile } from '@/lib/trend/types';

export const CUSTOMER_PRESETS: CustomerProfile[] = [
  {
    label: '2030 직장인',
    ageRange: [25, 39],
    genderSkew: 'neutral',
    lifestyleTags: ['직장인', '점심', '간편식', '건강'],
  },
  {
    label: '1020 학생',
    ageRange: [13, 22],
    genderSkew: 'neutral',
    lifestyleTags: ['학생', '간식', 'SNS인증', '달달'],
  },
  {
    label: '3040 주부/가족',
    ageRange: [30, 49],
    genderSkew: 'female',
    lifestyleTags: ['가족', '일상', '건강', '간편식'],
  },
  {
    label: '2030 MZ세대',
    ageRange: [18, 32],
    genderSkew: 'neutral',
    lifestyleTags: ['트렌디', 'SNS인증', 'MZ', '디저트러버'],
  },
  {
    label: '4050+ 중장년',
    ageRange: [40, 60],
    genderSkew: 'neutral',
    lifestyleTags: ['건강', '일상', '전통', '간편식'],
  },
];

const PRESET_EMOJIS = ['💼', '🎒', '👨‍👩‍👧', '✨', '🧓'];
const PRESET_DESCS = [
  '점심시간·퇴근길 이용',
  '방과후·등하교 이용',
  '장보기·일상 구매',
  '트렌드에 민감한 세대',
  '건강·실용 중심 구매',
];

interface Props {
  value: CustomerProfile | null;
  onChange: (v: CustomerProfile) => void;
}

export default function CustomerDemoPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      {CUSTOMER_PRESETS.map((preset, i) => {
        const isSelected = value?.label === preset.label;
        return (
          <button
            key={preset.label}
            onClick={() => onChange(preset)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
              ${isSelected
                ? 'border-success-500 bg-success-100 shadow-sm'
                : 'border-grey-200 bg-white hover:border-grey-300 hover:bg-bg-primary'
              }
            `}
          >
            <span className="text-xl w-7 text-center">{PRESET_EMOJIS[i]}</span>
            <div className="flex-1">
              <span className={`font-semibold text-sm ${isSelected ? 'text-success-600' : 'text-grey-700'}`}>
                {preset.label}
              </span>
              <span className="block text-xs text-grey-400">{PRESET_DESCS[i]}</span>
            </div>
            {isSelected && (
              <span className="text-success-500 font-bold text-sm">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
