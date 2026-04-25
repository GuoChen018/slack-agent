"use client";

import { create } from "zustand";
import type {
  Conversation,
  ConversationId,
  DraftState,
  Message,
  MessageId,
  Reaction,
  User,
  UserId,
} from "./types";
import { conversations, initialMessages, users } from "./mockData";
import { AGENTS, AGENTS_BY_ID, type AgentId } from "./agents";

export type { AgentId };
export type AgentMessageId = string;

export type AgentMessageStatus = "thinking" | "streaming" | "done";

export interface AgentMessage {
  id: AgentMessageId;
  agentId: AgentId;
  role: "user" | "agent";
  /** Full text rendered so far. For streaming agents, this grows over time. */
  text: string;
  status: AgentMessageStatus;
  createdAt: number;
  /** Propose-then-confirm UX for agent actions that should mutate the world.
   * `superseded` means the user typed an amendment in the agent composer; the
   * action loop then re-proposes a revised version of this message. */
  confirmation?: {
    status: "pending" | "confirmed" | "cancelled" | "superseded";
    confirmResponse: string[];
    amendResponse?: string[];
  };
}

/** Optional metadata attached to an agent's response when running a
 * contextual action that proposes a change. */
export interface AskAgentExtras {
  confirmation?: {
    confirmResponse: string[];
    amendResponse?: string[];
  };
}

/** Timing constants for the scripted agent response. Exported so the UI can reuse them if needed. */
export const AGENT_THINKING_MS = 700;
export const AGENT_STREAM_INTERVAL_MS = 220;

interface SlackState {
  currentUserId: UserId;
  users: Record<UserId, User>;
  conversations: Record<ConversationId, Conversation>;
  conversationOrder: ConversationId[];

  messages: Record<MessageId, Message>;
  messageIdsByConversation: Record<ConversationId, MessageId[]>;

  activeConversationId: ConversationId;
  openThreadParentId: MessageId | null;

  drafts: Record<ConversationId | "thread", DraftState>;
  unread: Record<ConversationId, number>;
  collapsedSections: Record<string, boolean>;
  quickSwitcherOpen: boolean;

  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;

  /** Width of the right-hand pane (thread or agent), draggable from its
   * left edge. Shared between `ThreadPane` and `AgentPane` so dragging once
   * persists for the rest of the session. */
  rightPaneWidth: number;
  setRightPaneWidth: (w: number) => void;

  openAgentId: AgentId | null;
  agentThreads: Record<AgentId, AgentMessage[]>;
  /** Per-agent first-run setup gate. Empty by default — every agent shows
   * the install screen once per session. */
  agentSetupComplete: Record<AgentId, boolean>;
  openAgent: (id: AgentId) => void;
  closeAgent: () => void;
  markAgentSetupComplete: (id: AgentId) => void;
  /**
   * Run a scripted agent turn: append the user's prompt, then an agent
   * placeholder that flips from `thinking` → `streaming` (revealing chunks
   * one at a time) → `done`.
   *
   * If `prompt` is null, no user message is appended (used for invited agents
   * and confirm-driven follow-ups that don't have a user-typed prompt).
   */
  askAgent: (
    agentId: AgentId,
    prompt: string | null,
    scriptedChunks: string[],
    extras?: AskAgentExtras,
  ) => void;
  /** Confirm a propose-style response. Streams the confirmResponse as a new
   * agent message and marks the proposal as confirmed. */
  confirmAgentAction: (messageId: AgentMessageId) => void;
  /** Decline a propose-style response. */
  cancelAgentAction: (messageId: AgentMessageId) => void;
  /** If a proposal is pending in this agent's thread, supersede it and stream
   * the amend response. The user's text is appended as a user message so the
   * thread reads as: proposal -> "make this change" -> revised proposal.
   * Returns true if an amendment was scheduled; false if no proposal was
   * pending (caller should fall back to a regular askAgent). */
  amendAgentProposal: (agentId: AgentId, userText: string) => boolean;

  setActiveConversation: (id: ConversationId) => void;
  openThread: (parentId: MessageId) => void;
  closeThread: () => void;

