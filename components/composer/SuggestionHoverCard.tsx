"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AgentMeta } from "@/lib/agents";
import { Avatar } from "@/components/Avatar";
import { Loader2, MessageSquare, Plus } from "lucide-react";
import { useSlackStore } from "@/lib/store";

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

  // Per-user connection gating. The first time the user encounters an agent
  // — typically via this hover card — they have to link their account
  // before either entry path can do useful work. Showing a single
  // "Connect Account" CTA keeps the moment of intent simple: no public
  // commitment yet, just an OAuth handoff. After connecting, the card
  // morphs into the regular two-CTA layout (Add to chat / Message). We
  // simulate the OAuth roundtrip with a brief "Connecting..." state so
  // it feels like a real handoff rather than an instant flip.
  const isSetup = useSlackStore(
    (s) => !!s.agentSetupComplete[agent.id],
  );
  const markAgentSetupComplete = useSlackStore(
    (s) => s.markAgentSetupComplete,
  );
  const [connecting, setConnecting] = useState(false);
  const handleConnect = () => {
    if (connecting) return;
    setConnecting(true);
    // ~700ms reads as "we kicked off OAuth, came back, you're done" without
    // dragging the demo. The state flip itself is instant; the delay is
    // purely there to suggest a roundtrip happened.
    window.setTimeout(() => {
      markAgentSetupComplete(agent.id);
      setConnecting(false);
    }, 700);
  };

  if (!mounted) return null;

  const card = (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="animate-hover-card-in shadow-popover fixed z-[60] overflow-hidden rounded-lg bg-white"
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
        {isSetup ? (
          <>
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
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex h-9 w-full items-center justify-center gap-2 rounded bg-[#007a5a] px-2 text-[13px] font-bold text-white transition-colors hover:bg-[#148567] disabled:opacity-80"
          >
            {connecting ? (
              <>
                <Loader2
                  size={14}
                  strokeWidth={2.4}
                  className="animate-spin"
                />
                Connecting to {agent.displayName}…
              </>
            ) : (
              <>Connect Account</>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(card, document.body);
}
