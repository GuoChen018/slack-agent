import type { User } from "./types";

export type AgentId = string;

export interface ContextualAction {
  id: string;
  label: string;
  /** Triggers that boost this action's match score against the draft text. */
  triggers: RegExp[];
  /** Scripted streaming response chunks revealed token-by-token. */
  response: string[];
  /** When true, the agent's response is a *proposal*: render Confirm/Cancel
   * beneath it, and stream `confirmResponse` once the user confirms. */
  requiresConfirmation?: boolean;
  /** Streamed when the user clicks Confirm on a proposal. */
  confirmResponse?: string[];
  /** Streamed when the user types an amendment in the agent composer while a
   * proposal is pending. Used for the demo-scripted "push close to Aug 1"
   * flow. */
  amendResponse?: string[];
}

export interface AgentMeta extends User {
  isAgent: true;
  /** Triggers that boost this agent's match score against the draft text. */
  triggers: RegExp[];
  /** Bulleted action lines shown under "What I can help with" in the suggestion
   * hover card. Each bullet is a short fragment, not a full sentence. */
  rationale: string[];
  /** Sales-flavored capabilities surfaced in the @ mention hover card. */
  capabilities: string[];
  /** Tagline shown in the agent pane empty state. */
  tagline: string;
  /** One-line "Context I have" preview shown in the agent pane empty state.
   * Anchors the agent to a specific deal so the demo feels real. */
  contextSummary: string;
  /** Concrete actions surfaced in the agent pane empty state. */
  contextualActions: ContextualAction[];
  /** Scripted reply when this agent is @-mentioned in a channel message and
   * auto-replies in the resulting thread. `priorAgentIds` lets later agents
   * cite earlier ones without breaking the illusion of sequencing. */
  channelReply: (draftText: string, priorAgentIds: AgentId[]) => string[];
  /** Short, agent-flavored prefill text inserted after the @mention when a
   * user clicks an agent pill on an *empty* draft. Lets a single click in a
   * thread turn into a complete, sendable question without typing.
   * Phrased so it implicitly references the thread the user is already in. */
  threadPrompt: string;
}

// Direct, high-resolution logo URLs scraped from each brand's site
// (apple-touch-icon, webclip, or marketing SVG). These are far crisper than
// the ~32px favicons returned by `s2/favicons`. Falls back to a higher-res
// Google favicon for brands that don't expose a public touch icon.
const LOGOS = {
  gong: "https://www.gong.io/marketing-assets/apple-touch-icon.png",
  agentforce:
    "https://wp.sfdcdigital.com/en-us/wp-content/uploads/sites/4/2024/09/icon-agentforce.svg",
  momentum:
    "https://cdn.prod.website-files.com/678526103b0c749e78e38221/67b4ac0ae905b10d3130f67d_clip.png",
  clari: "https://www.google.com/s2/favicons?domain=clari.com&sz=256",
  outreach:
    "https://cdn.prod.website-files.com/696ea7504e736c595e9a2313/699fa8741dc26f0119aa1286_webclip.png",
  chorus: "https://www.google.com/s2/favicons?domain=chorus.ai&sz=256",
} as const;

