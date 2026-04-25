"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSlackStore } from "@/lib/store";
import { formatDayDivider } from "@/lib/format";
import { MessageRow } from "./Message";
import { PreflightEphemeral } from "./PreflightEphemeral";
import { Hash, Lock } from "lucide-react";

export function MessageList() {
  const convId = useSlackStore((s) => s.activeConversationId);
  const conv = useSlackStore((s) => s.conversations[convId]);
  const ids = useSlackStore((s) => s.messageIdsByConversation[convId] ?? []);
  const messages = useSlackStore((s) => s.messages);
  const openThread = useSlackStore((s) => s.openThread);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => ids.map((id) => messages[id]).filter(Boolean), [ids, messages]);

  // autoscroll to bottom on change
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [list.length, convId]);

  // Build grouped rows with day dividers
  const rows: React.ReactNode[] = [];
  let lastDay = "";
  let prevAuthor: string | null = null;
  let prevTime = 0;

  for (const msg of list) {
    const dayLabel = formatDayDivider(msg.createdAt);
    if (dayLabel !== lastDay) {
      rows.push(
        <div key={`d_${msg.id}`} className="relative my-4 flex items-center px-5">
          <div className="h-px flex-1 bg-slack-border" />
          <span className="mx-2 rounded-full border border-slack-border bg-white px-3 py-0.5 text-[12px] font-bold text-slack-text">
            {dayLabel}
          </span>
          <div className="h-px flex-1 bg-slack-border" />
        </div>,
      );
      lastDay = dayLabel;
      prevAuthor = null;
    }

    if (msg.preflight) {
      // Slackbot preflight ephemeral never groups with the previous author
      // and shouldn't reset author tracking — render it as its own row
      // and continue with prevAuthor unchanged so the next real message
      // groups correctly with whatever came before the preflight.
      rows.push(<PreflightEphemeral key={msg.id} message={msg} />);
      continue;
    }

    const compact =
      prevAuthor === msg.authorId && msg.createdAt - prevTime < 5 * 60_000;
    rows.push(
      <MessageRow
        key={msg.id}
        message={msg}
        compact={compact}
        onOpenThread={(id) => openThread(id)}
      />,
    );
    prevAuthor = msg.authorId;
    prevTime = msg.createdAt;
  }

  return (
    <div
      ref={scrollerRef}
      className="slack-scroll-light relative min-h-0 flex-1 overflow-y-auto bg-white"
    >
      {conv && <ChannelIntro />}
      <div className="pb-2">{rows}</div>
    </div>
  );
}

function ChannelIntro() {
  const conv = useSlackStore((s) => s.conversations[s.activeConversationId]);
  const usersById = useSlackStore((s) => s.users);
  const currentUserId = useSlackStore((s) => s.currentUserId);
  if (!conv) return null;

  if (conv.kind === "channel") {
    return (
      <div className="px-5 pt-8 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#f4ede4] text-slack-text">
          {conv.isPrivate ? <Lock size={18} /> : <Hash size={18} />}
        </div>
        <h1 className="mt-2 text-[28px] font-black leading-tight text-slack-text">
          {conv.isPrivate ? "" : "#"}
          {conv.name}
        </h1>
        <p className="mt-1 max-w-prose text-[14px] text-slack-text-muted">
          This is the very beginning of the{" "}
          <span className="font-bold">#{conv.name}</span> channel.{" "}
          {conv.purpose ?? conv.topic ?? "Say hello and introduce yourselves."}
        </p>
        <div className="mt-2 flex gap-2">
          <button className="rounded border border-slack-border bg-white px-2 py-1 text-[13px] font-semibold text-slack-text hover:bg-slack-pane-hover">
            Add people
          </button>
          <button className="rounded border border-slack-border bg-white px-2 py-1 text-[13px] font-semibold text-slack-text hover:bg-slack-pane-hover">
            Edit description
          </button>
        </div>
      </div>
    );
  }

  const otherIds = conv.memberIds.filter((id) => id !== currentUserId);
  const other = otherIds.length ? usersById[otherIds[0]] : usersById[currentUserId];
  if (!other) return null;

  return (
    <div className="px-5 pt-8 pb-4">
      <h1 className="text-[22px] font-black text-slack-text">
        {conv.kind === "dm" && conv.memberIds.length === 1
          ? `This is your space, ${other.displayName.split(" ")[0]}.`
          : conv.kind === "group_dm"
            ? `This is the start of a group conversation.`
            : `${other.displayName}`}
      </h1>
      <p className="mt-1 max-w-prose text-[14px] text-slack-text-muted">
        {conv.kind === "dm" && conv.memberIds.length === 1
          ? "Draft messages, keep to-dos, save notes – only visible to you."
          : `Only you${other ? ` and ${other.displayName}` : ""} are in this conversation.`}
      </p>
    </div>
  );
}
