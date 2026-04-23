import type { Conversation, Message, User } from "./types";

const now = Date.now();
const min = 60_000;
const hr = 60 * min;
const day = 24 * hr;

export const users: User[] = [
  {
    id: "u_you",
    name: "Guo Chen",
    displayName: "Guo",
    handle: "guo",
    title: "Product Designer",
    avatarColor: "#4a154b",
    presence: "active",
    status: { emoji: "🎧", text: "Heads down" },
  },
  {
    id: "u_mira",
    name: "Mira Patel",
    displayName: "Mira Patel",
    handle: "mira",
    title: "Design Lead",
    avatarColor: "#e01e5a",
    presence: "active",
  },
  {
    id: "u_dev",
    name: "Devon Walker",
    displayName: "Devon Walker",
    handle: "devon",
    title: "Staff Engineer",
    avatarColor: "#2eb67d",
    presence: "active",
  },
  {
    id: "u_yuki",
    name: "Yuki Tanaka",
    displayName: "Yuki Tanaka",
    handle: "yuki",
    title: "Product Manager",
    avatarColor: "#ecb22e",
    presence: "away",
  },
  {
    id: "u_sam",
    name: "Sam Rivera",
    displayName: "Sam Rivera",
    handle: "sam",
    title: "Researcher",
    avatarColor: "#36c5f0",
    presence: "active",
    status: { emoji: "🌴", text: "Out Fri" },
  },
  {
    id: "u_jordan",
    name: "Jordan Lee",
    displayName: "Jordan Lee",
    handle: "jordan",
    title: "Eng Manager",
    avatarColor: "#1264a3",
    presence: "offline",
  },
  {
    id: "u_noor",
    name: "Noor Ahmed",
    displayName: "Noor Ahmed",
    handle: "noor",
    title: "Design Systems",
    avatarColor: "#9b59b6",
    presence: "active",
  },
  {
    id: "u_priya",
    name: "Priya Shah",
    displayName: "Priya Shah",
    handle: "priya",
    title: "Data Science",
    avatarColor: "#f4a261",
    presence: "away",
  },
  {
    id: "u_slackbot",
    name: "Slackbot",
    displayName: "Slackbot",
    handle: "slackbot",
    avatarColor: "#4a154b",
    presence: "active",
    isBot: true,
  },
  {
    id: "u_agent",
    name: "Slack Agent",
    displayName: "Slack Agent",
    handle: "agent",
    title: "AI assistant",
    avatarColor: "#611f69",
    presence: "active",
    isBot: true,
    isAgent: true,
  },
];

export const conversations: Conversation[] = [
  {
    id: "c_general",
    kind: "channel",
    name: "general",
    topic: "Company-wide announcements and work-based matters",
    purpose: "This channel is for workspace-wide communication.",
    memberIds: ["u_you", "u_mira", "u_dev", "u_yuki", "u_sam", "u_jordan", "u_noor", "u_priya"],
    createdBy: "u_mira",
  },
  {
    id: "c_announcements",
    kind: "channel",
    name: "announcements",
    topic: "Important updates from leadership",
    memberIds: ["u_you", "u_mira", "u_dev", "u_yuki", "u_jordan"],
  },
  {
    id: "c_design",
    kind: "channel",
    name: "design",
    topic: "Design crits, files, and inspiration",
    memberIds: ["u_you", "u_mira", "u_noor", "u_sam"],
  },
  {
    id: "c_engineering",
    kind: "channel",
    name: "engineering",
    topic: "Eng discussions, incidents, and architecture",
    memberIds: ["u_you", "u_dev", "u_jordan", "u_priya"],
  },
  {
    id: "c_proj_agentic",
    kind: "channel",
    name: "proj-agentic-input",
    topic: "Redesigning the Slack composer for AI agents",
    purpose: "Take-home project: rethink the input surface.",
    memberIds: ["u_you", "u_mira", "u_dev", "u_yuki", "u_noor"],
  },
  {
    id: "c_random",
    kind: "channel",
    name: "random",
    topic: "Non-work banter, memes, and pet photos",
    memberIds: ["u_you", "u_mira", "u_dev", "u_yuki", "u_sam", "u_noor"],
  },
  // DMs
  {
    id: "dm_self",
    kind: "dm",
    name: "Guo (you)",
    memberIds: ["u_you"],
  },
  {
    id: "dm_slackbot",
    kind: "dm",
    name: "Slackbot",
    memberIds: ["u_you", "u_slackbot"],
  },
  {
    id: "dm_agent",
    kind: "dm",
    name: "Slack Agent",
    memberIds: ["u_you", "u_agent"],
  },
  {
    id: "dm_mira",
    kind: "dm",
    name: "Mira Patel",
    memberIds: ["u_you", "u_mira"],
  },
  {
    id: "dm_devon",
    kind: "dm",
    name: "Devon Walker",
    memberIds: ["u_you", "u_dev"],
  },
  {
    id: "gdm_design_crit",
    kind: "group_dm",
    name: "Mira, Noor, Sam",
    memberIds: ["u_you", "u_mira", "u_noor", "u_sam"],
  },
];

