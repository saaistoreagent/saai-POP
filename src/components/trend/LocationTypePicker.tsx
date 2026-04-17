'use client';

import { LocationType } from '@/lib/trend/types';

type GroupKey = 'residential' | 'school';

type MainItem =
  | { kind: 'single'; value: LocationType; emoji: string; label: string; desc: string }
  | { kind: 'group'; key: GroupKey; emoji: string; label: string; desc: string };

const MAIN: MainItem[] = [
  { kind: 'single', value: '오피스가', emoji: '🏢', label: '오피스가', desc: '직장인 유동인구' },
  { kind: 'group', key: 'residential', emoji: '🏘️', label: '주택가', desc: '주거 밀집 지역' },
  { kind: 'group', key: 'school', emoji: '🎓', label: '학교앞', desc: '초중고·대학 주변' },
  { kind: 'single', value: '역세권', emoji: '🚇', label: '역세권', desc: '지하철·버스 환승' },
  { kind: 'single', value: '교외 상권', emoji: '🌲', label: '교외 상권', desc: '차량·가족 나들이 고객' },
  { kind: 'single', value: '유흥가', emoji: '🍻', label: '유흥가', desc: '음식점·술집 밀집' },
  { kind: 'single', value: '관광지', emoji: '📸', label: '관광지', desc: '관광·쇼핑 명소' },
  { kind: 'single', value: '병원/관공서', emoji: '🏥', label: '병원/관공서', desc: '병원·관공서 인근' },
];

const RESIDENTIAL_SUBS: { value: LocationType; label: string; desc: string }[] = [
  { value: '주택가-가족',     label: '가족 주거',          desc: '자녀·학원 동반 가족 단위' },
  { value: '주택가-고급',     label: '고급 주상복합',       desc: '타워팰리스·반포·잠실 등 프리미엄' },
  { value: '주택가-신축',     label: '신축 신도시',         desc: '갈매·세종·동탄 등 이벤트 수용성' },
  { value: '주택가-1인가구',  label: '원룸·오피스텔 밀집',    desc: '담배·맥주·라면 회전 중심' },
];

const SCHOOL_SUBS: { value: LocationType; label: string; desc: string }[] = [
  { value: '학교앞-초중고', label: '초중고·학원가', desc: '학생 용돈·간식·에너지음료' },
  { value: '학교앞-대학가', label: '대학가',         desc: '대학생·자취생·모임 수요' },
];

const RESIDENTIAL_VALUES: LocationType[] = RESIDENTIAL_SUBS.map((s) => s.value);
const SCHOOL_VALUES: LocationType[] = SCHOOL_SUBS.map((s) => s.value);

const GROUP_META: Record<GroupKey, {
  subs: { value: LocationType; label: string; desc: string }[];
  values: LocationType[];
  defaultSub: LocationType;
  hint: string;
}> = {
  residential: {
    subs: RESIDENTIAL_SUBS,
    values: RESIDENTIAL_VALUES,
    defaultSub: '주택가-가족',
    hint: '세부 유형 선택',
  },
  school: {
    subs: SCHOOL_SUBS,
    values: SCHOOL_VALUES,
    defaultSub: '학교앞-초중고',
    hint: '세부 유형 선택',
  },
};

interface Props {
  value: LocationType[];
  onChange: (v: LocationType[]) => void;
}

export default function LocationTypePicker({ value, onChange }: Props) {
  const toggleSingle = (type: LocationType) => {
    if (value.includes(type)) {
      onChange(value.filter((t) => t !== type));
    } else {
      onChange([...value, type]);
    }
  };

  const toggleGroup = (key: GroupKey) => {
    const { values, defaultSub } = GROUP_META[key];
    const hasAny = value.some((v) => values.includes(v));
    if (hasAny) {
      onChange(value.filter((v) => !values.includes(v)));
    } else {
      onChange([...value, defaultSub]);
    }
  };

  const selectSub = (key: GroupKey, sub: LocationType) => {
    const { values } = GROUP_META[key];
    const rest = value.filter((v) => !values.includes(v));
    onChange([...rest, sub]);
  };

  const groupSelected = (key: GroupKey) =>
    value.some((v) => GROUP_META[key].values.includes(v));
  const getSelectedSub = (key: GroupKey) =>
    value.find((v) => GROUP_META[key].values.includes(v));

  return (
    <div className="flex flex-col gap-2.5">
      {MAIN.map((item) => {
        if (item.kind === 'group') {
          const selected = groupSelected(item.key);
          const selectedSub = getSelectedSub(item.key);
          const { subs, hint } = GROUP_META[item.key];
          return (
            <div key={item.key} className="flex flex-col gap-2">
              <button
                onClick={() => toggleGroup(item.key)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                  ${selected
                    ? 'border-primary-400 bg-primary-100 shadow-sm'
                    : 'border-grey-200 bg-white hover:border-grey-300 hover:bg-bg-primary'
                  }
                `}
              >
                <span className="text-xl w-7 text-center">{item.emoji}</span>
                <div className="flex-1">
                  <span className={`font-semibold text-sm ${selected ? 'text-primary-700' : 'text-grey-700'}`}>
                    {item.label}
                  </span>
                  <span className="ml-2 text-xs text-grey-400">{item.desc}</span>
                </div>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  selected ? 'border-primary-500 bg-primary-500' : 'border-grey-300 bg-white'
                }`}>
                  {selected && <span className="text-white text-xs font-bold">✓</span>}
                </div>
              </button>
              {selected && (
                <div className="ml-10 flex flex-col gap-1.5 border-l-2 border-primary-200 pl-4 py-1">
                  <p className="text-xs text-primary-500 font-medium">{hint}</p>
                  {subs.map((sub) => {
                    const subSelected = selectedSub === sub.value;
                    return (
                      <button
                        key={sub.value}
                        onClick={() => selectSub(item.key, sub.value)}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all
                          ${subSelected
                            ? 'border-primary-400 bg-primary-50'
                            : 'border-grey-200 bg-white hover:border-grey-300'
                          }
                        `}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          subSelected ? 'border-primary-500' : 'border-grey-300'
                        }`}>
                          {subSelected && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${subSelected ? 'text-primary-700' : 'text-grey-700'}`}>
                            {sub.label}
                          </span>
                          <span className="ml-2 text-xs text-grey-400">{sub.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
        const selected = value.includes(item.value);
        return (
          <button
            key={item.value}
            onClick={() => toggleSingle(item.value)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
              ${selected
                ? 'border-primary-400 bg-primary-100 shadow-sm'
                : 'border-grey-200 bg-white hover:border-grey-300 hover:bg-bg-primary'
              }
            `}
          >
            <span className="text-xl w-7 text-center">{item.emoji}</span>
            <div className="flex-1">
              <span className={`font-semibold text-sm ${selected ? 'text-primary-700' : 'text-grey-700'}`}>
                {item.label}
              </span>
              <span className="ml-2 text-xs text-grey-400">{item.desc}</span>
            </div>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              selected ? 'border-primary-500 bg-primary-500' : 'border-grey-300 bg-white'
            }`}>
              {selected && <span className="text-white text-xs font-bold">✓</span>}
            </div>
          </button>
        );
      })}
      {value.length > 0 && (
        <p className="text-xs text-primary-500 font-medium text-center mt-1">
          {value.length}개 선택됨 · 아래 다음 버튼을 눌러주세요
        </p>
      )}
    </div>
  );
}