  sendMessage: (text: string, opts?: { html?: string; threadParentId?: MessageId }) => MessageId;
  editMessage: (id: MessageId, text: string) => void;
  deleteMessage: (id: MessageId) => void;

  toggleReaction: (id: MessageId, emoji: string) => void;

  setDraft: (key: ConversationId | "thread", draft: DraftState) => void;
  clearDraft: (key: ConversationId | "thread") => void;

  setSectionCollapsed: (section: string, collapsed: boolean) => void;

  setQuickSwitcher: (open: boolean) => void;
  markRead: (id: ConversationId) => void;
}

const indexBy = <T extends { id: string }>(arr: T[]) =>
  arr.reduce<Record<string, T>>((acc, x) => ((acc[x.id] = x), acc), {});

const msgIdsByConv = initialMessages.reduce<Record<string, string[]>>((acc, m) => {
  if (m.threadId) return acc;
  acc[m.conversationId] ??= [];
  acc[m.conversationId].push(m.id);
  return acc;
}, {});

for (const ids of Object.values(msgIdsByConv)) {
  ids.sort((a, b) => {
    const ma = initialMessages.find((x) => x.id === a)!;
    const mb = initialMessages.find((x) => x.id === b)!;
    return ma.createdAt - mb.createdAt;
  });
}

// Agents are first-class participants: they can author messages in channels,
// be @-mentioned, and appear in the user lookup. We mark them as bots so the
// "Agent" badge renders next to their name in the message list.
const usersWithAgents = {
  ...indexBy(users),
  ...Object.fromEntries(
    AGENTS.map((a) => [
      a.id,
      { ...a, isBot: true } as User,
    ]),
  ),
};

