"use client";

import { Plus, Home, MessageSquare, Bell, Bookmark, MoreHorizontal } from "lucide-react";
import clsx from "clsx";

const navs = [
  { id: "home", label: "Home", icon: Home, active: true },
  { id: "dms", label: "DMs", icon: MessageSquare },
  { id: "activity", label: "Activity", icon: Bell },
  { id: "later", label: "Later", icon: Bookmark },
  { id: "more", label: "More", icon: MoreHorizontal },
];

export function WorkspaceRail() {
  return (
    <div className="flex h-full w-[70px] flex-col items-center gap-1 bg-[#3F0E40] pt-2 pb-3 text-white/90">
      {/* Workspace logo */}
      <button
        className="group mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#ECB22E] to-[#E01E5A] text-sm font-black text-white shadow hover:brightness-110"
        title="Agentic Playground"
      >
        A
      </button>

      <div className="mb-2 h-px w-6 bg-white/10" />

      <nav className="flex flex-col items-center gap-0.5">
        {navs.map(({ id, label, icon: Icon, active }) => (
          <button
            key={id}
            className={clsx(
              "group flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold",
              active
                ? "text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <span
              className={clsx(
                "flex h-6 w-6 items-center justify-center rounded-md",
                active && "bg-white/15 ring-1 ring-white/10",
              )}
            >
              <Icon size={16} strokeWidth={2} />
            </span>
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md border border-white/25 text-white/80 hover:bg-white/10"
          title="Add workspace"
        >
          <Plus size={16} />
        </button>
        <div className="h-8 w-8 overflow-hidden rounded-md bg-gradient-to-br from-[#4a154b] to-[#9b59b6] ring-2 ring-[#3F0E40] relative">
          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
            G
          </div>
          <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-[#2eb67d] ring-2 ring-[#3F0E40]" />
        </div>
      </div>
    </div>
  );
}
