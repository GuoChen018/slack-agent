"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AgentMeta } from "@/lib/agents";
import { Avatar } from "@/components/Avatar";
import { MessageSquare, Plus } from "lucide-react";

interface Props {
  agent: AgentMeta;
  /** Bounding rect of the chip the card is anchored to. */
  anchorRect: DOMRect;
  onAddToChat: () => void;
  onMessageAgent: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const CARD_WIDTH = 380;
const GAP = 8;

export function SuggestionHoverCard({
  agent,
  anchorRect,
  onAddToChat,
  onMessageAgent,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  // Anchor the card's BOTTOM above the chip so it sits in the same plane as
  // the @mention hover card. Fall back below if there isn't room.
  const left = Math.min(
    window.innerWidth - CARD_WIDTH - 12,
    Math.max(12, anchorRect.left),
  );
  const placeAbove = anchorRect.top > 220;
  const positionStyle: React.CSSProperties = placeAbove
    ? {
        bottom: window.innerHeight - anchorRect.top + GAP,
        left,
        width: CARD_WIDTH,
      }
    : { top: anchorRect.bottom + GAP, left, width: CARD_WIDTH };

  // Portal to body so the card escapes any ancestor that has `transform`,
  // `filter`, or `perspective` set (which would otherwise become its
  // containing block and make `position: fixed` resolve to that ancestor
  // instead of the viewport — clipping the card out of view).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const card = (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="animate-hover-card-in fixed z-[60] overflow-hidden rounded-lg border border-slack-border bg-white shadow-md"
      style={positionStyle}
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar user={agent} size={48} rounded="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-black text-slack-text">
              {agent.displayName}
            </span>
            <span className="rounded bg-slack-pane-alt px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wide text-slack-text-muted">
              Agent
            </span>
          </div>
          {agent.title && (
            <div className="mt-0.5 line-clamp-2 text-[12px] text-slack-text-muted">
              {agent.title}
            </div>
          )}
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slack-text-muted">
          Why this was suggested
        </div>
        <ul className="flex flex-col gap-1 text-[13px] leading-[1.5] text-[#454547]">
          {agent.rationale.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="text-slack-text-muted">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onAddToChat}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded border border-slack-border bg-white px-2 text-[13px] font-bold text-slack-text hover:bg-slack-pane-hover"
        >
          <Plus size={14} strokeWidth={2.4} />
          Add to chat
        </button>
        <button
          onClick={onMessageAgent}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded border border-slack-border bg-white px-2 text-[13px] font-bold text-slack-text hover:bg-slack-pane-hover"
        >
          <MessageSquare size={14} strokeWidth={2.4} />
          Message {agent.displayName}
        </button>
      </div>
    </div>
  );

  return createPortal(card, document.body);
}
