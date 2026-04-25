"use client";

import clsx from "clsx";
import {
  ChevronDown,
  ChevronRight,
  Hash,
  Lock,
  Plus,
  PenSquare,
  FileText,
  Share2,
  FolderOpen,
  Compass,
  Circle,
  Grid2x2Plus,
} from "lucide-react";
import { useMemo } from "react";
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

  const width = useSlackStore((s) => s.sidebarWidth);

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col rounded-l-lg bg-slack-sidebar text-white/85"
      style={{ width }}
    >
      {/* Workspace header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <button className="flex items-center gap-1 text-left">
          <span className="text-[18px] font-black tracking-tight text-white">
            Acme
          </span>
          <ChevronDown size={14} className="text-white/80" />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1d1c1d] shadow hover:brightness-95"
          title="New message"
        >
          <PenSquare size={14} />
        </button>
      </div>

      {/* Quick items section */}
      <div className="flex flex-col px-2 pt-1 pb-2 text-[14px]">
        <QuickItem icon={<FileText size={16} />} label="Canvases" />
        <QuickItem icon={<Share2 size={16} />} label="Slack Connect" />
        <QuickItem icon={<FolderOpen size={16} />} label="Files" />
        <QuickItem icon={<Compass size={16} />} label="Browse Slack" />
      </div>

      {/* Scrollable middle */}
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

        <div className="my-1" />

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
          <AddRow label="Add channels" />
        </Section>

        <div className="my-1" />

        <Section
          id="apps"
          title="Apps"
          collapsed={!!collapsed.apps || collapsed.apps === undefined}
          onToggle={() => setCollapsed("apps", !collapsed.apps)}
        >
          <button className="flex items-center gap-2 rounded-md px-2 py-[5px] text-left text-[14px] text-white/80 hover:bg-[#4d2a51] hover:text-white">
            <span className="flex w-5 justify-center opacity-80">
              <Grid2x2Plus size={14} />
            </span>
            Add apps
          </button>
        </Section>
      </div>
      <SidebarResizer />
    </aside>
  );
}

function SidebarResizer() {
  const setSidebarWidth = useSlackStore((s) => s.setSidebarWidth);
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const aside = e.currentTarget.parentElement as HTMLElement | null;
    const left = aside?.getBoundingClientRect().left ?? 0;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => setSidebarWidth(ev.clientX - left);
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  return (
    <div
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize transition-colors hover:bg-white/20 active:bg-white/30"
    />
  );
}

function QuickItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-2 rounded-md px-2 py-[5px] text-left text-[14px] text-white/85 hover:bg-[#4d2a51] hover:text-white">
      <span className="flex w-5 justify-center opacity-80">{icon}</span>
      <span>{label}</span>
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
      <button
        onClick={onToggle}
        className="group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] font-semibold text-white/80 hover:bg-[#4d2a51] hover:text-white"
      >
        <span className="flex w-5 justify-center">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>
        <span>{title}</span>
      </button>
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
        "flex items-center gap-2 rounded-md px-2 py-[5px] text-left text-[15px] transition-colors",
        active
          ? "bg-white text-[#1d1c1d]"
          : hasUnread
            ? "text-white hover:bg-[#4d2a51]"
            : "text-white/85 hover:bg-[#4d2a51] hover:text-white",
      )}
    >
      <span className="flex w-5 justify-center">
        {conv.isPrivate ? (
          <Lock size={14} strokeWidth={2.2} className={active ? "" : "opacity-90"} />
        ) : (
          <Hash size={14} strokeWidth={2.2} className={active ? "" : "opacity-90"} />
        )}
      </span>
      <span className={clsx("truncate", hasUnread && !active && "font-bold")}>
        {conv.name}
      </span>
      {unread > 0 && (
        <span
          className={clsx(
            "ml-auto rounded-full px-1.5 text-[10px] font-bold",
            active ? "bg-[#1d1c1d] text-white" : "bg-[#CD2553] text-white",
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
        "flex items-center gap-2 rounded-md px-2 py-[5px] text-left text-[14px] transition-colors",
        active
          ? "bg-white text-[#1d1c1d]"
          : hasUnread
            ? "text-white hover:bg-[#4d2a51]"
            : "text-white/85 hover:bg-[#4d2a51] hover:text-white",
      )}
    >
      {other ? (
        <div className="relative">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-sm text-[10px] font-black text-[#1d1c1d]"
            style={{ background: other.avatarColor }}
          >
            {!other.isBot && !other.isAgent
              ? other.displayName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
              : "✦"}
          </div>
          {other.presence === "active" && (
            <span
              className={clsx(
                "absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full bg-[#2eb67d] ring-2",
                active ? "ring-white" : "ring-slack-sidebar",
              )}
            />
          )}
          {other.presence === "away" && !other.isBot && (
            <span
              className={clsx(
                "absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border-[1.5px] border-white/70 bg-transparent",
                active ? "border-[#1d1c1d]/50" : "border-white/70",
              )}
            />
          )}
        </div>
      ) : (
        <Circle size={8} />
      )}
      <span className={clsx("flex-1 truncate", hasUnread && !active && "font-bold")}>
        {name}
        {isSelf && <span className="ml-1 text-[12px] opacity-60">you</span>}
      </span>
      {unread > 0 && (
        <span
          className={clsx(
            "rounded-full px-1.5 text-[10px] font-bold",
            active ? "bg-[#1d1c1d] text-white" : "bg-[#CD2553] text-white",
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
    <button className="flex items-center gap-2 rounded-md px-2 py-[5px] text-left text-[14px] text-white/75 hover:bg-[#4d2a51] hover:text-white">
      <span className="flex h-5 w-5 items-center justify-center">
        <Plus size={14} />
      </span>
      {label}
    </button>
  );
}
