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

/** Walk the composer's contentEditable DOM and produce a Slack-mrkdwn-flavored
 *  text payload. We mostly mirror `innerText`, but anchors that the user
 *  created via paste-onto-selection get serialized as `<url|label>` so the
 *  link survives through the wire format. (The mention/channel pills are
 *  already represented as text via the @handle / #name characters they hold.)
 */
function serializeComposerToMrkdwn(root: HTMLElement): string {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") return "\n";
    if (tag === "a" && el.hasAttribute("data-composer-link")) {
      const href = (el as HTMLAnchorElement).getAttribute("href") ?? "";
      const label = el.textContent ?? "";
      if (href && label) return `<${href}|${label}>`;
      return label;
    }
    let acc = "";
    for (const child of Array.from(el.childNodes)) acc += walk(child);
    // Block-ish elements should add a trailing newline so paragraphs from
    // Shift+Enter end up as separate lines.
    if (tag === "div" || tag === "p") acc += "\n";
    return acc;
  };
  let out = "";
  for (const child of Array.from(root.childNodes)) out += walk(child);
  return out.replace(/\n+$/g, "");
}

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
  const agentSetupComplete = useSlackStore((s) => s.agentSetupComplete);
  const postPreflightEphemeral = useSlackStore((s) => s.postPreflightEphemeral);
  const drafts = useSlackStore((s) => s.drafts);
  const setDraft = useSlackStore((s) => s.setDraft);
  const clearDraft = useSlackStore((s) => s.clearDraft);
  // For thread composers we seed suggestions from the parent message so
  // chips appear the moment the thread opens — no typing required.
  const parentMessageText = useSlackStore((s) =>
    threadParentId ? s.messages[threadParentId]?.text ?? "" : "",
  );
  const dismissedThreads = useSlackStore((s) => s.dismissedThreads);
  const dismissThreadSuggestions = useSlackStore(
    (s) => s.dismissThreadSuggestions,
  );
  const threadDismissed = !!threadParentId && !!dismissedThreads[threadParentId];

  const allMessages = useSlackStore((s) => s.messages);
  const allUsers = useSlackStore((s) => s.users);
  const agentThreads = useSlackStore((s) => s.agentThreads);
  // Agents the user has already interacted with — either a public reply in
  // any channel/thread, OR a private reply in the side-pane DM (which lives
  // in `agentThreads`, not `messages`). Once the user has seen what an agent
  // can do, the suggestion strip stops re-pitching it. Discovery is one-shot:
  // pre-introduction we lean in, post-introduction we step back.
  const establishedAgentIds = useMemo(() => {
    const ids: Record<string, true> = {};
    // Public messages anywhere — channel messages, thread replies. Scope is
    // intentionally not constrained to the active channel so an agent the
    // user has already met in #other-room doesn't get pitched here either.
    for (const m of Object.values(allMessages)) {
      if (m.ephemeralFor) continue;
      const author = allUsers[m.authorId];
      if (author?.isAgent) ids[m.authorId] = true;
    }
    // Private agent-pane DMs: any thread that contains at least one
    // agent-authored message counts as an introduction.
    for (const [agentId, thread] of Object.entries(agentThreads)) {
      if (thread?.some((m) => m.role === "agent" && m.text.length > 0)) {
        ids[agentId] = true;
      }
    }
    return ids;
  }, [allMessages, allUsers, agentThreads]);
  const establishedAgentIdsRef = useRef(establishedAgentIds);
  useEffect(() => {
    establishedAgentIdsRef.current = establishedAgentIds;
    // If an agent just established itself (e.g., posted a thread reply
    // while the user was typing), drop any currently-shown chip for that
    // agent on the next tick. We re-filter the live `suggested` list
    // directly here rather than going through `scheduleSuggestions` to
    // avoid replaying the whole debounce cycle.
    setSuggested((prev) => {
      const next = prev.filter((a) => !establishedAgentIds[a.id]);
      return next.length === prev.length ? prev : next;
    });
  }, [establishedAgentIds]);

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
  // Index of the suggestion chip the user has navigated to via the keyboard.
  // null = caret is in the input (default). Number = chip is "focused" and
  // Enter applies it, ←/→ cycle, Esc/↓ returns focus to the input. Press
  // ↑ from the input to enter this mode (spatial: the strip lives above
  // the input, so up-arrow is the natural reach).
  const [activePillIndex, setActivePillIndex] = useState<number | null>(null);
  const idleTimer = useRef<number | null>(null);
  const shimmerTimer = useRef<number | null>(null);
  // Refs mirror the sticky state so the debounced callback can read the
  // latest values without depending on stale closures.
  const suggestedRef = useRef<AgentMeta[]>([]);
  const suggestStateRef = useRef<SuggestionState>("idle");
  // Tracks whether an @agent mention has *ever* been present in the current
  // thread draft. If it was added and later removed, that "added then
  // deleted" gesture counts as an explicit dismissal — flip the thread into
  // permanently-dismissed so future visits don't re-suggest.
  const hadMentionRef = useRef(false);
  useEffect(() => {
    suggestedRef.current = suggested;
    // Keep keyboard focus index in bounds. If the user dismissed a chip while
    // it was the active one, fall back to the previous chip; if the strip
    // emptied entirely, drop out of pill-nav mode.
    setActivePillIndex((idx) => {
      if (idx === null) return null;
      if (suggested.length === 0) return null;
      return Math.min(idx, suggested.length - 1);
    });
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
    setActivePillIndex(null);
    // Re-derive "had mention" from the freshly hydrated draft DOM so a
    // remount on an existing draft (e.g. switching threads back-and-forth)
    // doesn't lose the engagement signal.
    hadMentionRef.current = !!inputRef.current?.querySelector(
      'span.mention[data-user^="_"]',
    );
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

  // External rehydrate signal: the Edit button on a preflight ephemeral
  // pushes the draft back into the store and bumps this nonce so the
  // composer reloads the draft DOM even though `draftKey` didn't change.
  const rehydrateNonce = useSlackStore(
    (s) => s.draftRehydrateNonce[draftKey] ?? 0,
  );

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
      // Move caret to the end of the rehydrated draft so the user can keep
      // typing immediately. Otherwise the caret defaults to the start of
      // the contenteditable, which is confusing after an Edit-from-preflight.
      inputRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(inputRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else if (threadParentId && parentMessageText.length > 0) {
      // Thread just opened with an empty reply draft — seed suggestions from
      // the parent message so the user sees relevant agents already waiting.
      // `immediate` skips the typing-debounce so chips are visible the
      // instant the pane mounts.
      scheduleSuggestions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, rehydrateNonce]);

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
    const text = serializeComposerToMrkdwn(inputRef.current).trim();
    if (!text) return;
    const html = inputRef.current.innerHTML;

    // Public-channel preflight: if Jordan is about to send a message that
    // @-mentions an agent they haven't connected to their account yet, we
    // intercept here and post a Slackbot-style ephemeral instead. The agent
    // pane DM (`agentId`) skips this — that flow has its own setup screen.
    if (!agentId) {
      const mentionedAgentIds = readMentionedAgentIds(inputRef.current);
      const unconnected = mentionedAgentIds.filter(
        (id) => !agentSetupComplete[id],
      );
      if (unconnected.length > 0) {
        postPreflightEphemeral({
          text,
          html,
          unconnectedAgentIds: unconnected,
          threadParentId,
        });
        inputRef.current.innerHTML = "";
        setIsEmpty(true);
        clearDraft(draftKey);
        resetSuggestions();
        return;
      }
    }

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
      sendMessage(text, { html, threadParentId });
    }
    inputRef.current.innerHTML = "";
    setIsEmpty(true);
    clearDraft(draftKey);
    resetSuggestions();
  };

  /** Read all `@agent` mention pills currently in the composer DOM. We rely
   *  on the `data-user="_xxx"` attribute we stamp onto mention spans (agent
   *  ids start with `_`). Used by the preflight check on Send. */
  const readMentionedAgentIds = (root: HTMLElement): string[] => {
    const ids: string[] = [];
    root
      .querySelectorAll<HTMLElement>('span.mention[data-user^="_"]')
      .forEach((el) => {
        const id = el.getAttribute("data-user");
        if (id && !ids.includes(id)) ids.push(id);
      });
    return ids;
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
    const draftIsEmpty = innerText.trim().length === 0;
    const needsSpace = innerText.length > 0 && !/\s$/.test(innerText);
    // When the draft is empty AND we're seeded by a thread context, prefill
    // a short agent-flavored question so a single click → sendable message.
    // If the user has already typed something, we never overwrite it — just
    // append the @mention as before.
    const prefill = draftIsEmpty && !!threadParentId ? agent.threadPrompt : "";
    const html =
      (needsSpace ? "&nbsp;" : "") +
      `<span class="mention" data-user="${agent.id}">@${agent.displayName}</span>&nbsp;` +
      (prefill ? prefill : "");
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
    // `range.insertNode` doesn't fire React's onInput, so the next call to
    // `scheduleSuggestions` (when the user types/deletes) would otherwise
    // see `hadMentionRef.current === false` and miss the "added it then
    // deleted it" path. Mark it explicitly here so deleting the freshly
    // inserted pill text persists the dismissal for this thread.
    hadMentionRef.current = true;
    persistDraft();
    // Don't auto-dismiss the whole strip — the caller decides whether to
    // remove just this agent (chip apply) or close the strip entirely.
    clearSuggestionTimers();
  };

  /** Custom paste:
   *  1. Force plain text — the native contentEditable paste drags in source
   *     HTML (fonts, colors, link wrappers from Docs/Slack/etc.) which breaks
   *     our mention plumbing.
   *  2. Special-case "pasting a URL onto selected text" → wrap the selection
   *     as a link, matching Slack's behavior. Without this, `insertText`
   *     would just replace the selected text with the URL. */
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    const trimmed = text.trim();
    const isUrl = /^https?:\/\/\S+$/i.test(trimmed);
    const sel = window.getSelection();
    const hasSelection =
      !!sel && sel.rangeCount > 0 && sel.toString().length > 0;
    if (isUrl && hasSelection) {
      // execCommand("createLink") wraps the current selection in an
      // <a href="url">. We stamp a class so the serializer on send can find
      // these and convert them to Slack mrkdwn `<url|label>` syntax.
      document.execCommand("createLink", false, trimmed);
      // Tag the freshly-created anchor(s) so doSend can find them and so we
      // can style them like links inside the input.
      const root = inputRef.current;
      if (root) {
        root.querySelectorAll("a:not([data-composer-link])").forEach((a) => {
          (a as HTMLAnchorElement).setAttribute("data-composer-link", "true");
          (a as HTMLAnchorElement).setAttribute("target", "_blank");
          (a as HTMLAnchorElement).setAttribute("rel", "noreferrer");
        });
        root.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }
    if (typeof document.execCommand === "function") {
      document.execCommand("insertText", false, text);
      return;
    }
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    if (inputRef.current) {
      inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Suggestion-strip keyboard navigation. Pills sit visually above the
    // input, so ↑ is the natural way to "reach" them from inside the field.
    // Once a pill is keyboard-focused, ←/→ cycle, Enter applies, Esc/↓
    // returns to the input. We deliberately *don't* claim Tab — Tab feels
    // wrong here (the strip isn't downstream in tab order, it's overhead).
    const stripVisible =
      !agentId && suggestState === "ready" && suggested.length > 0;
    if (activePillIndex !== null && stripVisible) {
      if (e.key === "Enter") {
        e.preventDefault();
        const agent = suggested[activePillIndex];
        if (agent) {
          insertMentionAtEnd(agent);
          setSuggested((prev) => prev.filter((x) => x.id !== agent.id));
        }
        setActivePillIndex(null);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActivePillIndex((i) =>
          i === null ? 0 : Math.min(i + 1, suggested.length - 1),
        );
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActivePillIndex((i) => (i === null ? 0 : Math.max(i - 1, 0)));
        return;
      }
      if (e.key === "Escape" || e.key === "ArrowDown") {
        e.preventDefault();
        setActivePillIndex(null);
        return;
      }
      // Any printable key: drop out of pill nav and let the input handle it
      // normally. (Don't preventDefault — we want the keystroke to land.)
      if (e.key.length === 1) {
        setActivePillIndex(null);
      }
    } else if (e.key === "ArrowUp" && stripVisible) {
      // Only steal ↑ when the caret is on the first line of the draft.
      // Otherwise ↑ should still navigate within multi-line content.
      const before = inputRef.current
        ? getTextBeforeCaret(inputRef.current)
        : "";
      if (!before.includes("\n")) {
        e.preventDefault();
        setActivePillIndex(0);
        return;
      }
    }
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
  const scheduleSuggestions = (immediate = false) => {
    clearIdleTimer();
    // Agent pane has its own discovery flow (suggested actions on the agent
    // intro screen) — never run heuristic chips there.
    if (agentId) return;
    const el = inputRef.current;
    if (!el) return;
    // Persisted dismissal for this thread (closed a chip or added-then-
    // deleted an @mention earlier). Short-circuit before any work so the
    // strip never appears for the rest of the session.
    if (threadParentId && dismissedThreads[threadParentId]) {
      if (
        suggestStateRef.current !== "dismissed" ||
        suggestedRef.current.length > 0
      ) {
        setSuggestState("dismissed");
        setSuggested([]);
      }
      return;
    }
    const draftText = el.innerText.trim();
    // In thread mode, fall back to the parent message text so suggestions
    // surface as soon as the thread opens, without requiring the user to
    // re-type the context that's already sitting right above the composer.
    const sourceText =
      draftText.length > 0
        ? draftText
        : threadParentId
          ? parentMessageText
          : "";
    if (sourceText.length === 0) {
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
    if (sourceText.length < SUGGEST_MIN_LENGTH) {
      // Drop stale ready chips; *preserve* dismissed.
      if (suggestStateRef.current === "ready") {
        setSuggestState("idle");
        setSuggested([]);
        setShimmerOnReveal(false);
      }
      return;
    }
    // Find every agent currently @mentioned in the draft. Used for two
    // things: (a) immediately drop the matching chip from the strip if
    // the user manually @-typed an agent that was being suggested — they
    // already addressed it, no reason to keep pitching it. (b) feed the
    // thread "added-then-deleted" persistence path below.
    const mentionedAgentIds = new Set<string>();
    el.querySelectorAll('span.mention[data-user^="_"]').forEach((node) => {
      const id = node.getAttribute("data-user");
      if (id) mentionedAgentIds.add(id);
    });
    if (mentionedAgentIds.size > 0) hadMentionRef.current = true;
    // The "added it then deleted it" case: an @mention was present at some
    // point and isn't anymore. That's an explicit dismissal — persist it
    // so reopening this thread (or wiping and retyping the draft) won't
    // resurrect the strip.
    if (
      hadMentionRef.current &&
      mentionedAgentIds.size === 0 &&
      threadParentId
    ) {
      dismissThreadSuggestions(threadParentId);
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
    // Drop any currently-shown chip whose agent the user just @-mentioned
    // themselves, OR whose agent has already established itself in this
    // conversation by replying somewhere above. Done synchronously here so
    // the chip disappears the same tick its disqualifier lands, not after
    // the suggestion debounce.
    const established = establishedAgentIdsRef.current;
    if (
      (mentionedAgentIds.size > 0 || Object.keys(established).length > 0) &&
      suggestedRef.current.length > 0
    ) {
      const filtered = suggestedRef.current.filter(
        (a) => !mentionedAgentIds.has(a.id) && !established[a.id],
      );
      if (filtered.length !== suggestedRef.current.length) {
        setSuggested(filtered);
        if (filtered.length === 0) {
          setSuggestState("dismissed");
          return;
        }
      }
    }

    const evaluate = () => {
      const draftEl = inputRef.current;
      if (!draftEl) return;
      const liveDraft = draftEl.innerText.trim();
      const seedingFromParent =
        liveDraft.length === 0 && !!threadParentId && parentMessageText.length > 0;
      const liveSource = seedingFromParent ? parentMessageText : liveDraft;
      // Re-read mentioned agents at evaluation time — the user may have
      // typed/deleted between scheduling and firing.
      const liveMentionedIds = new Set<string>();
      draftEl.querySelectorAll('span.mention[data-user^="_"]').forEach((node) => {
        const id = node.getAttribute("data-user");
        if (id) liveMentionedIds.add(id);
      });
      // When seeding from the thread parent we relax the trigger bar to 1.
      // Threads are an opt-in surface (the user opened it intentionally) and
      // the heuristic is less likely to land 2 hits on a passive context
      // sentence than on a freshly-typed action sentence.
      const established = establishedAgentIdsRef.current;
      const candidates = suggestAgentsForDraft(liveSource, {
        minScore: seedingFromParent ? 1 : 2,
      }).filter((a) => !liveMentionedIds.has(a.id) && !established[a.id]);
      const prev = suggestedRef.current;
      const nextKey = candidates.map((a) => a.id).sort().join(",");
      const prevKey = prev.map((a) => a.id).sort().join(",");
      if (nextKey === prevKey) return; // no change, no flash
      if (candidates.length === 0) {
        // No qualifying matches. Sticky-preserve only if the previously
        // shown chips are *still candidates the engine would surface* —
        // that protects against flicker when the user is mid-typing and
        // briefly drops below the score threshold. If the previous chips
        // include an agent the engine no longer surfaces (e.g. it's now
        // established in the channel, or the draft has shifted toward a
        // single-agent answer), let the strip clear instead of holding
        // onto stale matches.
        const prevStillValid = prev.every(
          (a) =>
            !established[a.id] &&
            !liveMentionedIds.has(a.id) &&
            suggestAgentsForDraft(liveSource, {
              minScore: seedingFromParent ? 1 : 2,
            }).some((c) => c.id === a.id),
        );
        if (prevStillValid) return;
        setSuggested([]);
        return;
      }
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
    };

    if (immediate) {
      // Used for thread-open seeding: pills should be already there when the
      // pane mounts, not appear after a beat.
      evaluate();
    } else {
      idleTimer.current = window.setTimeout(evaluate, SUGGEST_IDLE_MS);
    }
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
  // The agent pane has its own discovery surface, so never show the strip
  // there. Channel and thread composers both opt in.
  const suggestionStripEnabled = !agentId;
  const renderSuggestionStrip = (placement: "inline" | "above-input") => (
    <SuggestionStrip
      state={suggestState}
      agents={suggested}
      shimmer={shimmerOnReveal}
      placement={placement}
      // Thread chips are seeded from the parent message at mount and should
      // appear *with* the pane, not animate in afterward. Channel composers
      // keep the fade-up beat that pairs with the typing pause.
      animateEntrance={!threadParentId}
      activeIndex={activePillIndex}
      onApply={(a) => {
        insertMentionAtEnd(a);
        setSuggested((prev) => prev.filter((x) => x.id !== a.id));
        setActivePillIndex(null);
      }}
      onDismiss={(a) => {
        setSuggested((prev) => {
          const next = prev.filter((x) => x.id !== a.id);
          if (next.length === 0) {
            setSuggestState("dismissed");
            // Closing the last chip in a thread is the user telling us
            // "not for this message" — persist so reopening doesn't bring
            // pills back.
            if (threadParentId) dismissThreadSuggestions(threadParentId);
          }
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
      <div
        className={clsx(
          "relative flex flex-col rounded-lg border border-slack-border-strong bg-white",
          "focus-within:border-slack-text-muted focus-within:shadow-sm",
        )}
      >
        {/* Above-input suggestion variant: pills float in the gutter ABOVE
            the composer card. We position them absolutely so toggling the
            strip doesn't change the composer's measured height — otherwise
            the message list above re-flows / scrolls every time chips
            appear or disappear. They're allowed to overlap the message
            list visually since they're a transient hint. */}
        {suggestionStripEnabled &&
          suggestionPlacement === "above-input" &&
          suggestState === "ready" &&
          suggested.length > 0 && (
            <div className="pointer-events-none absolute bottom-full left-0 right-0 mb-2 flex">
              <div className="pointer-events-auto">
                {renderSuggestionStrip("above-input")}
              </div>
            </div>
          )}
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
          onPaste={handlePaste}
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
