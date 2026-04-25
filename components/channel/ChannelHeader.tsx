"use client";

import {
  Hash,
  Lock,
  Star,
  ChevronDown,
  MessageSquare,
  FileText,
  Bookmark,
  Folder,
  Pin,
  Plus,
  Headphones,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/Avatar";
import { useSlackStore } from "@/lib/store";

const TABS = [
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { id: "files", label: "Files", icon: Folder },
  { id: "pins", label: "Pins", icon: Pin },
];

export function ChannelHeader() {
  const conv = useSlackStore((s) => s.conversations[s.activeConversationId]);
  const usersById = useSlackStore((s) => s.users);
  const currentUserId = useSlackStore((s) => s.currentUserId);
  const [activeTab, setActiveTab] = useState("messages");
  if (!conv) return null;

  const isDM = conv.kind === "dm" || conv.kind === "group_dm";
  const otherIds = conv.memberIds.filter((id) => id !== currentUserId);
  const other = otherIds.length ? usersById[otherIds[0]] : usersById[currentUserId];
  const isSelf = conv.memberIds.length === 1;

  return (
    <header className="shrink-0 border-b border-slack-border bg-white">
      {/* Row 1: title + actions */}
      <div className="flex h-[49px] items-center gap-2 px-4">
        <button className="rounded p-1 text-slack-text-muted hover:bg-slack-pane-hover" title="Star">
          <Star size={16} />
        </button>
        {conv.kind === "channel" ? (
          <div className="flex items-center gap-1.5">
            {conv.isPrivate ? (
              <Lock size={16} strokeWidth={2.2} />
            ) : (
              <Hash size={16} strokeWidth={2.2} />
            )}
            <span className="text-[16px] font-black">{conv.name}</span>
            <ChevronDown size={14} className="text-slack-text-muted" />
          </div>
        ) : conv.kind === "dm" ? (
          <div className="flex items-center gap-2">
            {other && <Avatar user={other} size={20} />}
            <span className="text-[16px] font-black">
              {isSelf ? `${other?.displayName.split(" ")[0]} (you)` : other?.displayName}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {otherIds.slice(0, 3).map((id) => (
                <div key={id} className="rounded-[4px] ring-2 ring-white">
                  <Avatar user={usersById[id]} size={18} />
                </div>
              ))}
            </div>
            <span className="text-[16px] font-black">
              {otherIds.map((id) => usersById[id]?.displayName.split(" ")[0]).join(", ")}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          {!isDM && (
            <button className="flex items-center gap-1.5 rounded px-2 py-1 text-[13px] text-slack-text hover:bg-slack-pane-hover">
              <div className="flex -space-x-1">
                {conv.memberIds.slice(0, 3).map((id) => (
                  <Avatar key={id} user={usersById[id]} size={18} rounded="md" />
                ))}
              </div>
              <span className="font-semibold">{conv.memberIds.length}</span>
            </button>
          )}
          <button
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slack-border text-slack-text-muted hover:bg-slack-pane-hover"
            title="Start huddle"
          >
            <Headphones size={14} />
          </button>
        </div>
      </div>

      {/* Row 2: tab strip */}
      <div className="flex h-[30px] items-center gap-1 px-3">
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={clsx(
                "flex h-[26px] items-center gap-1.5 rounded px-2 text-[13px]",
                isActive
                  ? "text-slack-text"
                  : "text-slack-text-muted hover:bg-slack-pane-hover",
              )}
            >
              <Icon size={14} strokeWidth={2} />
              <span className={clsx(isActive && "font-semibold")}>{t.label}</span>
            </button>
          );
        })}
        <button
          className="flex h-[26px] w-[26px] items-center justify-center rounded text-slack-text-muted hover:bg-slack-pane-hover"
          title="Add tab"
        >
          <Plus size={14} />
        </button>
      </div>
    </header>
  );
}
