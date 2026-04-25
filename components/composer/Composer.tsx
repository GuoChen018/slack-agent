"use client";

import clsx from "clsx";
import {
  AtSign,
  Bold,
  ChevronDown,
  Italic,
  Strikethrough,
  Link2,
  Code,
  Code2,
  SquareSlash,
  Quote,
  List,
  ListOrdered,
  Plus,
  Send,
  Smile,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSlackStore } from "@/lib/store";
import { MentionPicker } from "./MentionPicker";
import { ChannelPicker } from "./ChannelPicker";
import { SlashMenu } from "./SlashMenu";
import { EmojiPicker } from "./EmojiPicker";
import { PlusMenu } from "./PlusMenu";
import {
  SuggestionStrip,
  type SuggestionState,
} from "./SuggestionStrip";
import {
  type AgentMeta,
  suggestAgentsForDraft,
} from "@/lib/agents";

// Suggestion timing: how long the user must stop typing before we re-evaluate
// the agent candidate set. Chips appear quietly when ready (with a one-shot
// shimmer on the first reveal per draft) and stay sticky after that.
const SUGGEST_IDLE_MS = 800;
const SUGGEST_SHIMMER_MS = 1300;
const SUGGEST_MIN_LENGTH = 25;

type TriggerKind = "mention" | "channel" | "slash" | "emoji";
interface TriggerState {
  kind: TriggerKind;
  query: string;
  rect: DOMRect;
}
type Trigger = TriggerState | null;

interface Props {
  threadParentId?: string;
  /** When set, the composer routes sends through `askAgent` instead of
   * posting to the active channel. Used by the agent pane. */
  agentId?: string;
  placeholder?: string;
}

