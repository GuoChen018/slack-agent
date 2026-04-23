"use client";

import { useEffect, useMemo, useState } from "react";
import { Hash, Lock, Search, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useSlackStore } from "@/lib/store";

export function QuickSwitcher() {
  const open = useSlackStore((s) => s.quickSwitcherOpen);
  const setOpen = useSlackStore((s) => s.setQuickSwitcher);
  const convs = useSlackStore((s) => s.conversations);
  const order = useSlackStore((s) => s.conversationOrder);
  const usersById = useSlackStore((s) => s.users);
  const setActive = useSlackStore((s) => s.setActiveConversation);
  const currentUserId = useSlackStore((s) => s.currentUserId);

  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setOpen]);

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return order
      .map((id) => convs[id])
      .filter((c) => {
        if (!s) return true;
        if (c.name.toLowerCase().includes(s)) return true;
        return c.memberIds.some((id) => usersById[id]?.displayName.toLowerCase().includes(s));
      })
      .slice(0, 8);
  }, [order, convs, usersById, q]);

  const [lastKey, setLastKey] = useState(`${q}|${open}`);
  const currentKey = `${q}|${open}`;
  if (lastKey !== currentKey) {
    setLastKey(currentKey);
    setIdx(0);
  }

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(list.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        if (list[idx]) {
          setActive(list[idx].id);
          setOpen(false);
          setQ("");
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, list, idx, setActive, setOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[640px] overflow-hidden rounded-lg border border-slack-border bg-white shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-slack-border px-3 py-2">
          <Search size={16} className="text-slack-text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to a conversation…"
            className="w-full bg-transparent text-[15px] outline-none"
          />
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-slack-text-muted hover:bg-slack-pane-hover"
          >
            <X size={14} />
          </button>
        </div>
        <ul className="max-h-[400px] overflow-y-auto py-1">
          {list.map((c, i) => {
            const otherIds = c.memberIds.filter((id) => id !== currentUserId);
            const other = otherIds.length
              ? usersById[otherIds[0]]
              : usersById[currentUserId];
            return (
              <li
                key={c.id}
                onMouseEnter={() => setIdx(i)}
                onClick={() => {
                  setActive(c.id);
                  setOpen(false);
                  setQ("");
                }}
                className={
                  "flex cursor-pointer items-center gap-2 px-3 py-2 " +
                  (i === idx ? "bg-[#1264a3] text-white" : "text-slack-text")
                }
              >
                {c.kind === "channel" ? (
                  c.isPrivate ? (
                    <Lock size={14} />
                  ) : (
                    <Hash size={14} />
                  )
                ) : (
                  other && <Avatar user={other} size={18} />
                )}
                <span className="font-bold">
                  {c.kind === "channel" ? c.name : c.name}
                </span>
                {c.topic && (
                  <span
                    className={
                      "truncate text-[13px] " +
                      (i === idx ? "text-white/80" : "text-slack-text-muted")
                    }
                  >
                    — {c.topic}
                  </span>
                )}
              </li>
            );
          })}
          {!list.length && (
            <li className="px-3 py-6 text-center text-[13px] text-slack-text-muted">
              No matches for &ldquo;{q}&rdquo;
            </li>
          )}
        </ul>
        <div className="border-t border-slack-border bg-slack-pane-alt px-3 py-1.5 text-[11px] text-slack-text-muted">
          <kbd className="rounded border border-slack-border bg-white px-1">↵</kbd> open ·{" "}
          <kbd className="rounded border border-slack-border bg-white px-1">↑↓</kbd> navigate ·{" "}
          <kbd className="rounded border border-slack-border bg-white px-1">esc</kbd> close
        </div>
      </div>
    </div>
  );
}
