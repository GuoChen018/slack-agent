"use client";

import { useEffect, useMemo, useState } from "react";
import { useSlackStore } from "@/lib/store";
import { PopoverShell } from "./PopoverShell";
import type { User } from "@/lib/types";
import { AGENTS } from "@/lib/agents";

interface Props {
  query: string;
  rect: DOMRect;
  onPick: (user: User) => void;
  onClose: () => void;
}

function matches(text: string, q: string) {
  return !q || text.toLowerCase().includes(q);
}

export function MentionPicker({ query, rect, onPick, onClose }: Props) {
  const users = useSlackStore((s) => s.users);
  const convId = useSlackStore((s) => s.activeConversationId);
  const conv = useSlackStore((s) => s.conversations[convId]);
  const currentUserId = useSlackStore((s) => s.currentUserId);

  const flat = useMemo(() => {
    const q = query.toLowerCase();
    const pool: User[] = conv
      ? conv.memberIds.map((id) => users[id]).filter(Boolean)
      : Object.values(users);
    const peopleAll = pool
      .filter((u) => u.id !== currentUserId && !u.isAgent && !u.isBot)
      .filter((u) => matches(u.displayName, q) || matches(u.handle, q));
    // Top 3 channel members by default; show more only when actively searching.
    const people = q ? peopleAll.slice(0, 6) : peopleAll.slice(0, 3);
    const agents = AGENTS.filter(
      (a) => matches(a.displayName, q) || matches(a.handle, q),
    );
    return [...people, ...agents];
  }, [users, query, conv, currentUserId]);

  const [idx, setIdx] = useState(0);
  const [failedImg, setFailedImg] = useState<Record<string, boolean>>({});
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setIdx(0);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(flat.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (flat[idx]) {
          e.preventDefault();
          e.stopPropagation();
          onPick(flat[idx]);
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [flat, idx, onPick]);

  if (!flat.length) return null;

  const Row = ({ u, globalIdx }: { u: User; globalIdx: number }) => {
    const active = globalIdx === idx;
    const showImg = !!u.avatarUrl && !failedImg[u.id];
    const initials = u.displayName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return (
      <li
        key={u.id}
        onMouseEnter={() => setIdx(globalIdx)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPick(u)}
        className={
          "flex cursor-pointer items-center gap-2 px-3 py-1.5 " +
          (active ? "bg-[#1264a3] text-white" : "text-slack-text")
        }
      >
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded"
          style={{
            background: showImg ? "#ffffff" : u.avatarColor,
            color: "white",
            fontWeight: 900,
            fontSize: 11,
          }}
        >
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={u.avatarUrl}
              alt=""
              width={24}
              height={24}
              className="h-full w-full object-contain"
              onError={() =>
                setFailedImg((prev) => ({ ...prev, [u.id]: true }))
              }
            />
          ) : (
            initials
          )}
        </div>
        <span className="shrink-0 font-bold">{u.displayName}</span>
        {u.isAgent && (
          <span
            className={
              "shrink-0 rounded px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wide " +
              (active
                ? "bg-white/20 text-white"
                : "bg-slack-pane-alt text-slack-text-muted")
            }
          >
            Agent
          </span>
        )}
        {u.title && (
          <span
            className={
              "truncate text-[13px] " +
              (active ? "text-white/80" : "text-slack-text-muted")
            }
          >
            {u.title}
          </span>
        )}
      </li>
    );
  };

  return (
    <PopoverShell rect={rect} onClose={onClose} width={380}>
      <ul className="max-h-[220px] overflow-y-auto py-1">
        {flat.map((u, i) => (
          <Row key={u.id} u={u} globalIdx={i} />
        ))}
      </ul>
    </PopoverShell>
  );
}
