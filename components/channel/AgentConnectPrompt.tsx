"use client";

import clsx from "clsx";
import { Eye, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useSlackStore } from "@/lib/store";
import { renderMrkdwn } from "@/lib/format";
import type { Message as Msg } from "@/lib/types";

interface Props {
  message: Msg;
}

/** In-thread ephemeral that an unconnected agent posts after the user
 *  chose "Send anyway" from the preflight. Only visible to the sender;
 *  Connect retroactively runs the agent's reply against the thread parent. */
export function AgentConnectPrompt({ message }: Props) {
  const users = useSlackStore((s) => s.users);
  const conversations = useSlackStore((s) => s.conversations);
  const removeEphemeral = useSlackStore((s) => s.removeEphemeral);
  const connectAndRunOnParent = useSlackStore((s) => s.connectAndRunOnParent);
  const [connecting, setConnecting] = useState(false);

  const convsByName = useMemo(() => {
    const out: Record<string, { id: string; name: string }> = {};
    for (const c of Object.values(conversations)) {
      if (c.kind === "channel") {
        out[c.name.toLowerCase()] = { id: c.id, name: c.name };
      }
    }
    return out;
  }, [conversations]);

  // Pull out the prompt fields with safe defaults so we can hoist the
  // useMemo above any early returns (rules-of-hooks).
  const prompt = message.agentConnectPrompt;
  const agentId = prompt?.agentId ?? "";
  const body = prompt?.body ?? "";
  const runAfterConnect = prompt?.runAfterConnect;
  const bodyHtml = useMemo(
    () => renderMrkdwn(body, users, convsByName),
    [body, users, convsByName],
  );

  if (!prompt) return null;
  const agent = users[agentId];
  if (!agent || !runAfterConnect) return null;

  const handleConnect = () => {
    if (connecting) return;
    setConnecting(true);
    window.setTimeout(() => {
      // Drop the prompt first, then schedule the retroactive run against
      // the thread parent. The agent's normal channel-reply flow takes it
      // from there (queued -> thinking -> streaming -> done).
      const parentId = message.threadId;
      removeEphemeral(message.id);
      if (parentId) connectAndRunOnParent(parentId, agentId, runAfterConnect.actionId);
    }, 700);
  };

  return (
    <div className="group relative flex gap-2 px-5 py-1">
      <div className="w-9 flex-shrink-0 pt-[2px]">
        <Avatar user={agent} size={36} rounded="md" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-bold text-slack-text">
            {agent.displayName}
          </span>
          <span className="rounded bg-[#e8e8e8] px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-slack-text-muted">
            Agent
          </span>
          <span className="ml-1 inline-flex items-center gap-1 text-[12px] text-slack-text-light">
            <Eye size={11} className="-mt-px" />
            Only visible to you
          </span>
        </div>
        <div className="mt-0.5 max-w-[640px] text-[15px] text-slack-text">
          <div
            className="message-body leading-[1.46]"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
          <div className="mt-2 flex items-center gap-1.5">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className={clsx(
                "flex h-7 items-center gap-1.5 rounded-md border bg-white px-3 text-[13px] font-bold text-slack-text",
                "border-slack-border hover:bg-slack-pane-hover",
                "disabled:cursor-default disabled:opacity-70 disabled:hover:bg-white",
              )}
            >
              {connecting ? (
                <>
                  <Loader2
                    size={13}
                    strokeWidth={2.4}
                    className="animate-spin text-slack-text-muted"
                  />
                  Connecting {agent.displayName}…
                </>
              ) : (
                `Connect ${agent.displayName}`
              )}
            </button>
            <button
              onClick={() => removeEphemeral(message.id)}
              disabled={connecting}
              className="flex h-7 items-center rounded-md px-2 text-[13px] text-slack-text-muted hover:bg-slack-pane-hover disabled:cursor-default disabled:opacity-70"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
