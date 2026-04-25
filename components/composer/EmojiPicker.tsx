"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PopoverShell } from "./PopoverShell";

const EMOJIS = [
  { e: "👍", k: ["+1", "thumbsup", "like"] },
  { e: "❤️", k: ["heart", "love"] },
  { e: "😂", k: ["joy", "lol", "laugh"] },
  { e: "🎉", k: ["tada", "party"] },
  { e: "👀", k: ["eyes"] },
  { e: "🙏", k: ["pray", "thanks"] },
  { e: "🔥", k: ["fire", "hot"] },
  { e: "🚀", k: ["rocket", "ship"] },
  { e: "✨", k: ["sparkles"] },
  { e: "💯", k: ["hundred"] },
  { e: "🙌", k: ["raised_hands"] },
  { e: "👏", k: ["clap"] },
  { e: "😍", k: ["heart_eyes"] },
  { e: "🤔", k: ["thinking"] },
  { e: "😅", k: ["sweat_smile"] },
  { e: "😬", k: ["grimacing"] },
  { e: "😭", k: ["sob"] },
  { e: "🤯", k: ["mind_blown"] },
  { e: "👋", k: ["wave"] },
  { e: "🫡", k: ["salute"] },
  { e: "🧠", k: ["brain"] },
  { e: "💪", k: ["muscle"] },
  { e: "🎯", k: ["dart", "target"] },
  { e: "🛠️", k: ["tools"] },
  { e: "🐛", k: ["bug"] },
  { e: "📌", k: ["pin"] },
  { e: "📎", k: ["paperclip"] },
  { e: "📝", k: ["memo"] },
  { e: "💬", k: ["speech"] },
  { e: "☕", k: ["coffee"] },
  { e: "🍩", k: ["doughnut"] },
  { e: "🌴", k: ["palm_tree"] },
  { e: "✅", k: ["white_check_mark", "check"] },
  { e: "❌", k: ["x", "cross"] },
  { e: "⚠️", k: ["warning"] },
  { e: "⭐", k: ["star"] },
];

interface Props {
  rect?: DOMRect;
  query?: string;
  inline?: boolean;
  anchor?: "top" | "bottom";
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ rect, query = "", inline, onPick, onClose }: Props) {
  const [q, setQ] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setQ(query);
  }

  const items = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return EMOJIS;
    return EMOJIS.filter((x) => x.k.some((k) => k.startsWith(s)));
  }, [q]);

  const content = (
    <div>
      {!inline && (
        <div className="flex items-center gap-2 border-b border-slack-border px-3 py-2">
          <Search size={14} className="text-slack-text-muted" />
          <input
            autoFocus
            placeholder="Search emoji"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-transparent text-[14px] outline-none"
          />
        </div>
      )}
      {inline && (
        <div className="border-b border-slack-border px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slack-text-muted">
          Emoji {q && <>matching <code>{q}</code></>}
        </div>
      )}
      <div className="grid grid-cols-8 gap-1 p-2 max-h-[240px] overflow-y-auto">
        {items.map((x) => (
          <button
            key={x.e + x.k.join()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(x.e)}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-slack-pane-hover"
            title={`:${x.k[0]}:`}
          >
            <span className="text-[18px]">{x.e}</span>
          </button>
        ))}
        {!items.length && (
          <div className="col-span-8 py-6 text-center text-[13px] text-slack-text-muted">
            No emoji matching &ldquo;{q}&rdquo;
          </div>
        )}
      </div>
    </div>
  );

  if (inline && rect) {
    return (
      <PopoverShell rect={rect} onClose={onClose} width={360} maxHeight={300}>
        {content}
      </PopoverShell>
    );
  }

  // Anchored to emoji button — render absolute above the composer footer
  return (
    <div
      className="shadow-popover absolute z-50 w-[320px] overflow-hidden rounded-lg bg-white"
      style={{ bottom: "120%", left: 0 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {content}
    </div>
  );
}