export function Composer({ threadParentId, agentId, placeholder }: Props) {
  const convId = useSlackStore((s) => s.activeConversationId);
  const conv = useSlackStore((s) => s.conversations[convId]);
  const users = useSlackStore((s) => s.users);
  const currentUserId = useSlackStore((s) => s.currentUserId);
  const sendMessage = useSlackStore((s) => s.sendMessage);
  const askAgent = useSlackStore((s) => s.askAgent);
  const amendAgentProposal = useSlackStore((s) => s.amendAgentProposal);
  const drafts = useSlackStore((s) => s.drafts);
  const setDraft = useSlackStore((s) => s.setDraft);
  const clearDraft = useSlackStore((s) => s.clearDraft);

  const draftKey = agentId
    ? `agent_${agentId}`
    : threadParentId
      ? "thread"
      : convId;
  const draft = drafts[draftKey];

  const [showToolbar, setShowToolbar] = useState(false);
  const [trigger, setTrigger] = useState<Trigger>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const inputRef = useRef<HTMLDivElement>(null);

  const openAgent = useSlackStore((s) => s.openAgent);
  const suggestionPlacement = useSlackStore(
    (s) => s.variants.suggestionPlacement,
  );

  // Suggestion state machine. Disabled inside thread composers — agentic
  // suggestions only show in the main channel composer.
  const [suggestState, setSuggestState] = useState<SuggestionState>("idle");
  const [suggested, setSuggested] = useState<AgentMeta[]>([]);
  const [shimmerOnReveal, setShimmerOnReveal] = useState(false);
  const idleTimer = useRef<number | null>(null);
  const shimmerTimer = useRef<number | null>(null);
  // Refs mirror the sticky state so the debounced callback can read the
  // latest values without depending on stale closures.
  const suggestedRef = useRef<AgentMeta[]>([]);
  const suggestStateRef = useRef<SuggestionState>("idle");
  useEffect(() => {
    suggestedRef.current = suggested;
  }, [suggested]);
  useEffect(() => {
    suggestStateRef.current = suggestState;
  }, [suggestState]);

  const clearIdleTimer = () => {
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  };
  const clearSuggestionTimers = () => {
    clearIdleTimer();
    if (shimmerTimer.current) {
      window.clearTimeout(shimmerTimer.current);
      shimmerTimer.current = null;
    }
  };

  /** Hard reset: idle, no chips, no shimmer. Called on conversation switch
   * and after send. */
  const resetSuggestions = () => {
    clearSuggestionTimers();
    setSuggestState("idle");
    setSuggested([]);
    setShimmerOnReveal(false);
  };

  useEffect(() => {
    return () => clearSuggestionTimers();
  }, []);

  const computedPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    if (agentId) return "Reply…";
    if (!conv) return "Message";
    if (threadParentId) return "Reply…";
    if (conv.kind === "channel") return `Message #${conv.name}`;
    if (conv.kind === "dm" && conv.memberIds.length === 1) return "Jot something down";
    const otherIds = conv.memberIds.filter((id) => id !== currentUserId);
    const names = otherIds.map((id) => users[id]?.displayName.split(" ")[0]).join(", ");
    return `Message ${names}`;
  }, [placeholder, conv, threadParentId, agentId, users, currentUserId]);

  // Load draft into contenteditable when key changes. Intentionally only depends
  // on draftKey so typing doesn't re-apply the persisted HTML on every keystroke.
  // We also reset the suggestion machine here so a fresh conversation starts
  // clean — these state writes synchronize with the DOM mutation above.
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.innerHTML = draft?.html ?? "";
    setIsEmpty(!(inputRef.current.innerText.trim()));
    resetSuggestions();
    // If we just rehydrated a non-trivial draft (e.g. user reloaded with text
    // already typed), kick off the suggestion machine — `input` events don't
    // fire for programmatic innerHTML writes, so without this nudge the strip
    // would stay stuck at "idle" until the user typed another character.
    if (inputRef.current.innerText.trim().length > 0) {
      scheduleSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Persist draft as user types
  const persistDraft = () => {
    if (!inputRef.current) return;
    const html = inputRef.current.innerHTML;
    const text = inputRef.current.innerText;
    const empty = !text.trim();
    setIsEmpty(empty);
    if (empty) {
      clearDraft(draftKey);
    } else {
      setDraft(draftKey, { html, text });
    }
  };

  const hasContent = !!draft?.text?.trim();

  const insertAtCaret = (node: Node | string) => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      if (typeof node === "string") el.innerHTML += node;
      else el.appendChild(node);
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    if (typeof node === "string") {
      const temp = document.createElement("div");
      temp.innerHTML = node;
      const frag = document.createDocumentFragment();
      let lastNode: Node | null = null;
      while (temp.firstChild) {
        lastNode = temp.firstChild;
        frag.appendChild(temp.firstChild);
      }
      range.insertNode(frag);
      if (lastNode) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    } else {
      range.insertNode(node);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    persistDraft();
  };

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    persistDraft();
    inputRef.current?.focus();
  };

  const doSend = () => {
    if (!inputRef.current) return;
    const text = inputRef.current.innerText.trim();
    if (!text) return;
    if (agentId) {
      // If there's a proposal pending in this thread, treat the message as
      // an amendment to that proposal rather than a new question.
      const amended = amendAgentProposal(agentId, text);
      if (!amended) {
        askAgent(agentId, text, [
          "Got it — let me dig into that.\n\n",
          "I'll pull what I have on this and post back here.",
        ]);
      }
    } else {
      sendMessage(text, {
        html: inputRef.current.innerHTML,
        threadParentId,
      });
    }
    inputRef.current.innerHTML = "";
    setIsEmpty(true);
    clearDraft(draftKey);
    resetSuggestions();
  };

  /**
   * Append an @agent pill to the very end of the contenteditable. Used by the
   * suggestion hover card's "Add to chat" CTA.
   */
  const insertMentionAtEnd = (agent: AgentMeta) => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    // Make sure there's whitespace between the existing draft and the pill.
    const innerText = el.innerText;
    const needsSpace = innerText.length > 0 && !/\s$/.test(innerText);
    const html =
      (needsSpace ? "&nbsp;" : "") +
      `<span class="mention" data-user="${agent.id}">@${agent.displayName}</span>&nbsp;`;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const frag = document.createDocumentFragment();
    let lastNode: Node | null = null;
    while (temp.firstChild) {
      lastNode = temp.firstChild;
      frag.appendChild(temp.firstChild);
    }
    range.insertNode(frag);
    if (lastNode) {
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }
    persistDraft();
    // Don't auto-dismiss the whole strip — the caller decides whether to
    // remove just this agent (chip apply) or close the strip entirely.
    clearSuggestionTimers();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter sends, Shift+Enter newline
    if (e.key === "Enter" && !e.shiftKey && !trigger && !plusOpen) {
      e.preventDefault();
      doSend();
      return;
    }
    // Popover nav handled inside popovers via keydown listeners
    // Hotkeys
    const ck = e.metaKey || e.ctrlKey;
    if (ck && e.key.toLowerCase() === "b") {
      e.preventDefault();
      execCmd("bold");
    } else if (ck && e.key.toLowerCase() === "i") {
      e.preventDefault();
      execCmd("italic");
    } else if (ck && e.shiftKey && e.key.toLowerCase() === "x") {
      e.preventDefault();
      execCmd("strikeThrough");
    } else if (ck && e.shiftKey && e.key.toLowerCase() === "7") {
      e.preventDefault();
      execCmd("insertOrderedList");
    } else if (ck && e.shiftKey && e.key.toLowerCase() === "8") {
      e.preventDefault();
      execCmd("insertUnorderedList");
    } else if (ck && e.shiftKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      execCmd("formatBlock", "pre");
    }
  };

  /**
   * Schedule a debounced agent-suggestion pass. Behavior:
   *  - Truly empty draft → reset to idle so the next typing pass can
   *    re-suggest. This is the *only* way the dismissed state clears
   *    without a send: the user has to wipe the draft.
   *  - Below `SUGGEST_MIN_LENGTH` (but non-empty) → drop a stale "ready"
   *    set, but preserve "dismissed" so editing the draft doesn't
   *    accidentally un-dismiss.
   *  - With an @agent pill in the draft, treat as self-selected → dismissed.
   *    Removing the pill keeps the state dismissed (intentional: the user
   *    was given the chip and accepted it; we don't re-pitch).
   *  - User-dismissed via X stays dismissed until the draft is cleared/sent.
   *  - Otherwise after `SUGGEST_IDLE_MS` idle, recompute candidates.
   *    Chips are sticky: same-set is a no-op, swap replaces in place
   *    (no shimmer), empty-set keeps the current chips, and the very first
   *    reveal per draft triggers a one-shot shimmer.
   */
  const scheduleSuggestions = () => {
    clearIdleTimer();
    if (threadParentId || agentId) return;
    const el = inputRef.current;
    if (!el) return;
    const text = el.innerText.trim();
    if (text.length === 0) {
      // Fresh slate — clear everything including dismissed.
      if (
        suggestStateRef.current !== "idle" ||
        suggestedRef.current.length > 0
      ) {
        setSuggestState("idle");
        setSuggested([]);
        setShimmerOnReveal(false);
      }
      return;
    }
    if (text.length < SUGGEST_MIN_LENGTH) {
      // Drop stale ready chips; *preserve* dismissed.
      if (suggestStateRef.current === "ready") {
        setSuggestState("idle");
        setSuggested([]);
        setShimmerOnReveal(false);
      }
      return;
    }
    // Already has an agent pill — assume the user has self-selected.
    if (el.querySelector('span.mention[data-user^="_"]')) {
      if (
        suggestStateRef.current !== "dismissed" ||
        suggestedRef.current.length > 0
      ) {
        setSuggestState("dismissed");
        setSuggested([]);
      }
      return;
    }
    // User explicitly X'd out (or had a pill that's now removed) — stay
    // dismissed until the draft resets.
    if (suggestStateRef.current === "dismissed") return;

    idleTimer.current = window.setTimeout(() => {
      const draftEl = inputRef.current;
      if (!draftEl) return;
      const draftText = draftEl.innerText.trim();
      const candidates = suggestAgentsForDraft(draftText);
      const prev = suggestedRef.current;
      const nextKey = candidates.map((a) => a.id).sort().join(",");
      const prevKey = prev.map((a) => a.id).sort().join(",");
      if (nextKey === prevKey) return; // no change, no flash
      if (candidates.length === 0) return; // sticky: keep what's showing
      const isFirstReveal = prev.length === 0;
      setSuggested(candidates);
      setSuggestState("ready");
      if (isFirstReveal) {
        setShimmerOnReveal(true);
        shimmerTimer.current = window.setTimeout(
          () => setShimmerOnReveal(false),
          SUGGEST_SHIMMER_MS,
        );
      } else {
        setShimmerOnReveal(false);
      }
    }, SUGGEST_IDLE_MS);
  };

  // Detect trigger characters
  const handleInput = () => {
    persistDraft();
    scheduleSuggestions();
    const sel = window.getSelection();
    if (!sel || !sel.focusNode || !inputRef.current) {
      setTrigger(null);
      return;
    }
    const node = sel.focusNode;
    if (!inputRef.current.contains(node)) {
      setTrigger(null);
      return;
    }
    const textBeforeCaret = getTextBeforeCaret(inputRef.current);
    // Match trailing trigger token
    const match = textBeforeCaret.match(/(?:^|\s)([@#/:])([\w\-+]*)$/);
    if (!match) {
      setTrigger(null);
      return;
    }
    const [, symbol, query] = match;
    const kind =
      symbol === "@"
        ? "mention"
        : symbol === "#"
          ? "channel"
          : symbol === "/"
            ? "slash"
            : "emoji";
    const range = sel.getRangeAt(0).cloneRange();
    const rects = range.getClientRects();
    const rect = rects.length
      ? rects[rects.length - 1]
      : inputRef.current.getBoundingClientRect();
    setTrigger({ kind: kind as TriggerKind, query, rect });
  };

  const commitTrigger = (insertHtml: string) => {
    const el = inputRef.current;
    if (!el || !trigger) return;

    const buildFragment = (html: string) => {
      const temp = document.createElement("div");
      temp.innerHTML = html + "&nbsp;";
      const frag = document.createDocumentFragment();
      let lastNode: Node | null = null;
      while (temp.firstChild) {
        lastNode = temp.firstChild;
        frag.appendChild(temp.firstChild);
      }
      return { frag, lastNode };
    };

    const sel = window.getSelection();
    const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    const selInsideInput =
      !!range && el.contains(range.startContainer);

    if (range && selInsideInput) {
      // Preferred path: expand backwards over the trigger match and replace.
      const node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        const pre = (node.nodeValue ?? "").slice(0, range.startOffset);
        const m = pre.match(/[@#/:][\w\-+]*$/);
        if (m) {
          range.setStart(node, range.startOffset - m[0].length);
        }
      }
      range.deleteContents();
      const { frag, lastNode } = buildFragment(insertHtml);
      range.insertNode(frag);
      if (lastNode && sel) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    } else {
      // Fallback: selection was lost (e.g. user clicked a picker row). Walk
      // the input's text nodes, find the last trigger token, and replace it
      // in place.
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let lastHit: { node: Text; index: number; length: number } | null = null;
      let cur: Node | null;
      while ((cur = walker.nextNode())) {
        const t = cur as Text;
        const txt = t.nodeValue ?? "";
        const re = /[@#/:][\w\-+]*/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(txt))) {
          lastHit = { node: t, index: m.index, length: m[0].length };
        }
      }
      const replaceRange = document.createRange();
      if (lastHit) {
        replaceRange.setStart(lastHit.node, lastHit.index);
        replaceRange.setEnd(lastHit.node, lastHit.index + lastHit.length);
        replaceRange.deleteContents();
      } else {
        // No trigger token left — just append at the end.
        replaceRange.selectNodeContents(el);
        replaceRange.collapse(false);
      }
      const { frag, lastNode } = buildFragment(insertHtml);
      replaceRange.insertNode(frag);
      if (lastNode) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        const s = window.getSelection();
        if (s) {
          s.removeAllRanges();
          s.addRange(newRange);
        }
      }
    }

    setTrigger(null);
    persistDraft();
    el.focus();
  };

  // The suggestion strip is the same component in both placements; only its
  // wrapper and `placement` prop change. We render it in either the footer
  // (inline) or above the input (above-input), based on the active variant.
  const suggestionStripEnabled = !threadParentId && !agentId;
  const renderSuggestionStrip = (placement: "inline" | "above-input") => (
    <SuggestionStrip
      state={suggestState}
      agents={suggested}
      shimmer={shimmerOnReveal}
      placement={placement}
      onApply={(a) => {
        insertMentionAtEnd(a);
        setSuggested((prev) => prev.filter((x) => x.id !== a.id));
      }}
      onDismiss={(a) => {
        setSuggested((prev) => {
          const next = prev.filter((x) => x.id !== a.id);
          if (next.length === 0) setSuggestState("dismissed");
          return next;
        });
      }}
      onMessageAgent={(a) => {
        openAgent(a.id);
      }}
    />
  );

  return (
    <div className="p-5">
      {/* Above-input suggestion variant: pills float in the gutter ABOVE
          the composer card itself, not inside it. That gives the chips a
          true "hovering above the search" feel rather than reading as a
          band attached to the top of the input. */}
      {suggestionStripEnabled &&
        suggestionPlacement === "above-input" &&
        suggestState === "ready" &&
        suggested.length > 0 && (
          <div className="mb-2">
            {renderSuggestionStrip("above-input")}
          </div>
        )}
      <div
        className={clsx(
          "relative flex flex-col rounded-lg border border-slack-border-strong bg-white",
          "focus-within:border-slack-text-muted focus-within:shadow-sm",
        )}
      >
        {showToolbar && (
          <FormattingToolbar exec={execCmd} onToggle={() => setShowToolbar(false)} />
        )}

        <div
          ref={inputRef}
          className="composer-input max-h-[50vh] min-h-[38px] overflow-y-auto px-3 py-2 text-[15px] leading-[1.46]"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={computedPlaceholder}
          data-empty={isEmpty || undefined}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={persistDraft}
        />

        {/* Footer */}
        <div className="flex items-center gap-0.5 px-1.5 py-1">
          <div className="relative">
            <button
              onClick={() => setPlusOpen((v) => !v)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(29,28,29,0.06)] text-slack-text-muted hover:bg-[rgba(29,28,29,0.12)]"
              title="Add"
            >
              <Plus size={14} />
            </button>
            {plusOpen && <PlusMenu onClose={() => setPlusOpen(false)} />}
          </div>
          <div className="ml-1 flex items-center gap-0.5">
            <button
              onClick={() => setShowToolbar((v) => !v)}
              className={clsx(
                "rounded p-1.5 text-slack-text-muted hover:bg-slack-pane-hover",
                showToolbar && "bg-slack-pane-hover",
              )}
              title={showToolbar ? "Hide formatting" : "Show formatting"}
            >
              <Type size={15} />
            </button>
            <div className="relative">
              <button
                onClick={() => setEmojiOpen((v) => !v)}
                className="rounded p-1.5 text-slack-text-muted hover:bg-slack-pane-hover"
                title="Emoji"
              >
                <Smile size={15} />
              </button>
              {emojiOpen && (
                <EmojiPicker
                  anchor="bottom"
                  onPick={(e) => {
                    insertAtCaret(e);
                    setEmojiOpen(false);
                  }}
                  onClose={() => setEmojiOpen(false)}
                />
              )}
            </div>
            <button
              onClick={() => {
                insertAtCaret("@");
                handleInput();
              }}
              className="rounded p-1.5 text-slack-text-muted hover:bg-slack-pane-hover"
              title="Mention someone"
            >
              <AtSign size={15} />
            </button>
            <button
              onClick={() => insertAtCaret("/")}
              className="rounded p-1.5 text-slack-text-muted hover:bg-slack-pane-hover"
              title="Shortcuts"
            >
              <SquareSlash size={16} />
            </button>
          </div>

          {suggestionStripEnabled && suggestionPlacement === "inline" && (
            <div className="ml-2 flex min-w-0 flex-1 items-center">
              {renderSuggestionStrip("inline")}
            </div>
          )}

          <div className="ml-auto flex items-center">
            <button
              disabled={!hasContent}
              onClick={doSend}
              className={clsx(
                "flex h-7 items-center rounded-l px-2 text-[13px] font-bold transition-colors",
                hasContent
                  ? "bg-[#007a5a] text-white hover:bg-[#148567]"
                  : "text-slack-text-muted hover:bg-slack-pane-hover",
              )}
              title="Send now"
            >
              <Send size={14} />
            </button>
            <div
              className={clsx(
                "h-5 w-px",
                hasContent ? "bg-white/30" : "bg-slack-border",
              )}
            />
            <button
              disabled={!hasContent}
              className={clsx(
                "flex h-7 items-center rounded-r px-1 text-[13px] font-bold transition-colors",
                hasContent
                  ? "bg-[#007a5a] text-white hover:bg-[#148567]"
                  : "text-slack-text-muted hover:bg-slack-pane-hover",
              )}
              title="More send options"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Popovers */}
      {trigger?.kind === "mention" && (
        <MentionPicker
          query={trigger.query}
          rect={trigger.rect}
          onPick={(user) =>
            commitTrigger(
              `<span class="mention" data-user="${user.id}">@${user.displayName}</span>`,
            )
          }
          onClose={() => setTrigger(null)}
        />
      )}
      {trigger?.kind === "channel" && (
        <ChannelPicker
          query={trigger.query}
          rect={trigger.rect}
          onPick={(c) =>
            commitTrigger(
              `<span class="channel-ref" data-channel="${c.id}">#${c.name}</span>`,
            )
          }
          onClose={() => setTrigger(null)}
        />
      )}
      {trigger?.kind === "slash" && (
        <SlashMenu
          query={trigger.query}
          rect={trigger.rect}
          onPick={(cmd) => commitTrigger(`<span>${cmd}</span>`)}
          onClose={() => setTrigger(null)}
        />
      )}
      {trigger?.kind === "emoji" && (
        <EmojiPicker
          inline
          query={trigger.query}
          rect={trigger.rect}
          onPick={(e) => commitTrigger(e)}
          onClose={() => setTrigger(null)}
        />
      )}
    </div>
  );
}

function FormattingToolbar({
  exec,
  onToggle,
}: {
  exec: (cmd: string, val?: string) => void;
  onToggle: () => void;
}) {
  const btn =
    "flex h-7 w-7 items-center justify-center rounded text-slack-text-muted hover:bg-slack-pane-hover";
  return (
    <div className="flex items-center gap-0.5 border-b border-slack-border px-1.5 py-1">
      <button className={btn} title="Bold ⌘B" onClick={() => exec("bold")}>
        <Bold size={14} strokeWidth={2.4} />
      </button>
      <button className={btn} title="Italic ⌘I" onClick={() => exec("italic")}>
        <Italic size={14} strokeWidth={2.4} />
      </button>
      <button className={btn} title="Strike ⌘⇧X" onClick={() => exec("strikeThrough")}>
        <Strikethrough size={14} strokeWidth={2.4} />
      </button>
      <div className="mx-0.5 h-4 w-px bg-slack-border" />
      <button
        className={btn}
        title="Link ⌘⇧U"
        onClick={() => {
          const url = prompt("Link URL");
          if (url) exec("createLink", url);
        }}
      >
        <Link2 size={14} strokeWidth={2.4} />
      </button>
      <div className="mx-0.5 h-4 w-px bg-slack-border" />
      <button
        className={btn}
        title="Bulleted list ⌘⇧8"
        onClick={() => exec("insertUnorderedList")}
      >
        <List size={14} strokeWidth={2.4} />
      </button>
      <button
        className={btn}
        title="Ordered list ⌘⇧7"
        onClick={() => exec("insertOrderedList")}
      >
        <ListOrdered size={14} strokeWidth={2.4} />
      </button>
      <button
        className={btn}
        title="Quote"
        onClick={() => exec("formatBlock", "blockquote")}
      >
        <Quote size={14} strokeWidth={2.4} />
      </button>
      <div className="mx-0.5 h-4 w-px bg-slack-border" />
      <button
        className={btn}
        title="Inline code"
        onClick={() => {
          document.execCommand("insertHTML", false, "<code>code</code>&nbsp;");
        }}
      >
        <Code size={14} strokeWidth={2.4} />
      </button>
      <button
        className={btn}
        title="Code block ⌘⇧C"
        onClick={() => exec("formatBlock", "pre")}
      >
        <Code2 size={14} strokeWidth={2.4} />
      </button>
      <button
        className={clsx(btn, "ml-auto")}
        title="Hide formatting"
        onClick={onToggle}
      >
        <Type size={14} />
      </button>
    </div>
  );
}

function getTextBeforeCaret(root: HTMLElement): string {
  const sel = window.getSelection();
  if (!sel || !sel.focusNode) return "";
  const range = document.createRange();
  range.selectNodeContents(root);
  try {
    range.setEnd(sel.focusNode, sel.focusOffset);
  } catch {
    return "";
  }
  return range.toString();
}
