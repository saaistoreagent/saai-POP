'use client';

interface Props {
  reasons: string[];
}

export default function ReasonsList({ reasons }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-grey-200 p-5">
      <h3 className="text-sm font-bold text-grey-700 mb-3">AI 분석 근거</h3>
      <ul className="flex flex-col gap-2.5">
        {reasons.map((reason, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-primary-200 flex items-center justify-center flex-shrink-0 text-primary-500 text-xs font-bold">
              {i + 1}
            </span>
            <span className="text-sm text-grey-600 leading-relaxed">{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
