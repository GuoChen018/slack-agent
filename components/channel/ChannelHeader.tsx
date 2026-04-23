"use client";

import { Hash, Lock, Star, Bell, Pin, Headphones } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useSlackStore } from "@/lib/store";

export function ChannelHeader() {
  const conv = useSlackStore((s) => s.conversations[s.activeConversationId]);
  const usersById = useSlackStore((s) => s.users);
  const currentUserId = useSlackStore((s) => s.currentUserId);
  if (!conv) return null;

  const isDM = conv.kind === "dm" || conv.kind === "group_dm";
  const otherIds = conv.memberIds.filter((id) => id !== currentUserId);
  const other = otherIds.length ? usersById[otherIds[0]] : usersById[currentUserId];
  const isSelf = conv.memberIds.length === 1;

  return (
    <header className="flex h-[50px] shrink-0 items-center gap-2 border-b border-slack-border bg-white px-5">
      <div className="flex items-center gap-2">
        {conv.kind === "channel" ? (
          <>
            {conv.isPrivate ? (
              <Lock size={18} strokeWidth={2.4} />
            ) : (
              <Hash size={18} strokeWidth={2.4} />
            )}
            <span className="text-[18px] font-black">{conv.name}</span>
          </>
        ) : conv.kind === "dm" ? (
          <div className="flex items-center gap-2">
            {other && <Avatar user={other} size={20} />}
            <span className="text-[18px] font-black">
              {isSelf ? `${other?.displayName.split(" ")[0]} (you)` : other?.displayName}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {otherIds.slice(0, 3).map((id) => (
                <div key={id} className="ring-2 ring-white rounded-[4px]">
                  <Avatar user={usersById[id]} size={18} />
                </div>
              ))}
            </div>
            <span className="text-[18px] font-black">
              {otherIds.map((id) => usersById[id]?.displayName.split(" ")[0]).join(", ")}
            </span>
          </div>
        )}
        <button className="rounded p-1 text-slack-text-muted hover:bg-slack-pane-hover" title="Star">
          <Star size={14} />
        </button>
        {!isDM && (
          <button className="rounded p-1 text-slack-text-muted hover:bg-slack-pane-hover" title="Notifications">
            <Bell size={14} />
          </button>
        )}
      </div>

      {!isDM && conv.topic && (
        <button className="ml-2 max-w-[560px] truncate rounded px-2 py-1 text-[13px] text-slack-text-muted hover:bg-slack-pane-hover">
          {conv.topic}
        </button>
      )}

      <div className="ml-auto flex items-center gap-1">
        {!isDM && (
          <>
            <button className="flex items-center gap-1 rounded px-2 py-1 text-[13px] text-slack-text-muted hover:bg-slack-pane-hover">
              <Pin size={14} />
            </button>
            <div className="mx-1 h-5 w-px bg-slack-border" />
            <button className="flex items-center gap-1.5 rounded border border-slack-border px-2 py-1 text-[13px] text-slack-text hover:bg-slack-pane-hover">
              <div className="flex -space-x-1">
                {conv.memberIds.slice(0, 3).map((id) => (
                  <Avatar key={id} user={usersById[id]} size={18} rounded="md" />
                ))}
              </div>
              <span className="font-semibold">{conv.memberIds.length}</span>
            </button>
          </>
        )}
        <button
          className="ml-1 flex items-center gap-1.5 rounded border border-slack-border bg-white px-2.5 py-1 text-[13px] font-semibold text-slack-text hover:bg-slack-pane-hover"
          title="Start huddle"
        >
          <Headphones size={14} />
          <span className="hidden md:inline">Huddle</span>
        </button>
      </div>
    </header>
  );
}
