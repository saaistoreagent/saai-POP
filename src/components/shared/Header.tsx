'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600 font-display">POP</span>
            <span className="text-sm text-gray-500">편의점 POP 자동 생성기</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              홈
            </Link>
            <Link href="/history" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              저장된 디자인
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
