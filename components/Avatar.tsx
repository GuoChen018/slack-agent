"use client";

import clsx from "clsx";
import type { User } from "@/lib/types";

interface AvatarProps {
  user: User;
  size?: number;
  rounded?: "md" | "lg";
  showPresence?: boolean;
  onDark?: boolean;
}

function initials(u: User) {
  const parts = u.displayName.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({
  user,
  size = 36,
  rounded = "md",
  showPresence = false,
  onDark = false,
}: AvatarProps) {
  const style = {
    width: size,
    height: size,
    background: `linear-gradient(135deg, ${user.avatarColor}, ${shade(user.avatarColor, -20)})`,
    fontSize: size <= 20 ? 9 : size <= 28 ? 11 : 13,
  };
  return (
    <div className="relative inline-block flex-shrink-0">
      <div
        className={clsx(
          "flex items-center justify-center font-bold text-white select-none",
          rounded === "lg" ? "rounded-lg" : "rounded-[4px]",
        )}
        style={style}
        aria-label={user.displayName}
      >
        {user.isAgent ? (
          <span style={{ fontSize: size * 0.5 }}>✦</span>
        ) : user.isBot ? (
          <span style={{ fontSize: size * 0.55 }}>🤖</span>
        ) : (
          initials(user)
        )}
      </div>
      {showPresence && user.presence !== "offline" && (
        <span
          className={clsx(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2",
            onDark ? "border-slack-aubergine" : "border-white",
            user.presence === "active" ? "bg-[#2eb67d]" : "bg-transparent",
          )}
          style={{
            width: Math.max(10, size * 0.32),
            height: Math.max(10, size * 0.32),
            borderColor: onDark ? "#19171D" : "#ffffff",
            ...(user.presence === "away"
              ? { background: "transparent", boxShadow: "inset 0 0 0 2px #9A9B9E" }
              : {}),
          }}
        />
      )}
    </div>
  );
}

function shade(hex: string, amt: number) {
  const c = hex.replace("#", "");
  const num = parseInt(c, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(Math.min(255, r), 0);
  g = Math.max(Math.min(255, g), 0);
  b = Math.max(Math.min(255, b), 0);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
