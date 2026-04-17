'use client';

import { useState, lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';
import AppShell from '@/components/shell/AppShell';
const PopMakerTab = dynamic(() => import('@/components/PopMakerTab'), { ssr: false });
const TrendTabRoot = dynamic(() => import('@/components/TrendTabRoot'), { ssr: false });

export default function Home() {
  const [activeTab, setActiveTab] = useState<'trend' | 'pop'>('trend');

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'trend' && (
        <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><div className="w-6 h-6 border-2 border-grey-200 border-t-primary-500 rounded-full animate-spin" /></div>}>
          <TrendTabRoot />
        </Suspense>
      )}
      {activeTab === 'pop' && <PopMakerTab />}
    </AppShell>
  );
}
