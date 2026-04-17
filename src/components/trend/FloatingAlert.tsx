'use client';

import { useEffect, useState } from 'react';

interface Props {
  message: string;
  icon?: string;
  durationMs?: number;
  onClose?: () => void;
}

export default function FloatingAlert({ message, icon = '✨', durationMs = 3500, onClose }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300); // 페이드아웃 애니메이션 끝난 뒤 콜백
    }, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onClose]);

  return (
    <div
      className={`
        fixed bottom-8 left-1/2 -translate-x-1/2 z-50
        max-w-md w-[calc(100%-2.5rem)] mx-auto
        bg-primary-500 text-white rounded-xl shadow-lg
        px-4 py-3 flex items-center gap-2.5
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      role="status"
      aria-live="polite"
    >
      <span className="text-base">{icon}</span>
      <p className="text-sm font-medium flex-1 leading-snug">{message}</p>
    </div>
  );
}
