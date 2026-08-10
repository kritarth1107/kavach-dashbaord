import { Search } from "lucide-react";

export function CenterSearchBar() {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white px-5 py-3">
      <Search className="h-[18px] w-[18px] shrink-0 text-[#9ca3af]" strokeWidth={2.25} />
      <input
        type="search"
        placeholder="Search or type command..."
        className="flex-1 bg-transparent text-[13px] font-medium text-[#1a1a1a] placeholder:font-normal placeholder:text-[#9ca3af] outline-none"
      />
      <kbd className="hidden items-center gap-0.5 rounded-lg border border-[#e5e7eb] bg-white px-2 py-1 text-[10px] font-semibold text-[#9ca3af] sm:flex">
        <span>⌘</span>
        <span>K</span>
      </kbd>
    </div>
  );
}
