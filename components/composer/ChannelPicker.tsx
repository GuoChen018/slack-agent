"use client";

import { useEffect, useMemo, useState } from "react";
import { Hash, Lock } from "lucide-react";
import { useSlackStore } from "@/lib/store";
import type { Conversation } from "@/lib/types";
import { PopoverShell } from "./PopoverShell";

interface Props {
  query: string;
  rect: DOMRect;
  onPick: (c: Conversation) => void;
  onClose: () => void;
}

export function ChannelPicker({ query, rect, onPick, onClose }: Props) {
  const convs = useSlackStore((s) => s.conversations);
  const order = useSlackStore((s) => s.conversationOrder);

  const list = useMemo(() => {
    const q = query.toLowerCase();
    return order
      .map((id) => convs[id])
      .filter((c) => c.kind === "channel")
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [convs, order, query]);

  const [idx, setIdx] = useState(0);
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setIdx(0);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(list.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (list[idx]) {
          e.preventDefault();
          onPick(list[idx]);
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [list, idx, onPick]);

  if (!list.length) return null;

  return (
    <PopoverShell rect={rect} onClose={onClose} width={360}>
      <div className="border-b border-slack-border px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slack-text-muted">
        Channels matching {query ? <code>{query}</code> : "anyone"}
      </div>
      <ul className="max-h-[280px] overflow-y-auto py-1">
        {list.map((c, i) => (
          <li
            key={c.id}
            onMouseEnter={() => setIdx(i)}
            onClick={() => onPick(c)}
            className={
              "flex cursor-pointer items-center gap-2 px-3 py-1.5 " +
              (i === idx ? "bg-[#1264a3] text-white" : "text-slack-text")
            }
          >
            {c.isPrivate ? <Lock size={14} /> : <Hash size={14} />}
            <span className="font-bold">{c.name}</span>
            {c.topic && (
              <span className={i === idx ? "text-white/80 text-[13px] truncate" : "text-slack-text-muted text-[13px] truncate"}>
                {c.topic}
              </span>
            )}
          </li>
        ))}
      </ul>
    </PopoverShell>
  );
}
