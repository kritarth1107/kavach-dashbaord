import { Search } from "lucide-react";

export function CenterSearchBar() {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-5 py-3">
      <Search className="h-[18px] w-[18px] shrink-0 text-[var(--text-tertiary)]" strokeWidth={2.25} />
      <input
        type="search"
        placeholder="Search or type command..."
        className="flex-1 bg-transparent text-[13px] font-medium text-[var(--text-primary)] placeholder:font-normal placeholder:text-[var(--text-tertiary)] outline-none"
      />
      <kbd className="hidden items-center gap-0.5 rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-2 py-1 text-[10px] font-semibold text-[var(--text-tertiary)] sm:flex">
        <span>⌘</span>
        <span>K</span>
      </kbd>
    </div>
  );
}