export const useSlackStore = create<SlackState>((set, get) => ({
  currentUserId: "u_you",
  users: usersWithAgents,
  conversations: indexBy(conversations),
  conversationOrder: conversations.map((c) => c.id),
  messages: indexBy(initialMessages),
  messageIdsByConversation: msgIdsByConv,

  activeConversationId: "c_eval_acme",
  openThreadParentId: null,

  drafts: {},
  unread: {
    c_general: 2,
    dm_decio: 1,
    dm_sarah: 1,
  },
  collapsedSections: {},
  quickSwitcherOpen: false,

  sidebarWidth: 291,
  setSidebarWidth: (w) =>
    set({ sidebarWidth: Math.max(180, Math.min(520, Math.round(w))) }),

  rightPaneWidth: 420,
  setRightPaneWidth: (w) =>
    set({ rightPaneWidth: Math.max(320, Math.min(720, Math.round(w))) }),

  openAgentId: null,
  agentThreads: {},
  agentSetupComplete: {},
  openAgent: (id) => set({ openAgentId: id }),
  closeAgent: () => set({ openAgentId: null }),
  markAgentSetupComplete: (id) =>
    set((s) => ({
      agentSetupComplete: { ...s.agentSetupComplete, [id]: true },
    })),

  askAgent: (agentId, prompt, scriptedChunks, extras) => {
    const now = Date.now();
    const rand = () => Math.random().toString(36).slice(2, 6);
    const agentMsgId: AgentMessageId = `am_${now}_a_${rand()}`;
    const newMsgs: AgentMessage[] = [];
    if (prompt !== null) {
      newMsgs.push({
        id: `am_${now}_u_${rand()}`,
        agentId,
        role: "user",
        text: prompt,
        status: "done",
        createdAt: now,
      });
    }
    newMsgs.push({
      id: agentMsgId,
      agentId,
      role: "agent",
      text: "",
      status: "thinking",
      createdAt: now + 1,
    });

    set((s) => ({
      agentThreads: {
        ...s.agentThreads,
        [agentId]: [...(s.agentThreads[agentId] ?? []), ...newMsgs],
      },
    }));

    const updateAgentMsg = (mut: (m: AgentMessage) => AgentMessage) => {
      set((s) => {
        const list = s.agentThreads[agentId] ?? [];
        const next = list.map((m) => (m.id === agentMsgId ? mut(m) : m));
        return { agentThreads: { ...s.agentThreads, [agentId]: next } };
      });
    };

    setTimeout(() => {
      updateAgentMsg((m) => ({ ...m, status: "streaming" }));
      let i = 0;
      const tick = () => {
        if (i >= scriptedChunks.length) {
          updateAgentMsg((m) => ({
            ...m,
            status: "done",
            confirmation: extras?.confirmation
              ? {
                  status: "pending",
                  confirmResponse: extras.confirmation.confirmResponse,
                  amendResponse: extras.confirmation.amendResponse,
                }
              : undefined,
          }));
          return;
        }
        const chunk = scriptedChunks[i++];
        updateAgentMsg((m) => ({ ...m, text: m.text + chunk }));
        setTimeout(tick, AGENT_STREAM_INTERVAL_MS);
      };
      tick();
    }, AGENT_THINKING_MS);
  },

  confirmAgentAction: (messageId) => {
    const state = get();
    let host: AgentId | null = null;
    let confirmResponse: string[] | null = null;
    for (const [aid, msgs] of Object.entries(state.agentThreads)) {
      const hit = msgs.find((m) => m.id === messageId);
      if (hit?.confirmation) {
        host = aid;
        confirmResponse = hit.confirmation.confirmResponse;
        break;
      }
    }
    if (!host || !confirmResponse) return;
    set((s) => ({
      agentThreads: {
        ...s.agentThreads,
        [host!]: (s.agentThreads[host!] ?? []).map((m) =>
          m.id === messageId && m.confirmation
            ? { ...m, confirmation: { ...m.confirmation, status: "confirmed" } }
            : m,
        ),
      },
    }));
    get().askAgent(host, null, confirmResponse);
  },

  cancelAgentAction: (messageId) =>
    set((s) => {
      const next = { ...s.agentThreads };
      for (const [aid, msgs] of Object.entries(next)) {
        if (msgs.some((m) => m.id === messageId)) {
          next[aid] = msgs.map((m) =>
            m.id === messageId && m.confirmation
              ? {
                  ...m,
                  confirmation: { ...m.confirmation, status: "cancelled" },
                }
              : m,
          );
        }
      }
      return { agentThreads: next };
    }),

  amendAgentProposal: (agentId, userText) => {
    const list = get().agentThreads[agentId] ?? [];
    // Find the most recent message with a pending proposal that has an
    // amendResponse to fall back on.
    const pending = [...list]
      .reverse()
      .find(
        (m) =>
          m.confirmation?.status === "pending" &&
          m.confirmation.amendResponse &&
          m.confirmation.amendResponse.length > 0,
      );
    if (!pending) return false;
    const amendChunks = pending.confirmation!.amendResponse!;
    // Mark the prior proposal as superseded so the UI renders it as an
    // "Edited" entry without Confirm/Cancel.
    set((s) => ({
      agentThreads: {
        ...s.agentThreads,
        [agentId]: (s.agentThreads[agentId] ?? []).map((m) =>
          m.id === pending.id && m.confirmation
            ? { ...m, confirmation: { ...m.confirmation, status: "superseded" } }
            : m,
        ),
      },
    }));
    // Re-stream a revised proposal. The new message inherits the same
    // confirmResponse so Confirm still applies the (revised) update.
    get().askAgent(agentId, userText, amendChunks, {
      confirmation: {
        confirmResponse: pending.confirmation!.confirmResponse,
        amendResponse: amendChunks,
      },
    });
    return true;
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id, openThreadParentId: null });
    get().markRead(id);
  },

  openThread: (parentId) => set({ openThreadParentId: parentId }),
  closeThread: () => set({ openThreadParentId: null }),

  sendMessage: (text, opts) => {
    const state = get();
    const id: MessageId = `m_local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const message: Message = {
      id,
      conversationId: state.activeConversationId,
      authorId: state.currentUserId,
      text,
      createdAt: Date.now(),
      reactions: [],
      threadId: opts?.threadParentId,
    };

    set((s) => {
      const messages = { ...s.messages, [id]: message };
      let messageIdsByConversation = s.messageIdsByConversation;

      if (!opts?.threadParentId) {
        const convIds = s.messageIdsByConversation[state.activeConversationId] ?? [];
        messageIdsByConversation = {
          ...s.messageIdsByConversation,
          [state.activeConversationId]: [...convIds, id],
        };
      } else {
        // bump parent metadata
        const parent = s.messages[opts.threadParentId];
        if (parent) {
          const count = (parent.replyCount ?? 0) + 1;
          const replyUserIds = Array.from(
            new Set([...(parent.replyUserIds ?? []), state.currentUserId]),
          ).slice(-3);
          messages[opts.threadParentId] = {
            ...parent,
            replyCount: count,
            replyUserIds,
            lastReplyAt: Date.now(),
          };
        }
      }
      return { messages, messageIdsByConversation };
    });

    // Multi-agent in public: any @-mentioned agent auto-replies in the
    // resulting thread. The user's message becomes the thread parent (or, if
    // already in a thread, the existing parent stays). Agents post one after
    // another so the conversation reads naturally. We don't auto-open the
    // thread — the parent's reply preview (avatar stack + count) is the
    // affordance for the user to peek in.
    const mentionedAgentIds = extractAgentMentionIds(opts?.html ?? "", text);
    if (mentionedAgentIds.length > 0) {
      const threadParentId = opts?.threadParentId ?? id;
      scheduleAgentThreadReplies(
        get,
        set,
        threadParentId,
        mentionedAgentIds,
        text,
      );
    }
    return id;
  },

  editMessage: (id, text) =>
    set((s) => {
      const msg = s.messages[id];
      if (!msg) return s;
      return {
        messages: { ...s.messages, [id]: { ...msg, text, editedAt: Date.now() } },
      };
    }),

  deleteMessage: (id) =>
    set((s) => {
      const msg = s.messages[id];
      if (!msg) return s;
      const nextMsgs = { ...s.messages };
      delete nextMsgs[id];
      const ids = s.messageIdsByConversation[msg.conversationId] ?? [];
      return {
        messages: nextMsgs,
        messageIdsByConversation: {
          ...s.messageIdsByConversation,
          [msg.conversationId]: ids.filter((x) => x !== id),
        },
      };
    }),

  toggleReaction: (id, emoji) =>
    set((s) => {
      const msg = s.messages[id];
      if (!msg) return s;
      const me = s.currentUserId;
      const existing = msg.reactions.find((r) => r.emoji === emoji);
      let reactions: Reaction[];
      if (!existing) {
        reactions = [...msg.reactions, { emoji, userIds: [me] }];
      } else if (existing.userIds.includes(me)) {
        const without = existing.userIds.filter((u) => u !== me);
        reactions = without.length
          ? msg.reactions.map((r) => (r.emoji === emoji ? { ...r, userIds: without } : r))
          : msg.reactions.filter((r) => r.emoji !== emoji);
      } else {
        reactions = msg.reactions.map((r) =>
          r.emoji === emoji ? { ...r, userIds: [...r.userIds, me] } : r,
        );
      }
      return { messages: { ...s.messages, [id]: { ...msg, reactions } } };
    }),

  setDraft: (key, draft) =>
    set((s) => ({ drafts: { ...s.drafts, [key]: draft } })),
  clearDraft: (key) =>
    set((s) => {
      const next = { ...s.drafts };
      delete next[key];
      return { drafts: next };
    }),

  setSectionCollapsed: (section, collapsed) =>
    set((s) => ({
      collapsedSections: { ...s.collapsedSections, [section]: collapsed },
    })),

  setQuickSwitcher: (open) => set({ quickSwitcherOpen: open }),

  markRead: (id) =>
    set((s) => {
      if (!s.unread[id]) return s;
      const next = { ...s.unread };
      delete next[id];
      return { unread: next };
    }),
}));

/**
 * Extract @-mentioned agent ids from a sent message. Prefers the rich HTML
 * (`<span class="mention" data-user="_gong">`) but falls back to scanning the
 * plain text for `@handle` tokens so seeded messages still work.
 */
function extractAgentMentionIds(html: string, text: string): AgentId[] {
  const seen = new Set<AgentId>();
  const out: AgentId[] = [];
  if (html) {
    const re = /data-user="(_[\w]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const id = m[1];
      if (AGENTS_BY_ID[id] && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  if (out.length === 0) {
    const re = /@([a-z0-9_-]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const handle = m[1].toLowerCase();
      const agent = AGENTS.find((a) => a.handle === handle);
      if (agent && !seen.has(agent.id)) {
        seen.add(agent.id);
        out.push(agent.id);
      }
    }
  }
  return out;
}

/**
 * Create one thread reply per @-mentioned agent up-front so the user sees the
 * full queue (e.g. Agentforce ⏳ working, Gong 🕒 waiting). The first agent
 * starts in `thinking`; the rest are `queued`. Each agent runs in turn:
 * queued → thinking → streaming → done, then promotes the next.
 */
function scheduleAgentThreadReplies(
  get: () => SlackState,
  set: (
    fn:
      | Partial<SlackState>
      | ((s: SlackState) => Partial<SlackState>),
  ) => void,
  threadParentId: MessageId,
  agentIds: AgentId[],
  draftText: string,
) {
  const validAgents = agentIds.filter((id) => AGENTS_BY_ID[id]);
  if (validAgents.length === 0) return;

  const baseTs = Date.now();
  const replyIds: MessageId[] = validAgents.map(
    (_, i) =>
      `m_agent_${baseTs + i}_${Math.random().toString(36).slice(2, 6)}`,
  );

  // 1. Create all agent reply messages at once. First one is `thinking`,
  // the rest are `queued`. We add the agents to `replyUserIds` so the
  // channel-level lineup of avatars renders right away, but we don't bump
  // `replyCount` or `lastReplyAt` yet — those reflect *finished* replies, so
  // the count only ticks up when an agent actually flips to "done".
  set((s) => {
    const messages = { ...s.messages };
    validAgents.forEach((agentId, i) => {
      messages[replyIds[i]] = {
        id: replyIds[i],
        conversationId: s.activeConversationId,
        authorId: agentId,
        text: "",
        createdAt: baseTs + i,
        reactions: [],
        threadId: threadParentId,
        agentStatus: i === 0 ? "thinking" : "queued",
      };
    });
    const parent = s.messages[threadParentId];
    if (parent) {
      const replyUserIds = Array.from(
        new Set([...(parent.replyUserIds ?? []), ...validAgents]),
      ).slice(-3);
      messages[threadParentId] = {
        ...parent,
        replyUserIds,
      };
    }
    return { messages };
  });

  const updateMsg = (id: MessageId, mut: (m: Message) => Message) => {
    set((s) => {
      const cur = s.messages[id];
      if (!cur) return {};
      return { messages: { ...s.messages, [id]: mut(cur) } };
    });
  };

  const runOne = (idx: number) => {
    if (idx >= validAgents.length) return;
    const agentId = validAgents[idx];
    const agent = AGENTS_BY_ID[agentId];
    const replyId = replyIds[idx];
    const chunks = agent.channelReply(draftText, validAgents.slice(0, idx));

    setTimeout(() => {
      updateMsg(replyId, (m) => ({ ...m, agentStatus: "streaming" }));
      let i = 0;
      const tick = () => {
        if (i >= chunks.length) {
          // Mark this agent done AND bump the parent's replyCount/lastReplyAt
          // so "X replies" counts only finished agents and "Last reply just
          // now" tracks the most recent done reply.
          set((s) => {
            const cur = s.messages[replyId];
            const parent = s.messages[threadParentId];
            if (!cur || !parent) return {};
            const doneAt = Date.now();
            return {
              messages: {
                ...s.messages,
                [replyId]: { ...cur, agentStatus: "done" },
                [threadParentId]: {
                  ...parent,
                  replyCount: (parent.replyCount ?? 0) + 1,
                  lastReplyAt: doneAt,
                },
              },
            };
          });
          // Promote the next agent from `queued` to `thinking` after a small
          // breath so the queue advances visibly.
          if (idx + 1 < validAgents.length) {
            setTimeout(() => {
              updateMsg(replyIds[idx + 1], (m) => ({
                ...m,
                agentStatus: "thinking",
              }));
              runOne(idx + 1);
            }, 400);
          }
          return;
        }
        const chunk = chunks[i++];
        updateMsg(replyId, (m) => ({ ...m, text: m.text + chunk }));
        setTimeout(tick, AGENT_STREAM_INTERVAL_MS);
      };
      tick();
    }, AGENT_THINKING_MS);
  };
  runOne(0);
}
