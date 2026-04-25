"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Plus, X } from "lucide-react";
import type { AgentMeta } from "@/lib/agents";
import { AiSparkleIcon } from "@/components/icons/AiSparkleIcon";
import { SuggestionHoverCard } from "./SuggestionHoverCard";

export type SuggestionState = "idle" | "ready" | "dismissed";

/** Where the strip is being rendered.
 *
 * - `inline`: shares the composer footer with the formatting toolbar; is
 *   constrained horizontally and gets a content-aware compact mode that
 *   drops agent names to icons when space runs out.
 * - `above-input`: a full-width row above the input field, akin to file
 *   upload chips or link previews. Always shows full agent names. */
export type SuggestionPlacement = "inline" | "above-input";

interface Props {
  state: SuggestionState;
  agents: AgentMeta[];
  /** When true, chips currently rendered will play the one-shot shimmer on
   * mount. The composer flips this back to false ~1.3s after a fresh reveal
   * so subsequent re-renders don't try to re-trigger. */
  shimmer: boolean;
  placement?: SuggestionPlacement;
  /** When false, skip the entrance fade-up animation. Used in thread mode
   * where chips are seeded from the parent message and should simply *be*
   * there as the pane mounts — fading them in feels delayed since the user
   * didn't initiate the suggestion themselves. */
  animateEntrance?: boolean;
  /** Index of the chip the user has navigated to via keyboard (↑ from the
   * input). When set, the chip renders with a focused-style border and
   * Enter applies it from the parent's keydown handler. `null` = no chip is
   * keyboard-focused (default; caret is in the input). */
  activeIndex?: number | null;
  onApply: (agent: AgentMeta) => void;
  onDismiss: (agent: AgentMeta) => void;
  onMessageAgent: (agent: AgentMeta) => void;
}

const HOVER_HIDE_MS = 120;

export function SuggestionStrip({
  state,
  agents,
  shimmer,
  placement = "inline",
  animateEntrance = true,
  activeIndex = null,
  onApply,
  onDismiss,
  onMessageAgent,
}: Props) {
  const [hover, setHover] = useState<{
    agent: AgentMeta;
    rect: DOMRect;
  } | null>(null);
  const hideTimer = useRef<number | null>(null);

  // Capture the one-shot shimmer on mount only. The strip mounts when state
  // flips to "ready", which happens once per draft reveal — perfect window to
  // sweep the "Suggested" label and then settle.
  const [shimmering, setShimmering] = useState(shimmer);
  useEffect(() => {
    if (!shimmering) return;
    const t = window.setTimeout(() => setShimmering(false), 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the available width gets cramped (sidebar widened, channel narrowed,
  // multiple chips), drop the agent name from each chip and just show the
  // logo. Only relevant for the inline placement — the above-input row spans
  // the full composer width and never needs to compress.
  const stripRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (placement !== "inline") {
      setCompact(false);
      return;
    }
    const el = stripRef.current;
    if (!el) return;
    const SUGGESTED_LABEL_AND_GAPS = 100; // sparkle + "Suggested" + gaps
    const FULL_CHIP_WIDTH = 130; // logo + "@AgentName" + padding
    const needed = SUGGESTED_LABEL_AND_GAPS + agents.length * FULL_CHIP_WIDTH;
    const ro = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < needed);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [agents.length, placement]);

  const cancelHide = () => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => setHover(null), HOVER_HIDE_MS);
  };

  if (state === "idle" || state === "dismissed") return null;

  if (!agents.length) return null;

  // `w-full` so the strip claims the full width its parent allots — the
  // ResizeObserver above relies on this to read the *available* width
  // rather than the strip's collapsed content width. In above-input mode
  // we drop the leading label entirely: the floating treatment itself
  // signals "suggestion" and the row reads cleaner without it.
  const isFloating = placement === "above-input";
  return (
    <div
      ref={stripRef}
      className={clsx(
        "flex w-full min-w-0 items-center gap-2",
        animateEntrance && "animate-suggestion-strip-in",
        placement === "inline" ? "pl-1 pr-2" : "",
      )}
    >
      {!isFloating && (
        <>
          <AiSparkleIcon size={13} className="shrink-0 text-slack-text-muted" />
          <span
            className={clsx(
              "shrink-0 text-[11px] font-bold uppercase tracking-wide",
              shimmering ? "shimmer-text-once" : "text-slack-text-muted",
            )}
          >
            Suggested
          </span>
        </>
      )}
      <div
        className={clsx(
          "flex min-w-0 items-center",
          isFloating ? "gap-2" : "ml-1 gap-1",
        )}
      >
        {agents.map((agent, idx) => (
          <SuggestionChip
            key={agent.id}
            agent={agent}
            active={hover?.agent.id === agent.id}
            keyboardFocused={activeIndex === idx}
            isFirst={idx === 0}
            compact={compact}
            floating={isFloating}
            onApply={() => {
              cancelHide();
              setHover(null);
              onApply(agent);
            }}
            onDismiss={() => {
              cancelHide();
              setHover(null);
              onDismiss(agent);
            }}
            onEnter={(rect) => {
              cancelHide();
              setHover({ agent, rect });
            }}
            onLeave={scheduleHide}
          />
        ))}
      </div>
      {hover && (
        <SuggestionHoverCard
          agent={hover.agent}
          anchorRect={hover.rect}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
          onAddToChat={() => {
            const a = hover.agent;
            setHover(null);
            onApply(a);
          }}
          onMessageAgent={() => {
            const a = hover.agent;
            setHover(null);
            onMessageAgent(a);
          }}
        />
      )}
    </div>
  );
}

