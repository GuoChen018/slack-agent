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
  /** Ephemeral messages are only visible to the user identified by
   *  `ephemeralFor`. We use them for two flows today:
   *    - The Slackbot preflight that intercepts a Send when an `@agent`
   *      mention isn't yet connected to the user's account. Carries the
   *      original draft + the list of unconnected agents so the user can
   *      Connect (and auto-post), Send anyway (and trigger the realistic
   *      in-thread connect prompt), or Edit (return the draft to the
   *      composer).
   *    - The agent's in-thread "you haven't connected me yet" reply that
   *      appears after a user clicks Send anyway from the preflight. */
  ephemeralFor?: UserId;
  preflight?: {
    draftText: string;
    draftHtml?: string;
    unconnectedAgentIds: UserId[];
    threadParentId?: MessageId;
  };
  /** When set, this ephemeral row is the agent's in-thread connect prompt;
   *  clicking Connect should retroactively run `runAfterConnect` against the
   *  parent message in the thread. The label is shown on the prompt button
   *  (e.g., "Connect Agentforce"). */
  agentConnectPrompt?: {
    agentId: UserId;
    /** Mrkdwn the prompt body should render. */
    body: string;
    /** Action to run on the parent message after the user connects. */
    runAfterConnect: {
      kind: "agent_action";
      actionId: string;
    };
  };
}

export interface DraftState {
  text: string;
  // for contenteditable HTML persistence
  html?: string;
}