export const AGENTS: AgentMeta[] = [
  {
    id: "_gong",
    name: "Gong",
    displayName: "Gong",
    handle: "gong",
    title: "Revenue intelligence from calls, emails, and deals",
    avatarColor: "#8039df",
    avatarUrl: LOGOS.gong,
    presence: "active",
    isAgent: true,
    triggers: [/call/i, /spoke|spoken|talked/i, /pricing|budget|cost/i, /objection|risk/i, /prospect|customer/i, /lisa|jamie|acme/i],
    rationale: [
      "I can pull quotes from today's Acme call",
      "Today's call with Lisa and Jamie is already indexed",
      "Useful when the team wants to see what was actually said",
    ],
    tagline: "Get real-time insights from your sales conversations.",
    contextSummary:
      "Today's 30-min Acme call with Lisa Chen and Jamie Park, plus the last 4 calls on this deal.",
    capabilities: [
      "Summarize a deal's call history",
      "Find risks across recent customer calls",
      "Pull next-step commitments from a meeting",
    ],
    channelReply: (_draft, prior) => {
      const intro = prior.length > 0
        ? "Happy to back that up with the call moments:\n\n"
        : "Here are the call moments behind this update:\n\n";
      return [
        intro,
        "*From today's Acme call (4/22)*\n",
        "• 12:14 — Lisa: \"Our budget envelope this year is tighter; we need to come in under $180k for the platform line.\"\n",
        "• 24:03 — Jamie: \"If we can phase Airflow in Q3 we have room to absorb the increase.\"\n",
        "• 38:51 — Lisa: \"I'd want to see ROI within two quarters before approving the upgrade tier.\"",
      ];
    },
    threadPrompt: "anything from recent calls worth flagging here?",
    contextualActions: [
      {
        id: "gong-pricing",
        label: "Pull pricing mentions from your last call with Lisa",
        triggers: [/pricing|budget|cost/i, /lisa/i],
        response: [
          "Pulled pricing mentions from the 4/22 call with Lisa Chen (Acme).\n\n",
          "*Key moments*\n",
          "• 12:14 — Lisa: \"Our budget envelope this year is tighter than last; we need to come in under $180k for the platform line.\"\n",
          "• 24:03 — Jamie: \"If we can phase Airflow in Q3 we have room to absorb the increase.\"\n",
          "• 38:51 — Lisa: \"I'd want to see ROI within two quarters before approving the upgrade tier.\"\n\n",
          "*Suggested follow-up*: send Jamie a phased pricing model that keeps year-one under $180k.",
        ],
      },
      {
        id: "gong-summary",
        label: "Summarize today's call with Lisa and Jamie",
        triggers: [/call/i, /summary|summarize|recap/i, /lisa|jamie/i],
        response: [
          "Here's the gist of today's call with Lisa and Jamie:\n\n",
          "*Outcome*: Jamie is bought in; Lisa is supportive but raised budget concerns.\n\n",
          "*Discussed*\n",
          "• Phased rollout plan landing in Q3\n",
          "• Airflow orchestration question (Jamie wants comparison vs. their current vendor)\n",
          "• Pricing — Lisa wants year-one capped\n\n",
          "*Next steps*\n",
          "• Send Jamie the Airflow comparison brief\n",
          "• Update Salesforce with the new close date\n",
          "• Schedule a follow-up before EOM",
        ],
      },
      {
        id: "gong-commitments",
        label: "Show commitments and next steps from the call",
        triggers: [/next step|follow.?up|commit/i],
        response: [
          "*Commitments from the 4/22 call*\n\n",
          "*You committed to:*\n",
          "• Send Jamie the Airflow comparison by EOW\n",
          "• Update Salesforce with the phased pricing model\n",
          "• Loop in Solutions Eng on the orchestration question\n\n",
          "*Lisa committed to:*\n",
          "• Confirm the Q3 budget envelope by Friday\n\n",
          "*Jamie committed to:*\n",
          "• Get the security questionnaire back by Wednesday",
        ],
      },
    ],
  },
  {
    id: "_agentforce",
    name: "Agentforce",
    displayName: "Agentforce",
    handle: "agentforce",
    title: "Salesforce CRM data, pipeline, and account research",
    avatarColor: "#00a1e0",
    avatarUrl: LOGOS.agentforce,
    presence: "active",
    isAgent: true,
    triggers: [/salesforce|sf|crm/i, /update|log/i, /opportunity|deal/i, /account|contact/i, /lead|pipeline/i, /lisa|jamie|acme/i],
    rationale: [
      "I can update the Acme opportunity in Salesforce for you",
      "Acme - Platform Upgrade is your open opportunity",
      "Every change gets logged against today's call automatically",
    ],
    tagline: "Your CRM, on tap. Update records and pull account context in chat.",
    contextSummary:
      "Acme - Platform Upgrade ($180k, your deal). Stage: Discovery. Close date: Jun 30. Last touch: today.",
    capabilities: [
      "Look up an opportunity, account, or contact",
      "Update Salesforce fields from chat",
      "Generate a deal brief before a meeting",
    ],
    channelReply: (_draft, _prior) => [
      "Just applied your updates to *Acme - Platform Upgrade*:\n\n",
      "• Stage: Discovery → *Proposal*\n",
      "• Close date: Jun 30 → *Jul 15*\n",
      "• Next step: \"Send Airflow comparison + phased pricing\"\n",
      "• Follow-up task logged for Jamie (due Friday)\n\n",
      "All linked to today's call — anyone in #eval-acme-corp can review.",
    ],
    threadPrompt: "anything I should update in Salesforce based on this?",
    contextualActions: [
      {
        id: "af-update-opp",
        label: "Update the Acme opportunity in Salesforce",
        triggers: [/update.*sf|update.*salesforce|update.*opp/i, /salesforce|sf|opportunity/i],
        requiresConfirmation: true,
        response: [
          "Pulled this together from your call. Here's what I'd update on *Acme - Platform Upgrade* — take a look:\n\n",
          "*Proposed updates*\n",
          "• Stage: Discovery → *Proposal*\n",
          "• Close date: Jun 30 → *Jul 15*\n",
          "• Next step: \"Send Airflow comparison + phased pricing\"\n",
          "• Risk: Budget envelope (added)\n\n",
          "Want me to apply these? I'll log everything against today's call.",
        ],
        confirmResponse: [
          "Done. *Acme - Platform Upgrade* is updated and the call is linked.\n\n",
          "• Logged against the 4/22 call\n",
          "• Follow-up task created for Jamie (due Friday)\n",
          "• Ready to post a recap whenever you head back to the channel",
        ],
        amendResponse: [
          "Got it — pushing the close date out. Here's the revised version:\n\n",
          "*Proposed updates*\n",
          "• Stage: Discovery → *Proposal*\n",
          "• Close date: Jun 30 → *Aug 1*\n",
          "• Next step: \"Send Airflow comparison + phased pricing\"\n",
          "• Risk: Budget envelope (added)\n\n",
          "Want me to apply these instead?",
        ],
      },
      {
        id: "af-account-brief",
        label: "Pull Lisa Chen's account brief",
        triggers: [/lisa|account|brief/i],
        response: [
          "Here's the quick read on Acme:\n\n",
          "• *Owner*: You (Jordan Chen)\n",
          "• *ARR*: $620k\n",
          "• *Primary contact*: Lisa Chen, VP Data\n",
          "• *Champion*: Jamie Park, Staff Eng\n",
          "• *Open opps*: 1 (Platform Upgrade — $180k)\n",
          "• *Last touch*: Today (30m call)\n",
          "• *Watch*: Budget cycle ends in 8 weeks; competitor named in the last call",
        ],
      },
      {
        id: "af-task-jamie",
        label: "Log a follow-up task for Jamie",
        triggers: [/task|follow.?up|jamie/i],
        response: [
          "Got it — task created in Salesforce:\n\n",
          "• *Subject*: Send Jamie the Airflow comparison\n",
          "• *Related to*: Acme - Platform Upgrade\n",
          "• *Due*: Friday\n",
          "• *Priority*: High\n\n",
          "Linked to today's call. I'll nudge you Thursday if it's still open.",
        ],
      },
    ],
  },
  {
    id: "_momentum",
    name: "Momentum",
    displayName: "Momentum",
    handle: "momentum",
    title: "Auto call summaries and deal signals",
    avatarColor: "#1d6bff",
    avatarUrl: LOGOS.momentum,
    presence: "active",
    isAgent: true,
    triggers: [/follow.?up|next steps|recap|summarize/i, /email|draft/i, /signal|risk/i],
    rationale: [
      "I can draft the follow-up email to Jamie from your message",
      "Your message reads like a post-call wrap-up",
      "Already watching Acme for risk signals",
    ],
    tagline: "Auto call summaries and deal signals, posted where you work.",
    contextSummary:
      "All Acme calls and emails this quarter. Watching: budget cycle, competitor mentions.",
    capabilities: [
      "Auto-summarize the latest customer call",
      "Surface deal risk signals in a thread",
      "Draft a follow-up email from a meeting",
    ],
    channelReply: (_draft, _prior) => [
      "Drafted a follow-up to Jamie based on the call. Subject: \"Airflow comparison + phased pricing\". I'll wait for the green light before sending.",
    ],
    threadPrompt: "can you draft a quick recap of this?",
    contextualActions: [
      {
        id: "mo-followup-email",
        label: "Draft the follow-up email to Jamie",
        triggers: [/follow.?up|email|jamie/i],
        response: [
          "Drafted a follow-up email to Jamie Park:\n\n",
          "*Subject*: Airflow comparison + phased pricing — quick recap\n\n",
          "Hi Jamie,\n\n",
          "Great call earlier — appreciated the deep dive on the orchestration question. As promised, here's the Airflow comparison vs. our current setup, plus a phased rollout that keeps year-one under Lisa's budget envelope. Let me know what time on Thursday works to walk through it.\n\n",
          "Best,\nJordan",
        ],
      },
      {
        id: "mo-risk-signals",
        label: "Surface deal risk signals on Acme",
        triggers: [/risk|signal|concern/i],
        response: [
          "*Risk signals on Acme - Platform Upgrade*\n\n",
          "• Budget envelope tightening — Lisa flagged in the last two calls\n",
          "• Competitor mentioned by name in the 4/15 call (first time)\n",
          "• 14 days since last exec sponsor touch\n",
          "• Champion (Jamie) skipped the last working session\n\n",
          "*Recommendation*: schedule a 15-minute exec sync this week.",
        ],
      },
      {
        id: "mo-recap",
        label: "Post a 60-second recap to #eval-acme-corp",
        triggers: [/recap|summarize|post|update/i],
        response: [
          "Posting a 60-second recap to #eval-acme-corp:\n\n",
          "> Just finished the Acme call with Lisa + Jamie. Jamie is in; Lisa needs us under $180k year-one. Sending phased pricing + Airflow comparison this week. Will update SF after.",
        ],
      },
    ],
  },
  {
    id: "_clari",
    name: "Clari",
    displayName: "Clari",
    handle: "clari",
    title: "Forecasting and pipeline inspection",
    avatarColor: "#1b7ced",
    avatarUrl: LOGOS.clari,
    presence: "active",
    isAgent: true,
    triggers: [/forecast|pipeline|commit|quota/i, /deal|opportunity/i],
    rationale: [
      "I can show how this update moves your Q2 forecast",
      "Acme is in your committed forecast this quarter",
    ],
    tagline: "Forecast and pipeline inspection, in one place.",
    contextSummary:
      "Q2 forecast for your team. Acme - Platform Upgrade is in commit at $180k.",
    capabilities: [
      "Show this quarter's forecast vs. plan",
      "Inspect at-risk deals in the pipeline",
      "Compare commit vs. best-case by rep",
    ],
    channelReply: (_draft, _prior) => [
      "Acme is in commit at $180k. Slipping it puts the team at 71% of plan this quarter.",
    ],
    threadPrompt: "does this change the forecast picture?",
    contextualActions: [
      {
        id: "cl-forecast",
        label: "Show this quarter's forecast vs. plan",
        triggers: [/forecast|quarter|q[123]/i],
        response: [
          "*Q2 forecast (your team)*\n\n",
          "• Plan: $2.4M\n",
          "• Commit: $1.9M (79%)\n",
          "• Best case: $2.6M\n",
          "• Closed-won YTD: $1.1M\n\n",
          "Acme - Platform Upgrade ($180k) is in commit. Slipping it would put you at 71% of plan.",
        ],
      },
    ],
  },
  {
    id: "_outreach",
    name: "Outreach",
    displayName: "Outreach",
    handle: "outreach",
    title: "Sales engagement sequences and analytics",
    avatarColor: "#5951ff",
    avatarUrl: LOGOS.outreach,
    presence: "active",
    isAgent: true,
    triggers: [/sequence|outreach|cadence/i, /email|prospect/i],
    rationale: [
      "I can draft Jamie's next sequence email from today's call",
      "Jamie is in an active sequence on this account",
    ],
    tagline: "Sales engagement sequences and analytics.",
    contextSummary:
      "Acme contacts in Outreach. Active sequence: Q2 Platform follow-up.",
    capabilities: [
      "Draft a multi-step prospecting sequence",
      "Show reply rates for a sequence",
      "Pause sequences for a closed account",
    ],
    channelReply: (_draft, _prior) => [
      "Drafted a 4-step sequence on Acme. I'll hold it as a draft until you say go.",
    ],
    threadPrompt: "should we adjust the active sequence based on this?",
    contextualActions: [
      {
        id: "or-sequence",
        label: "Draft a 4-step sequence for Acme",
        triggers: [/sequence|cadence|prospect/i],
        response: [
          "*Drafted: Acme — Platform Upgrade follow-up (4 steps)*\n\n",
          "1. Day 0 — Email: Airflow comparison + phased pricing\n",
          "2. Day 3 — LinkedIn touch to Jamie\n",
          "3. Day 7 — Call task\n",
          "4. Day 10 — Email: \"Anything I can do to help on budget?\" to Lisa",
        ],
      },
    ],
  },
  {
    id: "_chorus",
    name: "Chorus",
    displayName: "Chorus",
    handle: "chorus",
    title: "Conversation intelligence by ZoomInfo",
    avatarColor: "#ff6a3d",
    avatarUrl: LOGOS.chorus,
    presence: "active",
    isAgent: true,
    triggers: [/objection|competitor/i, /call|conversation/i],
    rationale: [
      "I can pull objections and competitor mentions from the call",
      "Today's Acme call has both in it",
    ],
    tagline: "Conversation intelligence by ZoomInfo.",
    contextSummary:
      "Today's Acme call indexed for objections, competitor mentions, and pitch trackers.",
    capabilities: [
      "Pull objection moments from a call",
      "Compare pitch trackers across reps",
      "Find competitor mentions in recent calls",
    ],
    channelReply: (_draft, _prior) => [
      "3 objections from today's call: timeline confidence, build-vs-buy on Airflow, and year-two pricing.",
    ],
    threadPrompt: "any objection moments or competitor mentions on this from recent calls?",
    contextualActions: [
      {
        id: "ch-objections",
        label: "Pull objections from the 4/22 call",
        triggers: [/objection|concern|push.?back/i],
        response: [
          "*Objections from the 4/22 call*\n\n",
          "• 18:42 — Lisa: \"Last year's project ran over by two months. I need confidence on timeline.\"\n",
          "• 31:08 — Jamie: \"How does this compare to running Airflow ourselves?\"\n",
          "• 41:15 — Lisa: \"What does year-two pricing look like if we phase year-one?\"",
        ],
      },
    ],
  },
];

