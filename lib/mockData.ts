import type { Conversation, Message, User } from "./types";

const now = Date.now();
const min = 60_000;
const hr = 60 * min;
const day = 24 * hr;

// Colors from the Figma design
const AVATAR_COLORS = {
  A: "#FFD57E",
  B: "#78D7DD",
  C: "#112377",
  D: "#FFB6BD",
  E: "#DE8969",
  F: "#608813",
  G: "#4A154B",
  H: "#2EB67D",
  I: "#ECB22E",
  J: "#36C5F0",
  K: "#9B59B6",
  L: "#F4A261",
};

const portrait = (gender: "men" | "women", idx: number) =>
  `https://randomuser.me/api/portraits/${gender}/${idx}.jpg`;

export const users: User[] = [
  {
    id: "u_you",
    name: "Jordan Chen",
    displayName: "Jordan",
    handle: "jordan",
    title: "Product Designer",
    avatarColor: AVATAR_COLORS.G,
    avatarUrl: portrait("men", 75),
    presence: "active",
    status: { emoji: "🎧", text: "Heads down" },
  },
  // Figma DM people
  {
    id: "u_decio",
    name: "Decio Emanuel",
    displayName: "Decio Emanuel",
    handle: "decio",
    title: "Account Executive",
    avatarColor: AVATAR_COLORS.A,
    avatarUrl: portrait("men", 43),
    presence: "active",
  },
  {
    id: "u_john",
    name: "John Smith",
    displayName: "John Smith",
    handle: "john",
    title: "Solutions Engineer",
    avatarColor: AVATAR_COLORS.B,
    avatarUrl: portrait("men", 22),
    presence: "active",
  },
  {
    id: "u_sarah",
    name: "Sarah Jamieson",
    displayName: "Sarah Jamieson",
    handle: "sarah",
    title: "Customer Success",
    avatarColor: AVATAR_COLORS.C,
    avatarUrl: portrait("women", 28),
    presence: "active",
  },
  {
    id: "u_rachel",
    name: "Rachel Harris",
    displayName: "Rachel Harris",
    handle: "rachel",
    title: "Sales Director",
    avatarColor: AVATAR_COLORS.D,
    avatarUrl: portrait("women", 51),
    presence: "away",
  },
  {
    id: "u_daniel",
    name: "Daniel Orr",
    displayName: "Daniel Orr",
    handle: "daniel",
    title: "Strategic Deals",
    avatarColor: AVATAR_COLORS.E,
    avatarUrl: portrait("men", 12),
    presence: "active",
  },
  {
    id: "u_isabella",
    name: "Isabella Truman",
    displayName: "Isabella Truman",
    handle: "isabella",
    title: "Legal Counsel",
    avatarColor: AVATAR_COLORS.F,
    avatarUrl: portrait("women", 83),
    presence: "active",
  },
  {
    id: "u_marilyn",
    name: "Marilyn Hart",
    displayName: "Marilyn Hart",
    handle: "marilyn",
    title: "Deal Desk",
    avatarColor: AVATAR_COLORS.H,
    avatarUrl: portrait("women", 17),
    presence: "offline",
  },
  // Sales team in #eval-acme-corp
  {
    id: "u_charlie",
    name: "Charlie Flahert",
    displayName: "Charlie Flahert",
    handle: "charlie",
    title: "VP Sales",
    avatarColor: AVATAR_COLORS.I,
    avatarUrl: portrait("men", 32),
    presence: "active",
  },
  {
    id: "u_dana",
    name: "Dana Kim",
    displayName: "Dana Kim",
    handle: "dana",
    title: "Solutions Engineer",
    avatarColor: AVATAR_COLORS.J,
    avatarUrl: portrait("women", 44),
    presence: "active",
  },
  {
    id: "u_dorothy",
    name: "Dorothy Spurlock",
    displayName: "Dorothy Spurlock",
    handle: "dorothy",
    title: "Product Marketing",
    avatarColor: AVATAR_COLORS.K,
    avatarUrl: portrait("women", 67),
    presence: "active",
  },
  {
    id: "u_mike",
    name: "Mike Tatum",
    displayName: "Mike Tatum",
    handle: "mike",
    title: "CRO",
    avatarColor: AVATAR_COLORS.L,
    avatarUrl: portrait("men", 54),
    presence: "active",
  },
  // Agents / bots
  {
    id: "u_slackbot",
    name: "Slackbot",
    displayName: "Slackbot",
    handle: "slackbot",
    avatarColor: AVATAR_COLORS.G,
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
    memberIds: ["u_you", "u_charlie", "u_dana", "u_dorothy", "u_mike"],
  },
  {
    id: "c_marketing",
    kind: "channel",
    name: "marketing",
    topic: "Campaigns, content, launches",
    memberIds: ["u_you", "u_dorothy", "u_charlie"],
  },
  {
    id: "c_product",
    kind: "channel",
    name: "product",
    topic: "Roadmap and specs",
    memberIds: ["u_you", "u_dana", "u_charlie"],
  },
  {
    id: "c_eval_acme",
    kind: "channel",
    name: "eval-acme-corp",
    topic: "Acme POV tracking and deal war room",
    purpose: "Private deal channel for the Acme Corp eval.",
    isPrivate: true,
    memberIds: [
      "u_you",
      "u_charlie",
      "u_dana",
      "u_dorothy",
      "u_mike",
      "u_marilyn",
      "u_rachel",
    ],
  },
  {
    id: "c_sales_qa",
    kind: "channel",
    name: "sales_qa",
    topic: "Sales enablement Q&A",
    memberIds: ["u_you", "u_charlie", "u_mike", "u_rachel"],
  },
  {
    id: "c_fundraising",
    kind: "channel",
    name: "fundraising",
    topic: "Investor updates and data room",
    memberIds: ["u_you", "u_mike"],
  },
  {
    id: "c_leadership",
    kind: "channel",
    name: "leadership",
    topic: "Exec team",
    memberIds: ["u_you", "u_mike", "u_charlie"],
  },
  {
    id: "c_proj_agentic",
    kind: "channel",
    name: "proj-agentic-input",
    topic: "Redesigning the Slack composer for AI agents",
    memberIds: ["u_you", "u_dana", "u_dorothy", "u_charlie"],
  },
  // DMs — matches Figma order
  {
    id: "dm_decio",
    kind: "dm",
    name: "Decio Emanuel",
    memberIds: ["u_you", "u_decio"],
  },
  {
    id: "dm_john",
    kind: "dm",
    name: "John Smith",
    memberIds: ["u_you", "u_john"],
  },
  {
    id: "dm_sarah",
    kind: "dm",
    name: "Sarah Jamieson",
    memberIds: ["u_you", "u_sarah"],
  },
  {
    id: "dm_rachel",
    kind: "dm",
    name: "Rachel Harris",
    memberIds: ["u_you", "u_rachel"],
  },
  {
    id: "dm_daniel",
    kind: "dm",
    name: "Daniel Orr",
    memberIds: ["u_you", "u_daniel"],
  },
  {
    id: "dm_isabella",
    kind: "dm",
    name: "Isabella Truman",
    memberIds: ["u_you", "u_isabella"],
  },
  {
    id: "dm_marilyn",
    kind: "dm",
    name: "Marilyn Hart",
    memberIds: ["u_you", "u_marilyn"],
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
  // --- #eval-acme-corp (the hero channel from the Figma design) ---
  m("c_eval_acme", "u_charlie", "Sounds good.", 1 * day + 30 * min, {
    reactions: [{ emoji: "👍🏻", userIds: ["u_mike"] }],
  }),
  m(
    "c_eval_acme",
    "u_charlie",
    "Call with the prospect's Head of Data Engineering and her VP at 10am. Want to make sure we're all aligned before I jump on. Quick summary of where we are:\n• Week 3 of the POV, technical setup is mostly done\n• Budget conversation hasn't happened yet — VP is joining today probably for that reason\n• Competitor is still in the picture, haven't been able to confirm which one\n\n@Dana since you last spoke with them and team - Anything I'm missing?",
    2 * hr + 30 * min,
  ),
  m(
    "c_eval_acme",
    "u_dana",
    "Pipeline monitor is live on their end. One thing — their orchestration version is older than what we officially support, but it's been working fine in the POV. If they ask, I'd say it's supported with a caveat rather than flagging it as a risk.",
    2 * hr + 15 * min,
    { reactions: [{ emoji: "🙌🏻", userIds: ["u_charlie"] }] },
  ),
  m(
    "c_eval_acme",
    "u_dorothy",
    "One thing worth flagging — on last week's technical call their data platform team asked a lot of comparison-style questions. \"Do you support X, does your API do Y.\" Felt like they were running a side evaluation.",
    2 * hr + 10 * min,
    {
      reactions: [{ emoji: "🤔", userIds: ["u_charlie", "u_mike", "u_dana"] }],
      replyCount: 4,
      replyUserIds: ["u_charlie", "u_mike", "u_dana"],
      lastReplyAt: now - 50 * min,
    },
  ),
  m(
    "c_eval_acme",
    "u_mike",
    "We should lead with risk and business impact. Not features. And get a sense of timeline. If they're stalling something's up.",
    1 * hr + 10 * min,
    { reactions: [{ emoji: "🙌🏻", userIds: ["u_charlie", "u_dorothy", "u_dana"] }] },
  ),
  m(
    "c_eval_acme",
    "u_charlie",
    "Perfect. Thanks all - Jumping on in 10!",
    40 * min,
    {
      reactions: [
        { emoji: "🔥", userIds: ["u_you", "u_dana", "u_dorothy", "u_mike"] },
        { emoji: "🍿", userIds: ["u_you", "u_mike", "u_dorothy"] },
      ],
    },
  ),

  // --- #general ---
  m("c_general", "u_charlie", "Morning everyone :coffee: Q2 kickoff tomorrow at 10am PT.", 4 * hr, {
    reactions: [{ emoji: "☕", userIds: ["u_mike", "u_dana"] }],
  }),
  m("c_general", "u_mike", "Staging deploy is back up after this morning's incident.", 2 * hr),

  // --- #proj-agentic-input (keeps our Phase 2 thread) ---
  m("c_proj_agentic", "u_charlie", "Kicking off the *agentic input* redesign thread. How should the Slack composer work when AI agents are first-class?", 6 * hr, {
    reactions: [{ emoji: "🧠", userIds: ["u_you", "u_dana", "u_dorothy"] }],
  }),
  m("c_proj_agentic", "u_dana", "Top of mind: context management. Users shouldn't have to guess what the agent sees.", 5 * hr + 30 * min),
  m("c_proj_agentic", "u_dorothy", "Switching between agents should feel like `@`-mentioning a teammate. No separate app picker.", 5 * hr + 10 * min, {
    reactions: [{ emoji: "💯", userIds: ["u_charlie", "u_dana"] }],
  }),
  m("c_proj_agentic", "u_you", "Love this. I'll prototype it this week and share back.", 3 * hr),

  // --- #marketing ---
  m("c_marketing", "u_dorothy", "Launch post draft is in Drive. Feedback by Friday please.", 6 * hr),

  // --- DMs ---
  m("dm_decio", "u_decio", "Got a sec to review the Acme deck before I send?", 45 * min),
  m("dm_john", "u_john", "Pushed the config change for the demo env. Should be all set.", 2 * hr),
  m("dm_sarah", "u_sarah", "Renewal call with Paragon is Thursday, adding you to the invite.", 1 * hr),
  m("dm_rachel", "u_rachel", "Forecast looks good — let's sync before the board meeting.", 3 * hr),
  m("dm_isabella", "u_isabella", "MSA redlines are back, nothing crazy. Will send a summary.", 50 * min),
  m("dm_slackbot", "u_slackbot", "Hi there 👋 Try `/remind me to drink water every 2 hours`.", 3 * day),
  m("dm_agent", "u_agent", "Hey Jordan, I'm your Slack Agent. Ask me anything, or type `/` to see what I can do.", 5 * min),
];

// Wire up thread replies for the Dorothy "side evaluation" message
const parent = initialMessages.find(
  (msg) => msg.conversationId === "c_eval_acme" && msg.authorId === "u_dorothy",
);
if (parent) {
  initialMessages.push(
    m("c_eval_acme", "u_charlie", "Yeah I caught that too.", 55 * min, { threadId: parent.id }),
    m("c_eval_acme", "u_mike", "Let's ask them directly on the call. Polite but direct.", 52 * min, { threadId: parent.id }),
    m("c_eval_acme", "u_dana", "I can cover the \"how we compare\" angle if it comes up.", 51 * min, { threadId: parent.id }),
    m("c_eval_acme", "u_charlie", "Perfect. We'll loop back after.", 50 * min, { threadId: parent.id }),
  );
}

export const mentionsByHandle: Record<string, string> = Object.fromEntries(
  users.map((u) => [u.handle, u.id]),
);
