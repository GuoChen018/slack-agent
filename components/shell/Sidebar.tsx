"use client";

import clsx from "clsx";
import {
  ChevronDown,
  ChevronRight,
  Hash,
  Lock,
  Plus,
  MessageSquareText,
  AtSign,
  Bookmark,
  PenSquare,
  Inbox,
  Sparkles,
  MoreHorizontal,
  Headphones,
  Circle,
} from "lucide-react";
import { useMemo } from "react";
import { Avatar } from "@/components/Avatar";
import { useSlackStore } from "@/lib/store";
import type { Conversation, User } from "@/lib/types";

export function Sidebar() {
  const conversations = useSlackStore((s) => s.conversations);
  const order = useSlackStore((s) => s.conversationOrder);
  const active = useSlackStore((s) => s.activeConversationId);
  const setActive = useSlackStore((s) => s.setActiveConversation);
  const unread = useSlackStore((s) => s.unread);
  const usersById = useSlackStore((s) => s.users);
  const currentUserId = useSlackStore((s) => s.currentUserId);
  const collapsed = useSlackStore((s) => s.collapsedSections);
  const setCollapsed = useSlackStore((s) => s.setSectionCollapsed);

  const { channels, dms } = useMemo(() => {
    const list = order.map((id) => conversations[id]);
    return {
      channels: list.filter((c) => c.kind === "channel"),
      dms: list.filter((c) => c.kind === "dm" || c.kind === "group_dm"),
    };
  }, [order, conversations]);

  return (
    <aside className="flex h-full w-[260px] flex-col bg-[#19171D] text-[#BCB7BF]">
      {/* Workspace header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <button className="group flex items-center gap-1 text-left">
          <span className="text-[15px] font-black tracking-tight text-white">
            Agentic Playground
          </span>
          <ChevronDown size={14} className="text-white/80" />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#19171D] shadow hover:brightness-95"
          title="New message"
        >
          <PenSquare size={14} />
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex flex-col px-2 pt-1 pb-2 text-[14px]">
        <QuickItem icon={<MessageSquareText size={16} />} label="Threads" />
        <QuickItem icon={<AtSign size={16} />} label="Mentions & reactions" />
        <QuickItem icon={<Bookmark size={16} />} label="Saved items" />
        <QuickItem icon={<Inbox size={16} />} label="Drafts & sent" />
        <QuickItem icon={<Sparkles size={16} />} label="Agents" badge="New" />
        <QuickItem icon={<MoreHorizontal size={16} />} label="More" />
      </div>

      {/* Divider */}
      <div className="mx-3 my-1 h-px bg-white/10" />

      {/* Channels */}
      <div className="slack-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <Section
          id="channels"
          title="Channels"
          collapsed={!!collapsed.channels}
          onToggle={() => setCollapsed("channels", !collapsed.channels)}
        >
          {channels.map((c) => (
            <ConvRow
              key={c.id}
              conv={c}
              active={active === c.id}
              unread={unread[c.id] ?? 0}
              onClick={() => setActive(c.id)}
            />
          ))}
          <AddRow label="Add channels" />
        </Section>

        <div className="my-2" />

        <Section
          id="dms"
          title="Direct messages"
          collapsed={!!collapsed.dms}
          onToggle={() => setCollapsed("dms", !collapsed.dms)}
        >
          {dms.map((c) => (
            <DMRow
              key={c.id}
              conv={c}
              currentUserId={currentUserId}
              usersById={usersById}
              active={active === c.id}
              unread={unread[c.id] ?? 0}
              onClick={() => setActive(c.id)}
            />
          ))}
          <AddRow label="Add teammates" />
        </Section>
      </div>

      {/* Footer huddle bar */}
      <div className="border-t border-white/10 bg-[#19171D] p-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5">
          <Headphones size={16} className="text-white/80" />
          <span className="text-[13px] font-semibold text-white">Huddle</span>
          <button className="ml-auto rounded p-1 text-white/70 hover:bg-white/10">
            <Plus size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function QuickItem({
  icon,
  label,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-[14px] text-[#D1D2D3] hover:bg-white/10">
      <span className="flex w-5 justify-center">{icon}</span>
      <span>{label}</span>
      {badge && (
        <span className="ml-auto rounded bg-[#007a5a] px-1.5 py-[1px] text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function Section({
  title,
  collapsed,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="group flex items-center gap-1 px-2 py-1 text-[13px] text-[#D1D2D3]">
        <button onClick={onToggle} className="flex items-center gap-1 font-semibold">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          <span>{title}</span>
        </button>
        <button className="ml-auto flex h-5 w-5 items-center justify-center rounded text-white/60 opacity-0 hover:bg-white/10 group-hover:opacity-100">
          <Plus size={14} />
        </button>
      </div>
      {!collapsed && <div className="flex flex-col gap-[1px]">{children}</div>}
    </div>
  );
}

function ConvRow({
  conv,
  active,
  unread,
  onClick,
}: {
  conv: Conversation;
  active: boolean;
  unread: number;
  onClick: () => void;
}) {
  const hasUnread = unread > 0;
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 rounded-md px-2 py-[3px] text-left text-[15px]",
        active
          ? "bg-[#1164A3] text-white"
          : hasUnread
            ? "text-white hover:bg-white/10"
            : "text-[#BCB7BF] hover:bg-white/10 hover:text-white",
      )}
    >
      {conv.isPrivate ? (
        <Lock size={14} strokeWidth={2.5} className="opacity-80" />
      ) : (
        <Hash size={14} strokeWidth={2.5} className="opacity-80" />
      )}
      <span className={clsx("truncate", hasUnread && !active && "font-bold")}>
        {conv.name}
      </span>
      {unread > 0 && (
        <span
          className={clsx(
            "ml-auto rounded-full px-1.5 text-[10px] font-bold",
            active
              ? "bg-white/20 text-white"
              : "bg-[#CD2553] text-white",
          )}
        >
          {unread}
        </span>
      )}
    </button>
  );
}

function DMRow({
  conv,
  currentUserId,
  usersById,
  active,
  unread,
  onClick,
}: {
  conv: Conversation;
  currentUserId: string;
  usersById: Record<string, User>;
  active: boolean;
  unread: number;
  onClick: () => void;
}) {
  const otherIds = conv.memberIds.filter((id) => id !== currentUserId);
  const other = otherIds.length ? usersById[otherIds[0]] : usersById[currentUserId];
  const isSelf = conv.memberIds.length === 1;
  const hasUnread = unread > 0;

  const name =
    conv.kind === "group_dm"
      ? conv.memberIds
          .filter((id) => id !== currentUserId)
          .map((id) => usersById[id]?.displayName.split(" ")[0])
          .join(", ")
      : isSelf
        ? `${usersById[currentUserId]?.displayName.split(" ")[0]} (you)`
        : other?.displayName;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 rounded-md px-2 py-[3px] text-left text-[15px]",
        active
          ? "bg-[#1164A3] text-white"
          : hasUnread
            ? "text-white hover:bg-white/10"
            : "text-[#BCB7BF] hover:bg-white/10 hover:text-white",
      )}
    >
      {conv.kind === "group_dm" ? (
        <div className="relative h-4 w-4">
          <div className="absolute inset-0 rounded-[3px] bg-[#5b5b5b]" />
          <Circle size={8} className="absolute right-0 bottom-0 fill-white text-white" />
        </div>
      ) : other ? (
        <div className="relative">
          <Avatar user={other} size={20} rounded="md" />
          {other.presence === "active" && (
            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-[#2eb67d] ring-2 ring-[#19171D]" />
          )}
          {other.presence === "away" && !other.isBot && (
            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#9A9B9E] bg-[#19171D]" />
          )}
        </div>
      ) : null}
      <span className={clsx("flex-1 truncate", hasUnread && !active && "font-bold")}>
        {name}
        {isSelf && <span className="ml-1 text-[12px] text-white/50">you</span>}
        {other?.isAgent && (
          <span className="ml-1 rounded bg-white/10 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white/80">
            Agent
          </span>
        )}
      </span>
      {unread > 0 && (
        <span
          className={clsx(
            "rounded-full px-1.5 text-[10px] font-bold",
            active ? "bg-white/20 text-white" : "bg-[#CD2553] text-white",
          )}
        >
          {unread}
        </span>
      )}
    </button>
  );
}

function AddRow({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-2 rounded-md px-2 py-[3px] text-left text-[14px] text-[#BCB7BF] hover:bg-white/10 hover:text-white">
      <span className="flex h-5 w-5 items-center justify-center rounded bg-white/10">
        <Plus size={12} />
      </span>
      {label}
    </button>
  );
}