export const AGENTS_BY_ID: Record<string, AgentMeta> = AGENTS.reduce(
  (acc, a) => ((acc[a.id] = a), acc),
  {} as Record<string, AgentMeta>,
);

/**
 * Score each agent against the draft and return the top matches. We keep the
 * heuristic intentionally simple: count distinct trigger hits, break ties by
 * the agent's order in AGENTS.
 */
export interface SuggestOptions {
  max?: number;
  /** Minimum number of distinct trigger hits required for an agent to be
   * surfaced. Defaults to 2 (the standard "active typing" bar). The thread
   * composer drops this to 1 when seeding from the parent message — that
   * surface is opt-in (the user just opened the thread), so we can afford
   * to be more permissive without feeling noisy. */
  minScore?: number;
}

export function suggestAgentsForDraft(
  text: string,
  options: SuggestOptions = {},
): AgentMeta[] {
  const { max = 3, minScore = 2 } = options;
  const draft = text.trim();
  if (draft.length < 25) return [];
  const scored: { agent: AgentMeta; score: number }[] = [];
  for (const agent of AGENTS) {
    let score = 0;
    for (const re of agent.triggers) {
      if (re.test(draft)) score += 1;
    }
    if (score >= minScore) scored.push({ agent, score });
  }
  scored.sort((a, b) => b.score - a.score);
  // Only include agents within 1 point of the top score. Without this we
  // end up showing a clear-best agent (e.g. Agentforce on a "update the
  // Salesforce opportunity" draft) alongside a tangential match (Gong
  // catching `call` + `Acme`). Multi-agent suggestions only fire when two
  // or more agents are genuinely close in relevance.
  const top = scored[0]?.score ?? 0;
  return scored
    .filter((x) => x.score >= top - 1)
    .slice(0, max)
    .map((x) => x.agent);
}

/**
 * Pick contextual actions for the agent given the current draft. We surface
 * matching actions first, then pad with the agent's defaults so we always
 * return ~3 actions worth showing.
 */
export function suggestActionsForDraft(
  agent: AgentMeta,
  text: string,
  max = 3,
): ContextualAction[] {
  const draft = text.trim();
  const matched: ContextualAction[] = [];
  const unmatched: ContextualAction[] = [];
  for (const action of agent.contextualActions) {
    const hit = action.triggers.some((re) => re.test(draft));
    (hit ? matched : unmatched).push(action);
  }
  return [...matched, ...unmatched].slice(0, max);
}
