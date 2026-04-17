'use client';
export default function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-grey-200">
      <div className="max-w-lg mx-auto h-14 px-5 flex items-center justify-between">
        <h1 className="text-lg font-black text-grey-900">스토어24</h1>
        <span className="text-sm font-medium text-grey-500">User Name</span>
      </div>
    </header>
  );
}
