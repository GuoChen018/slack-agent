"use client";

import { useEffect, useMemo, useState } from "react";
import { useSlackStore } from "@/lib/store";
import { PopoverShell } from "./PopoverShell";
import type { User } from "@/lib/types";

interface Props {
  query: string;
  rect: DOMRect;
  onPick: (user: User) => void;
  onClose: () => void;
}

export function MentionPicker({ query, rect, onPick, onClose }: Props) {
  const users = useSlackStore((s) => s.users);
  const convId = useSlackStore((s) => s.activeConversationId);
  const conv = useSlackStore((s) => s.conversations[convId]);
  const currentUserId = useSlackStore((s) => s.currentUserId);

  const candidates = useMemo(() => {
    const pool: User[] = conv
      ? conv.memberIds.map((id) => users[id]).filter(Boolean)
      : Object.values(users);
    const q = query.toLowerCase();
    const scored = pool
      .filter((u) => u.id !== currentUserId)
      .filter((u) =>
        !q ||
        u.displayName.toLowerCase().includes(q) ||
        u.handle.toLowerCase().includes(q),
      );
    // specials
    const specials: User[] = [
      {
        id: "_channel",
        name: "channel",
        displayName: "channel",
        handle: "channel",
        avatarColor: "#f2c744",
        presence: "active",
        title: "Notify everyone in this channel",
        isBot: false,
      } as User,
      {
        id: "_here",
        name: "here",
        displayName: "here",
        handle: "here",
        avatarColor: "#36c5f0",
        presence: "active",
        title: "Notify everyone online in this channel",
      } as User,
      {
        id: "_everyone",
        name: "everyone",
        displayName: "everyone",
        handle: "everyone",
        avatarColor: "#e01e5a",
        presence: "active",
        title: "Notify every member of the workspace",
      } as User,
    ];
    const matchingSpecials = specials.filter((s) =>
      !q || s.handle.toLowerCase().startsWith(q),
    );
    return [...matchingSpecials, ...scored].slice(0, 8);
  }, [users, query, conv, currentUserId]);

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
        setIdx((i) => Math.min(candidates.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (candidates[idx]) {
          e.preventDefault();
          onPick(candidates[idx]);
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [candidates, idx, onPick]);

  if (!candidates.length) return null;

  return (
    <PopoverShell rect={rect} onClose={onClose} width={360}>
      <div className="border-b border-slack-border px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slack-text-muted">
        People matching {query ? <code className="text-[12px]">{query}</code> : "anyone"}
      </div>
      <ul className="max-h-[280px] overflow-y-auto py-1">
        {candidates.map((u, i) => (
          <li
            key={u.id}
            onMouseEnter={() => setIdx(i)}
            onClick={() => onPick(u)}
            className={
              "flex cursor-pointer items-center gap-2 px-3 py-1.5 " +
              (i === idx ? "bg-[#1264a3] text-white" : "text-slack-text")
            }
          >
            <div className="flex h-6 w-6 items-center justify-center rounded" style={{ background: u.avatarColor, color: "white", fontWeight: 900, fontSize: 11 }}>
              {u.id.startsWith("_") ? "@" : u.displayName.split(" ").map((p) => p[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <span className="font-bold">
              {u.id.startsWith("_") ? `@${u.handle}` : u.displayName}
            </span>
            {u.title && (
              <span className={i === idx ? "text-white/80 text-[13px]" : "text-slack-text-muted text-[13px]"}>
                {u.title}
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="border-t border-slack-border bg-slack-pane-alt px-3 py-1.5 text-[11px] text-slack-text-muted">
        <kbd className="rounded border border-slack-border bg-white px-1">↵</kbd> to select ·{" "}
        <kbd className="rounded border border-slack-border bg-white px-1">↑↓</kbd> to navigate ·{" "}
        <kbd className="rounded border border-slack-border bg-white px-1">esc</kbd> to dismiss
      </div>
    </PopoverShell>
  );
}
