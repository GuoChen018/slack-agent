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

/** Slackbot-style ephemeral that intercepts a Send when the draft mentions
 *  agents the user hasn't connected yet. Shows a preview of the original
 *  draft so the user knows exactly what's about to go out, plus three
 *  actions:
 *   - Connect Account(s): simulate OAuth, then post the public message.
 *   - Send Message: post the public message anyway; the unconnected agents
 *     will then drop their own ephemeral connect prompts in the thread.
 *   - Edit: drop the ephemeral and restore the draft to the composer so
 *     the user can change wording before retrying. */
export function PreflightEphemeral({ message }: Props) {
  const users = useSlackStore((s) => s.users);
  const conversations = useSlackStore((s) => s.conversations);
  const setDraft = useSlackStore((s) => s.setDraft);
  const requestDraftRehydrate = useSlackStore((s) => s.requestDraftRehydrate);
  const removeEphemeral = useSlackStore((s) => s.removeEphemeral);
  const resolvePreflight = useSlackStore((s) => s.resolvePreflight);
  const activeConvId = useSlackStore((s) => s.activeConversationId);
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

  // Pull preflight fields with safe defaults so the useMemo below can sit
  // above any early returns and stay rules-of-hooks-clean.
  const preflight = message.preflight;
  const draftText = preflight?.draftText ?? "";
  const draftHtml = preflight?.draftHtml;
  const unconnectedAgentIds = preflight?.unconnectedAgentIds ?? [];
  const threadParentId = preflight?.threadParentId;

  const previewHtml = useMemo(
    () => renderMrkdwn(draftText, users, convsByName),
    [draftText, users, convsByName],
  );

  if (!preflight) return null;
  const agentNames = unconnectedAgentIds
    .map((id) => users[id]?.displayName)
    .filter(Boolean);
  const count = agentNames.length;

  // Headline switches between agent-named and generic-counted depending on
  // how many agents are unconnected — keeps the single-agent case readable
  // ("Agentforce isn't connected") while not exploding into a paragraph
  // when there are several.
  const headline =
    count === 1
      ? `${agentNames[0]} isn't connected to your account yet.`
      : `${count} agents aren't connected to your account yet.`;
  const subline =
    count === 1
      ? "Connect once and it can act on this message — or send anyway and connect from the thread."
      : "Connect once and they can act on this message — or send anyway and connect from the thread.";
  const connectLabel =
    count === 1 ? `Connect ${agentNames[0]}` : `Connect ${count} accounts`;
  const connectingLabel =
    count === 1
      ? `Connecting ${agentNames[0]}…`
      : `Connecting ${count} accounts…`;

  const handleConnect = () => {
    if (connecting) return;
    setConnecting(true);
    // Simulated OAuth roundtrip — same 700ms heartbeat we use elsewhere so
    // the demo "feels" like a real OAuth handshake without actually leaving
    // the page. Slightly longer for multi-agent so a human can read the
    // label change.
    const ms = count === 1 ? 700 : 900;
    window.setTimeout(() => {
      resolvePreflight(message.id, "connect");
      setConnecting(false);
    }, ms);
  };

  const handleSendAnyway = () => {
    if (connecting) return;
    resolvePreflight(message.id, "send-anyway");
  };

  const handleEdit = () => {
    if (connecting) return;
    // Restore the draft to the composer for whichever surface the preflight
    // came from (main composer vs. thread reply composer), then dismiss.
    // The composer only auto-rehydrates on draftKey change, so we bump a
    // nonce to force it to reload the draft DOM.
    const draftKey = threadParentId ? "thread" : activeConvId;
    setDraft(draftKey, { text: draftText, html: draftHtml });
    requestDraftRehydrate(draftKey);
    removeEphemeral(message.id);
  };

  return (
    <div className="group relative mt-3 flex gap-2 px-5 py-1">
      {/* Slackbot avatar — same purple lavender treatment Slack uses for
       *  ephemeral / system messages today. */}
      <div className="w-9 flex-shrink-0 pt-[2px]">
        <Avatar user={users["u_slackbot"]} size={36} rounded="md" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-bold text-slack-text">
            Slackbot
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
          <p className="leading-[1.46]">
            <span className="font-semibold">{headline}</span>{" "}
            <span className="text-slack-text-muted">{subline}</span>
          </p>

          {/* Preview of the original draft, in a quote-block treatment so
           *  it reads like "here's what you're about to send" without
           *  competing visually with the Slackbot copy above. */}
          <div className="mt-2 border-l-4 border-[#dddddd] px-3 py-1">
            <div
              className="message-body text-[14px] leading-[1.46] text-slack-text"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
                  {connectingLabel}
                </>
              ) : (
                connectLabel
              )}
            </button>
            <button
              onClick={handleSendAnyway}
              disabled={connecting}
              className="flex h-7 items-center gap-1.5 rounded-md border border-slack-border bg-white px-3 text-[13px] font-bold text-slack-text hover:bg-slack-pane-hover disabled:cursor-default disabled:opacity-70"
            >
              Send anyway
            </button>
            <button
              onClick={handleEdit}
              disabled={connecting}
              className="flex h-7 items-center gap-1.5 rounded-md border border-slack-border bg-white px-3 text-[13px] font-bold text-slack-text hover:bg-slack-pane-hover disabled:cursor-default disabled:opacity-70"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
