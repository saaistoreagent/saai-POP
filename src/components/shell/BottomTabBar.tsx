'use client';
export default function BottomTabBar({ activeTab, onTabChange }: {
  activeTab: 'trend' | 'pop';
  onTabChange: (tab: 'trend' | 'pop') => void;
}) {
  return (
    <nav className="sticky bottom-0 z-30 bg-white border-t border-grey-200 pb-safe">
      <div className="max-w-lg mx-auto flex">
        <button
          onClick={() => onTabChange('trend')}
          className={`flex-1 py-3 text-sm font-bold text-center rounded-full mx-2 my-2 transition-all ${
            activeTab === 'trend'
              ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
              : 'text-grey-500'
          }`}>
          트렌드 PICK
        </button>
        <button
          onClick={() => onTabChange('pop')}
          className={`flex-1 py-3 text-sm font-bold text-center rounded-full mx-2 my-2 transition-all ${
            activeTab === 'pop'
              ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
              : 'text-grey-500'
          }`}>
          POP 메이커
        </button>
      </div>
    </nav>
  );
}
