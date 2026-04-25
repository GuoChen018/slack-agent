"use client";

import clsx from "clsx";
import { useState } from "react";
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
  const bg = user.avatarColor;
  const textColor = isLight(bg) ? "#1d1c1d" : "#ffffff";
  // If the remote logo 404s we drop back to the colored-initials chip.
  const [imgFailed, setImgFailed] = useState(false);
  // Agents are flagged as bots so the AGENT badge renders in messages, but
  // they still want their logo. Only suppress photos for plain bot/app users
  // that aren't agents.
  const showPhoto =
    !!user.avatarUrl && !imgFailed && (!user.isBot || !!user.isAgent);
  const isAgentLogo = showPhoto && user.isAgent;
  const style = {
    width: size,
    height: size,
    background: isAgentLogo ? "#ffffff" : bg,
    color: textColor,
    fontSize: size <= 20 ? 9 : size <= 28 ? 11 : 13,
  };
  return (
    <div className="relative inline-block flex-shrink-0">
      <div
        className={clsx(
          "flex items-center justify-center overflow-hidden font-black select-none",
          rounded === "lg" ? "rounded-lg" : "rounded-[4px]",
        )}
        style={style}
        aria-label={user.displayName}
      >
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            width={size}
            height={size}
            onError={() => setImgFailed(true)}
            className={clsx(
              "h-full w-full",
              isAgentLogo ? "object-contain p-1" : "object-cover",
            )}
          />
        ) : user.isAgent ? (
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

function isLight(hex: string) {
  const c = hex.replace("#", "");
  const num = parseInt(c, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
