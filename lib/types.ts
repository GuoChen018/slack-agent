export type UserId = string;
export type ConversationId = string;
export type MessageId = string;

export type Presence = "active" | "away" | "offline";

export interface User {
  id: UserId;
  name: string;
  displayName: string;
  handle: string;
  title?: string;
  avatarColor: string; // solid color fallback
  avatarEmoji?: string;
  avatarUrl?: string; // portrait image
  presence: Presence;
  status?: { emoji: string; text: string };
  isBot?: boolean;
  isAgent?: boolean;
}

export type ConversationKind = "channel" | "dm" | "group_dm";

export interface Conversation {
  id: ConversationId;
  kind: ConversationKind;
  name: string; // channel name (without #) or joined DM names
  topic?: string;
  purpose?: string;
  isPrivate?: boolean;
  memberIds: UserId[];
  pinnedMessageIds?: MessageId[];
  createdBy?: UserId;
  muted?: boolean;
}

export interface Reaction {
  emoji: string;
  userIds: UserId[];
}

export interface FileAttachment {
  id: string;
  name: string;
  kind: "image" | "file" | "pdf" | "video";
  size?: string;
  url?: string;
  preview?: string;
}

export interface Message {
  id: MessageId;
  conversationId: ConversationId;
  authorId: UserId;
  text: string; // Slack mrkdwn
  createdAt: number; // epoch ms
  editedAt?: number;
  deletedAt?: number;
  reactions: Reaction[];
  threadId?: MessageId; // if replying in thread: parent message id
  replyCount?: number; // on parent
  replyUserIds?: UserId[]; // last 3 for avatars on parent
  lastReplyAt?: number;
  attachments?: FileAttachment[];
  isSystem?: boolean;
  /** Set on agent-authored messages while a scripted reply is mid-flight.
   * Drives the per-agent status indicator in the thread UI. `queued` means
   * the agent is waiting for a previous agent to finish before it starts. */
  agentStatus?: "queued" | "thinking" | "streaming" | "done";
}

export interface DraftState {
  text: string;
  // for contenteditable HTML persistence
  html?: string;
}
