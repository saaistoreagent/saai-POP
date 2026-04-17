'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (email: string) => void;
  loading?: boolean;
}

export default function EmailCapture({ onSubmit, loading }: Props) {
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    if (!agreed) {
      setError('개인정보 수집·이용에 동의해주세요.');
      return;
    }
    setError('');
    onSubmit(email);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="example@email.com"
          className="w-full px-4 py-3.5 rounded-xl border-2 border-grey-200 focus:border-primary-400 focus:outline-none text-grey-800 placeholder-gray-400 text-sm transition-colors"
        />
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="sr-only peer"
        />
        <span
          aria-hidden="true"
          className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            agreed ? 'bg-primary-500 border-primary-500' : 'border-grey-300 bg-white'
          }`}
        >
          {agreed && <span className="text-white text-xs font-bold">✓</span>}
        </span>
        <span className="text-xs text-grey-500 leading-relaxed">
          결과 저장 및 뉴스레터 발송을 위해 이메일을 수집합니다.{' '}
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="text-primary-500 underline hover:text-primary-700"
          >
            개인정보처리방침
          </button>
          에 동의합니다.
        </span>
      </label>

      {error && <p className="text-xs text-danger-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`
          w-full py-4 rounded-xl font-bold text-sm text-white transition-all
          ${loading
            ? 'bg-grey-300 cursor-not-allowed'
            : 'bg-primary-500 hover:bg-primary-600 active:scale-[0.98] shadow-md shadow-indigo-200'
          }
        `}
      >
        {loading ? '결과 생성 중...' : '결과 확인하기 →'}
      </button>
    </div>
  );
}
