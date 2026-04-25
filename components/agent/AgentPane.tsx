"use client";

import clsx from "clsx";
import { Check, Clock, ExternalLink, MoreHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Avatar } from "@/components/Avatar";
import { Composer } from "@/components/composer/Composer";
import { AiSparkleIcon } from "@/components/icons/AiSparkleIcon";
import { RightPaneResizer } from "@/components/shell/RightPaneResizer";
import { useSlackStore, type AgentMessage } from "@/lib/store";
import {
  AGENTS_BY_ID,
  suggestActionsForDraft,
  type ContextualAction,
  type AgentMeta,
} from "@/lib/agents";
import { formatTime, renderMrkdwn } from "@/lib/format";
import type { User } from "@/lib/types";

export function AgentPane() {
  const openAgentId = useSlackStore((s) => s.openAgentId);
  const closeAgent = useSlackStore((s) => s.closeAgent);
  const askAgent = useSlackStore((s) => s.askAgent);
  const confirmAgentAction = useSlackStore((s) => s.confirmAgentAction);
  const cancelAgentAction = useSlackStore((s) => s.cancelAgentAction);
  const agentSetupComplete = useSlackStore((s) => s.agentSetupComplete);
  const markAgentSetupComplete = useSlackStore((s) => s.markAgentSetupComplete);
  const agentThreads = useSlackStore((s) => s.agentThreads);
  const activeConvId = useSlackStore((s) => s.activeConversationId);
  const drafts = useSlackStore((s) => s.drafts);
  const users = useSlackStore((s) => s.users);
  const currentUserId = useSlackStore((s) => s.currentUserId);
  const conversations = useSlackStore((s) => s.conversations);
  const width = useSlackStore((s) => s.rightPaneWidth);

  const currentUser = users[currentUserId];

  const agent = openAgentId ? AGENTS_BY_ID[openAgentId] : null;
  const messages = useMemo(
    () => (openAgentId ? agentThreads[openAgentId] ?? [] : []),
    [openAgentId, agentThreads],
  );

  const draftText = drafts[activeConvId]?.text ?? "";
  const actions = useMemo(
    () => (agent ? suggestActionsForDraft(agent, draftText) : []),
    [agent, draftText],
  );
  const hasConfirmedAction = useMemo(
    () => messages.some((m) => m.confirmation?.status === "confirmed"),
    [messages],
  );
  // While a proposal is still waiting on Confirm/Cancel/amend, suppress
  // the follow-up suggestions row beneath it. Otherwise the agent looks
  // like it's offering unrelated next actions on top of an open question.
  const hasPendingProposal = useMemo(
    () => messages.some((m) => m.confirmation?.status === "pending"),
    [messages],
  );

  // Auto-scroll the message list as new chunks stream in.
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const conversationsByName = useMemo(() => {
    const out: Record<string, { id: string; name: string }> = {};
    for (const c of Object.values(conversations)) {
      if (c.kind === "channel") out[c.name.toLowerCase()] = { id: c.id, name: c.name };
    }
    return out;
  }, [conversations]);

  if (!agent || !openAgentId) return null;

  const runAction = (action: ContextualAction) => {
    askAgent(openAgentId, action.label, action.response, {
      confirmation: action.requiresConfirmation
        ? {
            confirmResponse: action.confirmResponse ?? [],
            amendResponse: action.amendResponse,
          }
        : undefined,
    });
  };

  const isSetup = !!agentSetupComplete[openAgentId];

  return (
    <aside
      // Right panes flex-shrink with the main pane: when the user has both
      // a thread and an agent open at the same time on a narrower window,
      // we let the right panes contract toward `minWidth` so the channel
      // itself stays usable. Drag-resizing still updates `rightPaneWidth`,
      // which acts as the preferred (max) width here.
      className="relative ml-1.5 flex h-full flex-col overflow-hidden rounded-lg bg-white"
      style={{ width, minWidth: 280, flexShrink: 1 }}
    >
      <RightPaneResizer />
      <header className="flex h-[50px] items-center justify-between border-b border-slack-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar user={agent} size={28} rounded="md" />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-black text-slack-text">
              {agent.displayName}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            className="rounded p-1 text-slack-text-muted hover:bg-slack-pane-hover"
            title="History"
          >
            <Clock size={16} />
          </button>
          <button
            className="rounded p-1 text-slack-text-muted hover:bg-slack-pane-hover"
            title="More"
          >
            <MoreHorizontal size={16} />
          </button>
          <button
            onClick={closeAgent}
            className="rounded p-1 text-slack-text-muted hover:bg-slack-pane-hover"
            title="Close agent"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div ref={scrollerRef} className="slack-scroll-light flex-1 overflow-y-auto">
        {!isSetup ? (
          <SetupScreen
            agent={agent}
            onInstall={() => markAgentSetupComplete(openAgentId)}
          />
        ) : (
          // Intro flows directly into the conversation as one continuous
          // column. `min-h-full` + `justify-end` keeps the whole cluster
          // (intro + suggested actions or messages) hugging the bottom of
          // the pane until the content overflows and starts scrolling.
          <div className="flex min-h-full flex-col justify-end pb-4">
            <IntroHeader agent={agent} />
            <div className="px-4">
              {messages.length === 0 ? (
                <SuggestedActions actions={actions} onPick={runAction} />
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((m) => (
                    <AgentMessageRow
                      key={m.id}
                      message={m}
                      hostAgent={agent}
                      currentUser={currentUser}
                      users={users}
                      conversationsByName={conversationsByName}
                      onConfirm={() => confirmAgentAction(m.id)}
                      onCancel={() => cancelAgentAction(m.id)}
                    />
                  ))}
                  {messages.every((m) => m.status === "done") && !hasPendingProposal && (
                    <div className="mt-2 flex gap-2">
                      {/* Spacer matches the avatar column on AgentMessageRow so the
                       *  follow-up chips line up with the agent's text. */}
                      <div className="w-9 flex-shrink-0" />
                      <div className="flex flex-wrap gap-1.5">
                        {/* After Jordan confirms a write-back action (today
                         * that's only the Salesforce update), swap the
                         * suggested follow-ups for a single "View in
                         * Salesforce" link so the demo lands the punchline. */}
                        {hasConfirmedAction && agent.id === "agent_agentforce" ? (
                          <a
                            href="https://salesforce.com"
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-7 items-center gap-1.5 rounded-md border border-slack-border bg-white px-3 text-[12px] text-slack-text hover:bg-slack-pane-hover"
                          >
                            View in Salesforce
                            <ExternalLink size={12} className="text-slack-text-muted" />
                          </a>
                        ) : (
                          actions.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => runAction(a)}
                              className="flex h-7 items-center rounded-md border border-slack-border bg-white px-3 text-[12px] text-slack-text hover:bg-slack-pane-hover"
                            >
                              {a.label}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isSetup && (
        <Composer agentId={openAgentId} placeholder={`Message ${agent.displayName}`} />
      )}
    </aside>
  );
}

function IntroHeader({ agent }: { agent: AgentMeta }) {
  return (
    <div className="flex flex-col items-start px-5 pt-6 pb-3 text-left">
      <Avatar user={agent} size={56} rounded="lg" />
      <div className="mt-3 flex items-center gap-1.5">
        <h2 className="text-[20px] font-black text-slack-text">
          {agent.displayName}
        </h2>
        <span className="rounded bg-slack-pane-alt px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wide text-slack-text-muted">
          Agent
        </span>
      </div>
      <p className="mt-1 text-[13px] text-slack-text-muted">{agent.tagline}</p>

      {agent.contextSummary && (
        <div className="mt-4 w-full rounded-md border border-slack-border bg-slack-pane-alt px-3 py-2.5">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slack-text-muted">
            Context I have
          </div>
          <p className="text-[13px] leading-snug text-slack-text">
            {agent.contextSummary}
          </p>
        </div>
      )}
    </div>
  );
}

function SuggestedActions({
  actions,
  onPick,
}: {
  actions: ContextualAction[];
  onPick: (a: ContextualAction) => void;
}) {
  if (actions.length === 0) return null;
  return (
    <div className="px-1">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slack-text-muted">
        <AiSparkleIcon size={12} />
        Suggested actions
      </div>
      <ul className="flex flex-col gap-1.5">
        {actions.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => onPick(a)}
              className="w-full rounded-md border border-slack-border bg-white px-3 py-2 text-left text-[13px] text-slack-text transition-colors hover:bg-slack-pane-hover"
            >
              {a.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AgentMessageRow({
  message,
  hostAgent,
  currentUser,
  users,
  conversationsByName,
  onConfirm,
  onCancel,
}: {
  message: AgentMessage;
  hostAgent: AgentMeta;
  currentUser: User | undefined;
  users: Record<string, User>;
  conversationsByName: Record<string, { id: string; name: string }>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex gap-2">
        {currentUser ? (
          <Avatar user={currentUser} size={36} rounded="md" />
        ) : (
          <div className="h-9 w-9 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-black text-slack-text">
              {currentUser?.displayName ?? "You"}
            </span>
            <span className="text-[12px] text-slack-text-light">
              {formatTime(message.createdAt)}
            </span>
          </div>
          <div className="whitespace-pre-wrap text-[15px] text-slack-text">
            {message.text}
          </div>
        </div>
      </div>
    );
  }

  const confirmation = message.confirmation;

  return (
    <div className="flex gap-2">
      <Avatar user={hostAgent} size={36} rounded="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-black text-slack-text">
            {hostAgent.displayName}
          </span>
          <span className="rounded bg-slack-pane-alt px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wide text-slack-text-muted">
            Agent
          </span>
          <span className="text-[12px] text-slack-text-light">
            {formatTime(message.createdAt)}
          </span>
        </div>
        {message.status === "thinking" ? (
          <div className="text-[15px]">
            <span className="shimmer-text">Thinking…</span>
          </div>
        ) : (
          <div
            className={clsx(
              "agent-msg text-[15px]",
              message.status === "streaming" && "agent-msg-streaming",
              confirmation?.status === "superseded"
                ? "text-slack-text-muted opacity-60"
                : "text-slack-text",
            )}
            dangerouslySetInnerHTML={{
              __html: renderMrkdwn(message.text, users, conversationsByName),
            }}
          />
        )}

        {/* Confirm / Cancel for proposal-style responses. */}
        {confirmation && message.status === "done" && (
          <div className="mt-2">
            {confirmation.status === "pending" ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onConfirm}
                    className="flex h-7 items-center rounded-md bg-[#007a5a] px-3 text-[12px] font-bold text-white hover:bg-[#148567]"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={onCancel}
                    className="flex h-7 items-center rounded-md border border-slack-border-strong bg-white px-3 text-[12px] font-bold text-slack-text hover:bg-slack-pane-hover"
                  >
                    Cancel
                  </button>
                </div>
                {confirmation.amendResponse && (
                  <p className="mt-1.5 text-[11px] italic text-slack-text-muted">
                    Or type a change below to revise.
                  </p>
                )}
              </>
            ) : confirmation.status === "confirmed" ? (
              <span className="text-[12px] font-bold text-[#007a5a]">
                Confirmed
              </span>
            ) : confirmation.status === "superseded" ? (
              <span className="text-[12px] text-slack-text-muted">Edited</span>
            ) : (
              <span className="text-[12px] text-slack-text-muted">
                Cancelled
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function SetupScreen({
  agent,
  onInstall,
}: {
  agent: AgentMeta;
  onInstall: () => void;
}) {
  // Per-user OAuth scopes — "your" not "workspace". This is the same pattern
  // Slack apps use today (e.g. Cursor, Linear, GitHub) where the workspace
  // install is admin-handled and each user links their own account once
  // before the agent can act on their behalf.
  const scopes = [
    `Act on your behalf in ${agent.displayName}`,
    `Read records you have access to in ${agent.displayName}`,
    `Reply in Slack channels you're already in`,
  ];
  return (
    <div className="flex h-full flex-col items-start justify-end px-5 pt-8 pb-6">
      <Avatar user={agent} size={64} rounded="lg" />
      <div className="mt-3 flex items-center gap-1.5">
        <h2 className="text-[20px] font-black text-slack-text">
          {agent.displayName}
        </h2>
        <span className="rounded bg-slack-pane-alt px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wide text-slack-text-muted">
          Agent
        </span>
      </div>
      <p className="mt-1 text-[13px] text-slack-text-muted">
        Link your {agent.displayName} account so it can act on your behalf
        from Slack.
      </p>

      <ul className="mt-5 w-full space-y-2">
        {scopes.map((s) => (
          <li key={s} className="flex items-start gap-2 text-[13px] text-slack-text">
            <Check
              size={14}
              strokeWidth={2.6}
              className="mt-[3px] flex-shrink-0 text-[#007a5a]"
            />
            <span>{s}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onInstall}
        className="mt-6 flex h-9 items-center justify-center rounded bg-[#007a5a] px-4 text-[14px] font-bold text-white hover:bg-[#148567]"
      >
        Link Account
      </button>
      <p className="mt-3 text-[11px] leading-snug text-slack-text-muted">
        You'll be redirected to {agent.displayName} to sign in. You can revoke
        access at any time from Slack settings.
      </p>
    </div>
  );
}
