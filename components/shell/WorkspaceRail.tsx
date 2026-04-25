"use client";

import { Home, MessageSquare, Bell, Bookmark, MoreHorizontal } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

interface Nav {
  id: string;
  label: string;
  icon: React.ElementType;
}

const navs: Nav[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "dms", label: "DMs", icon: MessageSquare },
  { id: "activity", label: "Activity", icon: Bell },
  { id: "later", label: "Later", icon: Bookmark },
  { id: "more", label: "More", icon: MoreHorizontal },
];

export function WorkspaceRail() {
  const [active, setActive] = useState("home");

  return (
    <div className="flex h-full w-[64px] flex-col items-center gap-4 bg-slack-rail py-1.5 text-white/90">
      <nav className="flex flex-col items-center gap-4 pt-3">
        {navs.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              className="group flex flex-col items-center gap-0.5 text-[11px] font-semibold"
            >
              <span
                className={clsx(
                  "relative flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  isActive ? "bg-[#835586]" : "group-hover:bg-white/10",
                )}
              >
                <Icon size={18} strokeWidth={2} />
                {isActive && (
                  <span className="absolute right-1 top-3 h-0.5 w-0.5 rounded-sm bg-[#3e103f]" />
                )}
              </span>
              <span className="leading-none">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2 pb-2">
        <div className="relative h-8 w-8 overflow-hidden rounded-md bg-gradient-to-br from-[#4a154b] to-[#9b59b6] ring-1 ring-black/20">
          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
            G
          </div>
          <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-[#2eb67d] ring-2 ring-slack-rail" />
        </div>
      </div>
    </div>
  );
}
