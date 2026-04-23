"use client";

import { ChevronLeft, ChevronRight, Clock, Search, HelpCircle } from "lucide-react";
import { useSlackStore } from "@/lib/store";

export function TopBar() {
  const setQuickSwitcher = useSlackStore((s) => s.setQuickSwitcher);
  const conv = useSlackStore(
    (s) => s.conversations[s.activeConversationId],
  );
  return (
    <div className="flex h-[44px] items-center gap-2 bg-[#3F0E40] px-4 text-white">
      <div className="flex items-center gap-1">
        <button className="rounded p-1 text-white/70 hover:bg-white/10 disabled:opacity-40" disabled>
          <ChevronLeft size={18} />
        </button>
        <button className="rounded p-1 text-white/70 hover:bg-white/10 disabled:opacity-40" disabled>
          <ChevronRight size={18} />
        </button>
        <button className="ml-1 rounded p-1 text-white/70 hover:bg-white/10" title="History">
          <Clock size={16} />
        </button>
      </div>

      <button
        onClick={() => setQuickSwitcher(true)}
        className="mx-auto flex h-7 w-full max-w-[720px] items-center gap-2 rounded-md bg-white/10 px-3 text-left text-[13px] text-white/85 ring-1 ring-white/15 hover:bg-white/15"
      >
        <Search size={14} />
        <span className="truncate">
          Search{conv ? ` ${conv.kind === "channel" ? `#${conv.name}` : conv.name}` : ""}
        </span>
        <kbd className="ml-auto hidden items-center gap-1 rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-medium text-white/80 md:flex">
          ⌘ K
        </kbd>
      </button>

      <button className="rounded p-1 text-white/70 hover:bg-white/10" title="Help">
        <HelpCircle size={16} />
      </button>
    </div>
  );
}
