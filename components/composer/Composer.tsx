"use client";

import clsx from "clsx";
import {
  AtSign,
  Bold,
  Italic,
  Strikethrough,
  Link2,
  Code,
  Code2,
  Quote,
  List,
  ListOrdered,
  Mic,
  Plus,
  Send,
  Smile,
  Video,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSlackStore } from "@/lib/store";
import { MentionPicker } from "./MentionPicker";
import { ChannelPicker } from "./ChannelPicker";
import { SlashMenu } from "./SlashMenu";
import { EmojiPicker } from "./EmojiPicker";
import { PlusMenu } from "./PlusMenu";

type TriggerKind = "mention" | "channel" | "slash" | "emoji";
interface TriggerState {
  kind: TriggerKind;
  query: string;
  rect: DOMRect;
}
type Trigger = TriggerState | null;

interface Props {
  threadParentId?: string;
  placeholder?: string;
}

export function Composer({ threadParentId, placeholder }: Props) {
  const convId = useSlackStore((s) => s.activeConversationId);
  const conv = useSlackStore((s) => s.conversations[convId]);
  const users = useSlackStore((s) => s.users);
  const currentUserId = useSlackStore((s) => s.currentUserId);
  const sendMessage = useSlackStore((s) => s.sendMessage);
  const drafts = useSlackStore((s) => s.drafts);
  const setDraft = useSlackStore((s) => s.setDraft);
  const clearDraft = useSlackStore((s) => s.clearDraft);

  const draftKey = threadParentId ? "thread" : convId;
  const draft = drafts[draftKey];

  const [showToolbar, setShowToolbar] = useState(true);
  const [trigger, setTrigger] = useState<Trigger>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);

  const computedPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    if (!conv) return "Message";
    if (threadParentId) return "Reply…";
    if (conv.kind === "channel") return `Message #${conv.name}`;
    if (conv.kind === "dm" && conv.memberIds.length === 1) return "Jot something down";
    const otherIds = conv.memberIds.filter((id) => id !== currentUserId);
    const names = otherIds.map((id) => users[id]?.displayName.split(" ")[0]).join(", ");
    return `Message ${names}`;
  }, [placeholder, conv, threadParentId, users, currentUserId]);

  // Load draft into contenteditable when key changes. Intentionally only depends
  // on draftKey so typing doesn't re-apply the persisted HTML on every keystroke.
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.innerHTML = draft?.html ?? "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Persist draft as user types
  const persistDraft = () => {
    if (!inputRef.current) return;
    const html = inputRef.current.innerHTML;
    const text = inputRef.current.innerText;
    if (!text.trim() && !html) {
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
    sendMessage(text, {
      html: inputRef.current.innerHTML,
      threadParentId,
    });
    inputRef.current.innerHTML = "";
    clearDraft(draftKey);
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

  // Detect trigger characters
  const handleInput = () => {
    persistDraft();
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
    // Remove trigger + query text before caret
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    // Expand range backwards over the trigger match
    const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      const pre = (node.nodeValue ?? "").slice(0, range.startOffset);
      const m = pre.match(/[@#/:][\w\-+]*$/);
      if (m) {
        range.setStart(node, range.startOffset - m[0].length);
      }
    }
    range.deleteContents();
    // Insert HTML
    const temp = document.createElement("div");
    temp.innerHTML = insertHtml + "&nbsp;";
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
    setTrigger(null);
    persistDraft();
    el.focus();
  };

  return (
    <div className="px-5 pb-5">
      <div
        className={clsx(
          "relative flex flex-col overflow-hidden rounded-lg border border-slack-border-strong bg-white",
          "focus-within:border-slack-text-muted focus-within:shadow-sm",
        )}
      >
        {showToolbar && (
          <FormattingToolbar exec={execCmd} onToggle={() => setShowToolbar(false)} />
        )}

        <div
          ref={inputRef}
          className="composer-input max-h-[50vh] min-h-[22px] overflow-y-auto px-3 py-2 text-[15px] leading-[1.46]"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={computedPlaceholder}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={persistDraft}
        />

        {/* Footer */}
        <div className="flex items-center gap-0.5 px-1.5 py-1">
          {!showToolbar && (
            <button
              onClick={() => setShowToolbar(true)}
              className="rounded p-1.5 text-slack-text-muted hover:bg-slack-pane-hover"
              title="Show formatting"
            >
              <Type size={16} />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setPlusOpen((v) => !v)}
              className="rounded p-1.5 text-slack-text-muted hover:bg-slack-pane-hover"
              title="Add"
            >
              <Plus size={18} />
            </button>
            {plusOpen && (
              <PlusMenu onClose={() => setPlusOpen(false)} />
            )}
          </div>
          <div className="mx-0.5 h-5 w-px bg-slack-border" />
          <button
            onClick={() => insertAtCaret("/")}
            className="rounded p-1.5 text-slack-text-muted hover:bg-slack-pane-hover"
            title="Shortcuts"
          >
            <Code2 size={16} />
          </button>
          <button
            onClick={() => insertAtCaret("@")}
            className="rounded p-1.5 text-slack-text-muted hover:bg-slack-pane-hover"
            title="Mention someone"
          >
            <AtSign size={16} />
          </button>
          <div className="relative">
            <button
              onClick={() => setEmojiOpen((v) => !v)}
              className="rounded p-1.5 text-slack-text-muted hover:bg-slack-pane-hover"
              title="Emoji"
            >
              <Smile size={16} />
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
            className="rounded p-1.5 text-slack-text-muted hover:bg-slack-pane-hover"
            title="Record video"
          >
            <Video size={16} />
          </button>
          <button
            className="rounded p-1.5 text-slack-text-muted hover:bg-slack-pane-hover"
            title="Record audio"
          >
            <Mic size={16} />
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button
              disabled={!hasContent}
              onClick={doSend}
              className={clsx(
                "flex h-7 items-center gap-1 rounded px-2 text-[13px] font-bold",
                hasContent
                  ? "bg-[#007a5a] text-white hover:bg-[#148567]"
                  : "bg-slack-pane-hover text-slack-text-muted",
              )}
            >
              <Send size={14} />
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
