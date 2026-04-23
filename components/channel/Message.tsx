"use client";

import clsx from "clsx";
import {
  Bookmark,
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
}

const QUICK_REACTIONS = ["👍", "🙌", "🎉", "👀", "❤️", "🔥"];

export function MessageRow({ message, compact, onOpenThread }: Props) {
  const users = useSlackStore((s) => s.users);
  const convs = useSlackStore((s) => s.conversations);
  const currentUserId = useSlackStore((s) => s.currentUserId);
  const toggleReaction = useSlackStore((s) => s.toggleReaction);
  const author = users[message.authorId];

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
        "message-row group relative flex gap-2 px-5 py-[2px]",
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
            {author.isBot && (
              <span className="rounded bg-[#F4EDE4] px-1 text-[10px] font-bold uppercase tracking-wide text-[#1D1C1D]">
                {author.isAgent ? "Agent" : "App"}
              </span>
            )}
            <span className="text-[12px] text-slack-text-light">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}

        <div
          className="text-[15px] text-slack-text"
          dangerouslySetInnerHTML={{ __html: html }}
        />

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

        {/* Thread preview */}
        {!!message.replyCount && (
          <button
            onClick={() => onOpenThread?.(message.id)}
            className="mt-1 flex items-center gap-2 rounded-md border border-transparent px-1 py-1 text-[13px] hover:border-slack-border hover:bg-white"
          >
            <div className="flex -space-x-1">
              {(message.replyUserIds ?? []).map((id) => (
                <Avatar key={id} user={users[id]} size={20} rounded="md" />
              ))}
            </div>
            <span className="font-bold text-[#1264a3]">
              {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
            </span>
            <span className="text-slack-text-light">
              Last reply {message.lastReplyAt ? formatRelativeShort(message.lastReplyAt) : ""}
            </span>
            <span className="ml-auto hidden text-slack-text-light group-hover:inline">
              View thread →
            </span>
          </button>
        )}
      </div>

      {/* Hover action bar */}
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
    </div>
  );
}