let mid = 0;
const m = (
  conversationId: string,
  authorId: string,
  text: string,
  agoMs: number,
  extras: Partial<Message> = {},
): Message => ({
  id: `m_${++mid}`,
  conversationId,
  authorId,
  text,
  createdAt: now - agoMs,
  reactions: [],
  ...extras,
});

export const initialMessages: Message[] = [
  // #general
  m("c_general", "u_mira", "Morning everyone! Reminder that our Q2 kickoff is tomorrow at 10am PT :coffee:", 4 * hr, {
    reactions: [
      { emoji: "☕", userIds: ["u_dev", "u_yuki"] },
      { emoji: "🙌", userIds: ["u_sam", "u_noor", "u_jordan"] },
    ],
  }),
  m("c_general", "u_jordan", "I'll bring donuts :doughnut:", 4 * hr - 10 * min),
  m("c_general", "u_yuki", "Bless you Jordan", 4 * hr - 9 * min, {
    reactions: [{ emoji: "❤️", userIds: ["u_jordan"] }],
  }),
  m("c_general", "u_dev", "Heads up – the staging deploy is back up after the incident this morning. Post-mortem going up in #engineering later.", 2 * hr),
  m("c_general", "u_sam", "Thanks Devon! Appreciate the fast response.", 2 * hr - 5 * min),
  m("c_general", "u_mira", "New brand guidelines doc is in Drive. Take a look when you get a chance — feedback by Friday.", 45 * min, {
    attachments: [
      { id: "f1", name: "Brand-Guidelines-v3.pdf", kind: "pdf", size: "2.4 MB" },
    ],
    reactions: [{ emoji: "👀", userIds: ["u_you", "u_noor", "u_sam"] }],
  }),

  // #proj-agentic-input
  m("c_proj_agentic", "u_mira", "Kicking off the *agentic input* redesign thread. The question on the table:\n\n> How should the Slack composer work when AI agents are first-class?", 6 * hr, {
    reactions: [{ emoji: "🧠", userIds: ["u_you", "u_dev", "u_yuki", "u_noor"] }],
  }),
  m("c_proj_agentic", "u_dev", "Top of mind for me: context management. Users shouldn't have to guess what the agent \"sees.\" Make it visible and editable.", 5 * hr + 30 * min),
  m("c_proj_agentic", "u_yuki", "Strong +1. Also — switching between agents should feel as easy as `@`-mentioning a teammate. No separate app picker.", 5 * hr + 10 * min, {
    reactions: [{ emoji: "💯", userIds: ["u_mira", "u_dev"] }],
  }),
  m("c_proj_agentic", "u_noor", "I've been sketching a \"context chips\" pattern – little pills above the composer showing threads / channels / files the agent is pulling from. Draft in Figma 👇", 4 * hr + 45 * min, {
    attachments: [
      { id: "f2", name: "agentic-input-v1.fig", kind: "file", size: "180 KB" },
    ],
  }),
  m("c_proj_agentic", "u_you", "Love where this is going. I'll prototype it this week and share back.", 3 * hr, {
    reactions: [{ emoji: "🚀", userIds: ["u_mira", "u_yuki", "u_noor", "u_dev"] }],
  }),
  m("c_proj_agentic", "u_mira", "Please do! Aim for something we can click through — even rough.", 2 * hr + 50 * min, {
    replyCount: 3,
    replyUserIds: ["u_you", "u_dev", "u_noor"],
    lastReplyAt: now - 30 * min,
  }),

  // thread replies for the last message above (parent m_12 — count by scan)
  // We'll set threadId = the parent id at render time using a lookup; leaving it encoded by text search is brittle so let's push replies after we know the id.

  // #design
  m("c_design", "u_noor", "Design system v2.3 is out — new spacing scale and updated focus rings.", 1 * day),
  m("c_design", "u_mira", "Lovely. The new focus rings feel way more polished.", 1 * day - 20 * min),
  m("c_design", "u_sam", "Ran a quick usability test on the new nav — screenshot thread 👀", 12 * hr, {
    replyCount: 5,
    replyUserIds: ["u_noor", "u_mira", "u_you"],
    lastReplyAt: now - 3 * hr,
  }),

  // #engineering
  m("c_engineering", "u_dev", "```\n// Incident #241\n// Root cause: stale Redis connection after failover\n```\nWriting up post-mortem now.", 3 * hr, {
    reactions: [{ emoji: "🛠️", userIds: ["u_jordan", "u_priya"] }],
  }),
  m("c_engineering", "u_priya", "Let me know when it's ready and I'll add the metrics section.", 2 * hr + 40 * min),
  m("c_engineering", "u_jordan", "Thanks both. Want to schedule a blameless retro for Thursday?", 1 * hr),

  // #random
  m("c_random", "u_sam", "Found this in the office kitchen. Who's is it :eyes:", 8 * hr, {
    attachments: [{ id: "f3", name: "mystery-mug.jpg", kind: "image", size: "320 KB" }],
    reactions: [{ emoji: "😂", userIds: ["u_dev", "u_mira", "u_yuki"] }],
  }),
  m("c_random", "u_dev", "Definitely Jordan's. He has like 8 of those.", 7 * hr + 55 * min),

  // #announcements
  m("c_announcements", "u_mira", "*All-hands tomorrow, 11am PT.* Agenda in the calendar invite. Come with questions.", 6 * hr, {
    reactions: [{ emoji: "👍", userIds: ["u_you", "u_dev", "u_yuki", "u_sam", "u_jordan", "u_noor"] }],
  }),

  // DM with Mira
  m("dm_mira", "u_mira", "Hey — can you share the latest composer explorations before the review?", 2 * hr),
  m("dm_mira", "u_you", "Yep, pushing shortly.", 1 * hr + 55 * min),
  m("dm_mira", "u_mira", "🙏", 1 * hr + 54 * min),

  // DM with Devon
  m("dm_devon", "u_dev", "FYI – I pulled your branch, looks great. One nit on the hover state, left a comment.", 20 * min),

  // DM self
  m("dm_self", "u_you", "Todo: finish the agentic input doc tonight.", 30 * min),

  // Slackbot
  m("dm_slackbot", "u_slackbot", "Hi there 👋 I'm Slackbot. Try typing `/remind me to drink water every 2 hours`.", 3 * day),

  // Agent DM (placeholder — Phase 2 wires real Claude)
  m("dm_agent", "u_agent", "Hey Guo, I'm your Slack Agent. Ask me anything, or type `/` to see what I can do.", 5 * min),

  // Group DM
  m("gdm_design_crit", "u_mira", "Scheduling a crit Thursday @ 2pm — OK for everyone?", 1 * hr),
  m("gdm_design_crit", "u_noor", "Works for me.", 55 * min),
  m("gdm_design_crit", "u_sam", "👍", 50 * min),
];

// Wire up thread replies against the correct parent id.
const parent = initialMessages.find(
  (msg) => msg.conversationId === "c_proj_agentic" && msg.text.startsWith("Please do!"),
);
if (parent) {
  initialMessages.push(
    m("c_proj_agentic", "u_you", "Working on it — planning to ship a clickable prototype by EOD Friday.", 40 * min, {
      threadId: parent.id,
    }),
    m("c_proj_agentic", "u_dev", "Nice. Want me to mock the LLM endpoint?", 35 * min, {
      threadId: parent.id,
    }),
    m("c_proj_agentic", "u_noor", "I'll drop updated Figma frames before then.", 30 * min, {
      threadId: parent.id,
    }),
  );
}

export const mentionsByHandle: Record<string, string> = Object.fromEntries(
  users.map((u) => [u.handle, u.id]),
);
