"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { Avatar } from "./Avatar";
import { useSlackStore } from "@/lib/store";
import { AGENTS_BY_ID } from "@/lib/agents";
import type { User } from "@/lib/types";

interface HoverState {
  rect: DOMRect;
  userId: string;
}

const HIDE_DELAY = 120;

export function MentionHoverCard() {
  const users = useSlackStore((s) => s.users);
  const currentUserId = useSlackStore((s) => s.currentUserId);
  const [hover, setHover] = useState<HoverState | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);

  const cancelHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => setHover(null), HIDE_DELAY);
  };

  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const pill = target.closest?.(".mention[data-user]") as HTMLElement | null;
      if (pill) {
        const userId = pill.getAttribute("data-user");
        if (userId) {
          cancelHide();
          setHover({ userId, rect: pill.getBoundingClientRect() });
        }
        return;
      }
      // Mouse moved over the card itself — keep it open.
      if (cardRef.current && cardRef.current.contains(target)) {
        cancelHide();
      }
    };
    const onOut = (e: MouseEvent) => {
      const from = e.target as HTMLElement | null;
      if (!from) return;
      const leftPill = from.closest?.(".mention[data-user]");
      const leftCard = cardRef.current && cardRef.current.contains(from);
      if (!leftPill && !leftCard) return;

      const to = e.relatedTarget as HTMLElement | null;
      const goingToPill = !!to?.closest?.(".mention[data-user]");
      const goingToCard = !!(cardRef.current && to && cardRef.current.contains(to));
      if (goingToPill || goingToCard) return;
      scheduleHide();
    };
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      cancelHide();
    };
  }, []);

  if (!hover) return null;
  const id = hover.userId;
  const agent = AGENTS_BY_ID[id];
  const user: User | null = agent ?? users[id] ?? null;
  if (!user) return null;
  const isAgent = !!agent;
  const isSelf = id === currentUserId;

  // Position: anchor the card's BOTTOM 6px above the pill so it appears
  // above. If there isn't enough room above, fall back to below.
  const cardWidth = 320;
  const left = Math.min(
    window.innerWidth - cardWidth - 12,
    Math.max(12, hover.rect.left),
  );
  const spaceAbove = hover.rect.top;
  const placeAbove = spaceAbove > 200; // rough min card height
  const positionStyle: React.CSSProperties = placeAbove
    ? { bottom: window.innerHeight - hover.rect.top + 6, left, width: cardWidth }
    : { top: hover.rect.bottom + 6, left, width: cardWidth };

  return (
    <div
      ref={cardRef}
      onMouseEnter={cancelHide}
      onMouseLeave={scheduleHide}
      className="animate-hover-card-in shadow-popover fixed z-[60] overflow-hidden rounded-lg bg-white"
      style={positionStyle}
    >
      <div className="flex items-center gap-3 p-4">
        <Avatar user={user} size={56} rounded="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-black text-slack-text">
              {user.displayName}
              {isSelf ? " (you)" : ""}
            </span>
            {user.status?.emoji && (
              <span className="text-[14px]">{user.status.emoji}</span>
            )}
            {isAgent && (
              <span className="rounded bg-slack-pane-alt px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wide text-slack-text-muted">
                Agent
              </span>
            )}
          </div>
          {user.title && (
            <div className="mt-0.5 line-clamp-2 text-[13px] text-slack-text-muted">
              {user.title}
            </div>
          )}
        </div>
      </div>
      <div className="px-4 pb-4">
        {isAgent ? (
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slack-text-muted">
              What it can do
            </div>
            <ul className="flex flex-col gap-1 text-[13px] text-slack-text">
              {agent!.capabilities.map((cap) => (
                <li key={cap} className="flex gap-2">
                  <span className="text-slack-text-muted">•</span>
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-slack-text">
            <Clock size={14} className="text-slack-text-muted" />
            <span>{formatLocalTime()} local time</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatLocalTime() {
  const d = new Date();
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
