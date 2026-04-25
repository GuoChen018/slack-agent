"use client";

import clsx from "clsx";
import {
  Bookmark,
  Check,
  Clock,
  Loader2,
  MessageSquare,
  MoreVertical,
  Share,
  Smile,
} from "lucide-react";
import { useMemo } from "react";
import { Avatar } from "@/components/Avatar";
import { useSlackStore } from "@/lib/store";
import { formatTime, formatRelativeShort, renderMrkdwn } from "@/lib/format";
import type { Message as Msg } from "@/lib/types";
import { FileAttachmentTile } from "./FileAttachmentTile";

interface Props {
  message: Msg;
  compact: boolean; // true means grouped under previous sender
  onOpenThread?: (id: string) => void;
  isThreadParent?: boolean; // rendered as the parent inside ThreadPane
}

const QUICK_REACTIONS = ["👍", "🙌", "🎉", "👀", "❤️", "🔥"];

export function MessageRow({
  message,
  compact,
  onOpenThread,
  isThreadParent,
}: Props) {
  const users = useSlackStore((s) => s.users);
  const convs = useSlackStore((s) => s.conversations);
  const currentUserId = useSlackStore((s) => s.currentUserId);
  const toggleReaction = useSlackStore((s) => s.toggleReaction);
  const author = users[message.authorId];
  const allMessages = useSlackStore((s) => s.messages);

  // For agent-authored thread replies on this parent, surface their live
  // status (queued/thinking/streaming/done) inline on the channel-level
  // thread footer so Jordan can see who's doing what without opening the
  // thread.
  const agentReplies = useMemo(() => {
    if (!message.replyCount) return [];
    return Object.values(allMessages)
      .filter((m) => m.threadId === message.id && m.agentStatus)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [allMessages, message.id, message.replyCount]);
  const hasInFlightAgent = agentReplies.some(
    (m) => m.agentStatus !== "done",
  );

  const convsByName = useMemo(() => {
    const out: Record<string, { id: string; name: string }> = {};
    for (const c of Object.values(convs)) {
      if (c.kind === "channel") out[c.name.toLowerCase()] = { id: c.id, name: c.name };
    }
    return out;
  }, [convs]);

  const html = useMemo(
    () => renderMrkdwn(message.text, users, convsByName),
    [message.text, users, convsByName],
  );

  if (!author) return null;

  return (
    <div
      className={clsx(
        "group relative flex gap-2 px-5 py-[2px]",
        !isThreadParent && "message-row",
        compact ? "" : "mt-2",
      )}
    >
      <div className="w-9 flex-shrink-0">
        {compact ? (
          <span className="ml-[2px] mt-[5px] hidden text-[10px] text-slack-text-light group-hover:block">
            {formatTime(message.createdAt).replace(/\s..$/, "")}
          </span>
        ) : (
          <Avatar user={author} size={36} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!compact && (
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-black text-slack-text">
              {author.displayName}
            </span>
            {(author.isBot || author.isAgent) &&
              (author.isAgent ? (
                <span className="rounded bg-slack-pane-alt px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wide text-slack-text-muted">
                  Agent
                </span>
              ) : (
                <span className="rounded bg-[#F4EDE4] px-1 text-[10px] font-bold uppercase tracking-wide text-[#1D1C1D]">
                  App
                </span>
              ))}
            <span className="text-[12px] text-slack-text-light">
              {formatTime(message.createdAt)}
            </span>
            <AgentStatusPill status={message.agentStatus} />
          </div>
        )}

        {message.agentStatus === "queued" ? null : message.agentStatus === "thinking" ? (
          <div className="text-[15px]">
            <span className="shimmer-text">Thinking…</span>
          </div>
        ) : (
          <div
            className={clsx(
              "text-[15px] text-slack-text",
              message.agentStatus === "streaming" && "agent-msg agent-msg-streaming",
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        {message.editedAt && (
          <span className="text-[11px] text-slack-text-light"> (edited)</span>
        )}

        {!!message.attachments?.length && (
          <div className="mt-1 flex flex-col gap-1">
            {message.attachments.map((a) => (
              <FileAttachmentTile key={a.id} attachment={a} />
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => {
              const mine = r.userIds.includes(currentUserId);
              return (
                <button
                  key={r.emoji}
                  onClick={() => toggleReaction(message.id, r.emoji)}
                  className={clsx(
                    "flex h-6 items-center gap-1 rounded-full border px-2 text-[12px] transition-colors",
                    mine
                      ? "border-[#1d9bd1] bg-[#e8f5fa] text-[#1264a3]"
                      : "border-slack-border bg-[#f8f8f8] text-slack-text hover:border-slack-border-strong",
                  )}
                >
                  <span>{r.emoji}</span>
                  <span className="font-semibold">{r.userIds.length}</span>
                </button>
              );
            })}
            <button
              onClick={() => toggleReaction(message.id, "👍")}
              className="flex h-6 items-center rounded-full border border-dashed border-slack-border px-2 text-slack-text-muted hover:border-slack-border-strong"
              title="Add reaction"
            >
              <Smile size={12} />
              <span className="ml-1 text-[11px]">+</span>
            </button>
          </div>
        )}

        {/* Layer 1 — agent status pills. While each @-mentioned agent is
            queued/thinking/streaming, surface a Slack-reaction-shaped pill
            containing just the emoji. Hover reveals a tooltip with the
            agent's name + status, mirroring Slack's reaction tooltips. */}
        {hasInFlightAgent && !isThreadParent && (
          <div className="mt-1 flex flex-wrap gap-1">
            {agentReplies
              .filter((m) => m.agentStatus !== "done")
              .map((reply) => {
                const replyAuthor = users[reply.authorId];
                if (!replyAuthor) return null;
                return (
                  <AgentStatusEmojiPill
                    key={reply.id}
                    name={replyAuthor.displayName}
                    status={reply.agentStatus}
                  />
                );
              })}
          </div>
        )}

        {/* Layer 2 — standard thread preview. Only renders once at least one
            agent has actually responded (or there are non-agent replies),
            so the count and "Last reply" timestamp are always truthful. */}
        {!!message.replyCount && !isThreadParent && (
          <button
            onClick={() => onOpenThread?.(message.id)}
            className="mt-1 flex w-full items-center gap-2 rounded-md border border-transparent px-1 py-1 text-[13px] hover:border-slack-border hover:bg-white"
          >
            <div className="flex gap-1">
              {(message.replyUserIds ?? []).map((id) => (
                <Avatar key={id} user={users[id]} size={24} rounded="md" />
              ))}
            </div>
            <span className="font-bold text-[#1264a3]">
              {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
            </span>
            <span className="text-slack-text-light whitespace-nowrap">
              Last reply {message.lastReplyAt ? formatRelativeShort(message.lastReplyAt) : ""}
            </span>
          </button>
        )}
      </div>

      {/* Hover action bar — not shown on the thread parent */}
      {!isThreadParent && (
      <div className="message-actions pointer-events-none absolute -top-3 right-5 flex h-8 items-center rounded-md border border-slack-border bg-white shadow-sm">
        {QUICK_REACTIONS.slice(0, 3).map((e) => (
          <button
            key={e}
            onClick={() => toggleReaction(message.id, e)}
            className="flex h-full w-8 items-center justify-center hover:bg-slack-pane-hover"
          >
            <span className="text-base">{e}</span>
          </button>
        ))}
        <button
          className="flex h-full w-8 items-center justify-center text-slack-text-muted hover:bg-slack-pane-hover"
          title="Add reaction"
        >
          <Smile size={16} />
        </button>
        <button
          onClick={() => onOpenThread?.(message.id)}
          className="flex h-full w-8 items-center justify-center text-slack-text-muted hover:bg-slack-pane-hover"
          title="Reply in thread"
        >
          <MessageSquare size={16} />
        </button>
        <button
          className="flex h-full w-8 items-center justify-center text-slack-text-muted hover:bg-slack-pane-hover"
          title="Share"
        >
          <Share size={16} />
        </button>
        <button
          className="flex h-full w-8 items-center justify-center text-slack-text-muted hover:bg-slack-pane-hover"
          title="Save"
        >
          <Bookmark size={16} />
        </button>
        <button
          className="flex h-full w-8 items-center justify-center text-slack-text-muted hover:bg-slack-pane-hover"
          title="More"
        >
          <MoreVertical size={16} />
        </button>
      </div>
      )}
    </div>
  );
}

/** Channel-level status pill: just an emoji in a reaction-style chip with a
 * hover tooltip that reads "Agentforce is thinking", etc. Mirrors the way
 * Slack reveals reaction shortcodes on hover. */
function AgentStatusEmojiPill({
  name,
  status,
}: {
  name: string;
  status: Msg["agentStatus"];
}) {
  const emoji = status === "queued" ? "⏳" : "👀";
  const verb =
    status === "queued"
      ? "is waiting in queue"
      : status === "thinking"
        ? "is thinking"
        : "is replying";
  return (
    <span className="group relative inline-flex">
      <span className="flex h-6 items-center rounded-full border border-slack-border bg-[#f8f8f8] px-2 text-[14px] leading-none">
        {emoji}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1A1D21] px-2 py-1 text-[12px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100"
      >
        <span className="font-bold">{name}</span> {verb}
      </span>
    </span>
  );
}

/** Tiny per-agent status indicator that lives next to the timestamp on
 * agent-authored thread replies. Shows a clock for queued agents, a spinner
 * while thinking/streaming, and a check once the reply is in. */
function AgentStatusPill({ status }: { status?: Msg["agentStatus"] }) {
  if (!status) return null;
  if (status === "queued") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f4ede4] px-1.5 py-[1px] text-[11px] font-medium text-slack-text-muted">
        <Clock size={11} />
        Waiting
      </span>
    );
  }
  if (status === "thinking" || status === "streaming") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf3ff] px-1.5 py-[1px] text-[11px] font-medium text-[#1264a3]">
        <Loader2 size={11} className="animate-spin" />
        {status === "thinking" ? "Thinking" : "Working"}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ec] px-1.5 py-[1px] text-[11px] font-medium text-[#0b7a3e]"
      title="Done"
    >
      <Check size={11} />
      Done
    </span>
  );
}

