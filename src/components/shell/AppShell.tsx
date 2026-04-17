'use client';
import Header from './Header';
import BottomTabBar from './BottomTabBar';

export default function AppShell({ activeTab, onTabChange, children }: {
  activeTab: 'trend' | 'pop';
  onTabChange: (tab: 'trend' | 'pop') => void;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell pb-safe">
      <Header />
      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {children}
      </main>
      <BottomTabBar activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
