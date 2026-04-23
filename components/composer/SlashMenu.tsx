"use client";

import { useEffect, useMemo, useState } from "react";
import { PopoverShell } from "./PopoverShell";

interface Cmd {
  cmd: string;
  usage: string;
  desc: string;
}

const COMMANDS: Cmd[] = [
  { cmd: "/remind", usage: "/remind [@someone|#channel] [what] [when]", desc: "Set a reminder" },
  { cmd: "/dm", usage: "/dm [@someone] [message]", desc: "Send a direct message" },
  { cmd: "/status", usage: "/status [emoji] [message]", desc: "Set your status" },
  { cmd: "/away", usage: "/away", desc: "Toggle your away status" },
  { cmd: "/huddle", usage: "/huddle", desc: "Start a huddle" },
  { cmd: "/archive", usage: "/archive", desc: "Archive this channel" },
  { cmd: "/invite", usage: "/invite @user #channel", desc: "Invite user to channel" },
  { cmd: "/leave", usage: "/leave [#channel]", desc: "Leave a channel" },
  { cmd: "/who", usage: "/who", desc: "List users in this channel" },
  { cmd: "/rename", usage: "/rename [new name]", desc: "Rename this channel" },
  { cmd: "/topic", usage: "/topic [text]", desc: "Set the channel topic" },
  { cmd: "/shrug", usage: "/shrug [message]", desc: "Append ¯\\_(ツ)_/¯ to your message" },
  { cmd: "/giphy", usage: "/giphy [query]", desc: "Post a Giphy GIF" },
  { cmd: "/ask-agent", usage: "/ask-agent [prompt]", desc: "Ask the Slack Agent" },
];

interface Props {
  query: string;
  rect: DOMRect;
  onPick: (cmd: string) => void;
  onClose: () => void;
}

export function SlashMenu({ query, rect, onPick, onClose }: Props) {
  const list = useMemo(() => {
    const q = query.toLowerCase();
    return COMMANDS.filter((c) => !q || c.cmd.slice(1).startsWith(q)).slice(0, 8);
  }, [query]);

  const [idx, setIdx] = useState(0);
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setIdx(0);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(list.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (list[idx]) {
          e.preventDefault();
          onPick(list[idx].cmd);
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [list, idx, onPick]);

  if (!list.length) return null;

  return (
    <PopoverShell rect={rect} onClose={onClose} width={420}>
      <div className="border-b border-slack-border px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slack-text-muted">
        Commands
      </div>
      <ul className="max-h-[300px] overflow-y-auto py-1">
        {list.map((c, i) => (
          <li
            key={c.cmd}
            onMouseEnter={() => setIdx(i)}
            onClick={() => onPick(c.cmd)}
            className={
              "flex cursor-pointer flex-col px-3 py-1.5 " +
              (i === idx ? "bg-[#1264a3] text-white" : "text-slack-text")
            }
          >
            <div className="flex items-center gap-2">
              <span className="font-bold">{c.cmd}</span>
              <span className={i === idx ? "text-white/80 text-[12px]" : "text-slack-text-muted text-[12px]"}>
                {c.usage.replace(c.cmd, "").trim()}
              </span>
            </div>
            <span className={i === idx ? "text-white/80 text-[12px]" : "text-slack-text-muted text-[12px]"}>
              {c.desc}
            </span>
          </li>
        ))}
      </ul>
    </PopoverShell>
  );
}
