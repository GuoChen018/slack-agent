"use client";

import { Clock, Search, HelpCircle } from "lucide-react";
import { useSlackStore } from "@/lib/store";

export function TopBar() {
  const setQuickSwitcher = useSlackStore((s) => s.setQuickSwitcher);
  const conv = useSlackStore(
    (s) => s.conversations[s.activeConversationId],
  );
  return (
    <div className="flex h-[44px] shrink-0 items-center gap-2 bg-slack-rail px-3 text-white">
      {/* Left spacer so the search stays centered */}
      <div className="flex-1" />

      {/* History + search cluster sit together, centered */}
      <button
        className="flex h-7 w-7 items-center justify-center rounded-md text-white/85 hover:bg-white/10"
        title="History"
      >
        <Clock size={16} />
      </button>
      <button
        onClick={() => setQuickSwitcher(true)}
        className="flex h-[26px] w-full max-w-[800px] items-center gap-2 rounded-md bg-[#784b7a] px-3 text-left text-[13px] text-white shadow-[0_0_0_1px_rgba(29,28,29,0.3),0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[#865a89]"
      >
        <Search size={14} className="text-white/85" />
        <span className="truncate text-white/90">
          Search{conv ? ` ${conv.kind === "channel" ? conv.name : conv.name}` : ""}
        </span>
      </button>

      {/* Right cluster */}
      <div className="flex flex-1 justify-end">
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/85 hover:bg-white/10"
          title="Help"
        >
          <HelpCircle size={16} />
        </button>
      </div>
    </div>
  );
}
