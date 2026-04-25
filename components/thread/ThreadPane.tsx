"use client";

import { X } from "lucide-react";
import { useMemo } from "react";
import { useSlackStore } from "@/lib/store";
import { MessageRow } from "@/components/channel/Message";
import { Composer } from "@/components/composer/Composer";
import { RightPaneResizer } from "@/components/shell/RightPaneResizer";

export function ThreadPane() {
  const parentId = useSlackStore((s) => s.openThreadParentId);
  const messages = useSlackStore((s) => s.messages);
  const closeThread = useSlackStore((s) => s.closeThread);
  const conv = useSlackStore((s) => s.conversations[s.activeConversationId]);
  const width = useSlackStore((s) => s.rightPaneWidth);

  const parent = parentId ? messages[parentId] : null;
  const replies = useMemo(
    () =>
      parentId
        ? Object.values(messages)
            .filter((m) => m.threadId === parentId)
            .sort((a, b) => a.createdAt - b.createdAt)
        : [],
    [messages, parentId],
  );

  if (!parentId || !parent) return null;

  return (
    <aside
      className="relative ml-1.5 flex h-full shrink-0 flex-col overflow-hidden rounded-lg bg-white"
      style={{ width }}
    >
      <RightPaneResizer />
      <header className="flex h-[50px] items-center justify-between border-b border-slack-border px-4">
        <div>
          <div className="text-[15px] font-black">Thread</div>
          {conv && (
            <div className="text-[12px] text-slack-text-muted">
              {conv.kind === "channel" ? `#${conv.name}` : conv.name}
            </div>
          )}
        </div>
        <button
          onClick={closeThread}
          className="rounded p-1 text-slack-text-muted hover:bg-slack-pane-hover"
          title="Close thread"
        >
          <X size={16} />
        </button>
      </header>

      <div className="slack-scroll-light flex-1 overflow-y-auto">
        <MessageRow message={parent} compact={false} isThreadParent />
        <div className="mx-5 my-2 flex items-center gap-2 text-[12px] text-slack-text-muted">
          <span>{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
          <div className="h-px flex-1 bg-slack-border" />
        </div>
        {replies.map((r) => (
          <MessageRow key={r.id} message={r} compact={false} />
        ))}
      </div>

      <div className="border-t border-slack-border">
        <Composer threadParentId={parentId} placeholder="Reply…" />
      </div>
    </aside>
  );
}