function SuggestionChip({
  agent,
  active,
  keyboardFocused,
  isFirst,
  compact,
  floating,
  onApply,
  onDismiss,
  onEnter,
  onLeave,
}: {
  agent: AgentMeta;
  active: boolean;
  /** True when the user has navigated to this chip via the keyboard (↑).
   * Renders a focused-style border so it's clear which chip Enter applies. */
  keyboardFocused: boolean;
  /** True only for the first chip — used to render the discoverability
   * keycap "↑" so users learn the shortcut without a separate hint. */
  isFirst: boolean;
  compact: boolean;
  floating: boolean;
  onApply: () => void;
  onDismiss: () => void;
  onEnter: (rect: DOMRect) => void;
  onLeave: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      ref={ref}
      onMouseEnter={() => {
        if (ref.current) onEnter(ref.current.getBoundingClientRect());
      }}
      onMouseLeave={onLeave}
      title={compact ? `@${agent.displayName}` : undefined}
      // Floating variant: pill-shaped, white bg, real shadow, solid border.
      // Reads as an individual floating object rather than part of a row.
      // Inline variant: the original dashed-border treatment that lives in
      // the toolbar.
      className={clsx(
        "group flex h-7 shrink-0 items-center overflow-hidden text-[12px] transition-colors",
        floating
          ? // Custom soft shadow — `shadow-sm` reads too pronounced against
            // the channel background; this is closer to the very subtle drop
            // Slack uses on hover cards and toast pills.
            clsx(
              "rounded-full border bg-white shadow-[0_1px_2px_rgba(15,20,25,0.04)] hover:border-slack-border-strong hover:shadow-[0_2px_4px_rgba(15,20,25,0.06)]",
              keyboardFocused
                ? "border-slack-text ring-2 ring-slack-text/15"
                : "border-slack-border",
            )
          : clsx(
              "h-6 rounded-md border border-dashed border-slack-border-strong",
              active || keyboardFocused
                ? "bg-slack-pane-hover"
                : "bg-white hover:bg-slack-pane-hover",
              keyboardFocused && "ring-2 ring-slack-text/15",
            ),
      )}
    >
      <button
        onClick={onApply}
        className={clsx(
          "flex h-full items-center text-slack-text",
          floating
            ? "gap-1.5 pl-2 pr-2"
            : clsx("rounded-l-md", compact ? "gap-0 px-1.5" : "gap-1.5 pr-1.5 pl-2"),
        )}
      >
        {/* Floating pills get a leading `+` so the action is obvious at a
            glance — without it, an icon + name reads as a static badge.
            Faint color keeps it from competing with the agent identity. */}
        {floating && (
          <Plus
            size={12}
            strokeWidth={2.2}
            className="shrink-0 text-slack-text-muted"
          />
        )}
        {agent.avatarUrl && !imgFailed ? (
          <img
            src={agent.avatarUrl}
            alt=""
            width={14}
            height={14}
            className="h-3.5 w-3.5 rounded-sm object-contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span
            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-[8px] font-black text-white"
            style={{ background: agent.avatarColor }}
          >
            {agent.displayName.slice(0, 1)}
          </span>
        )}
        {!compact && <span className="font-medium">{agent.displayName}</span>}
      </button>
      {/* Dismiss button — uses width + opacity so the chip smoothly expands
          on hover instead of snapping in. The X has its own concentric
          rounded hover bg sitting inside the chip. */}
      <span
        className="grid h-full grid-cols-[0fr] opacity-0 transition-[grid-template-columns,opacity] duration-150 ease-out group-hover:grid-cols-[1fr] group-hover:opacity-100"
      >
        <span className="flex h-full items-center overflow-hidden pr-[3px] pl-px">
          <button
            onClick={onDismiss}
            aria-label={`Dismiss ${agent.displayName}`}
            tabIndex={active ? 0 : -1}
            className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full text-slack-text-muted transition-colors hover:bg-black/5 hover:text-slack-text"
          >
            <X size={12} strokeWidth={2.4} />
          </button>
        </span>
      </span>
    </div>
  );
}
