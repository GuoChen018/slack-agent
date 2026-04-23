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

export const useSlackStore = create<SlackState>((set, get) => ({
  currentUserId: "u_you",
  users: indexBy(users),
  conversations: indexBy(conversations),
  conversationOrder: conversations.map((c) => c.id),
  messages: indexBy(initialMessages),
  messageIdsByConversation: msgIdsByConv,

  activeConversationId: "c_proj_agentic",
  openThreadParentId: null,

  drafts: {},
  unread: {
    c_general: 2,
    c_announcements: 1,
    dm_mira: 1,
  },
  collapsedSections: {},
  quickSwitcherOpen: false,

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
