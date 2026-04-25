"use client";

import { X } from "lucide-react";
import { useMemo } from "react";
import { useSlackStore } from "@/lib/store";
import { MessageRow } from "@/components/channel/Message";
import { PreflightEphemeral } from "@/components/channel/PreflightEphemeral";
import { AgentConnectPrompt } from "@/components/channel/AgentConnectPrompt";
import { Composer } from "@/components/composer/Composer";
import { RightPaneResizer } from "@/components/shell/RightPaneResizer";

export function ThreadPane() {
  const parentId = useSlackStore((s) => s.openThreadParentId);
  const messages = useSlackStore((s) => s.messages);
  const closeThread = useSlackStore((s) => s.closeThread);
  const conv = useSlackStore((s) => s.conversations[s.activeConversationId]);
  const width = useSlackStore((s) => s.rightPaneWidth);

  const currentUserId = useSlackStore((s) => s.currentUserId);
  const parent = parentId ? messages[parentId] : null;
  // Render every reply that's either public OR explicitly ephemeral-to-me.
  // Ephemerals targeted at other users are filtered out (not relevant in
  // this single-user prototype, but keeps the rendering invariant clean).
  const replies = useMemo(
    () =>
      parentId
        ? Object.values(messages)
            .filter(
              (m) =>
                m.threadId === parentId &&
                (!m.ephemeralFor || m.ephemeralFor === currentUserId),
            )
            .sort((a, b) => a.createdAt - b.createdAt)
        : [],
    [messages, parentId, currentUserId],
  );
  // The "X replies" count refers to public replies only — ephemerals
  // (preflights, in-thread connect prompts) shouldn't inflate it because
  // the rest of the channel can't see them.
  const publicReplyCount = useMemo(
    () => replies.filter((r) => !r.ephemeralFor).length,
    [replies],
  );

  if (!parentId || !parent) return null;

  return (
    <aside
      // Allow the pane to shrink when the channel + thread + agent panes
      // are all open together; `width` is the preferred/dragged width and
      // `minWidth` is the floor before the pane contracts further.
      className="relative ml-1.5 flex h-full flex-col overflow-hidden rounded-lg bg-white"
      style={{ width, minWidth: 280, flexShrink: 1 }}
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
          <span>{publicReplyCount} {publicReplyCount === 1 ? "reply" : "replies"}</span>
          <div className="h-px flex-1 bg-slack-border" />
        </div>
        {replies.map((r) => {
          if (r.preflight) {
            return <PreflightEphemeral key={r.id} message={r} />;
          }
          if (r.agentConnectPrompt) {
            return <AgentConnectPrompt key={r.id} message={r} />;
          }
          return <MessageRow key={r.id} message={r} compact={false} />;
        })}
      </div>

      <div>
        <Composer threadParentId={parentId} placeholder="Reply…" />
      </div>
    </aside>
  );
}
