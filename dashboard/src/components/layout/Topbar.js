"use client";

export default function Topbar({ alertCount = 0 }) {
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <header className="h-14 bg-white border-b border-gray-100 px-6 flex items-center justify-between flex-shrink-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{greeting()}</p>
        <p className="text-xs text-gray-400">{today}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          )}
        </div>
      </div>
    </header>
  );
}