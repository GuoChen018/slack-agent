# Slack Agentic Playground

A working Slack clone wrapped around a redesigned, agent-first composer —
exploring what it looks like when AI agents are first-class teammates inside
the surfaces Slack users already know (composer, `@` menu, threads).

**Live demo:** [https://guochen018.github.io/slack-agent/](https://guochen018.github.io/slack-agent/)

## The story (≈3 minutes)

The whole prototype tells one short narrative — Jordan, a closing AE who has
never used an agent in Slack, wraps up an Acme call without leaving the channel:

1. **Discover.** Jordan starts typing a post-call update. Once the draft has
  real intent, a "Suggested" strip fades in next to the input with the agents
   that match — `@Agentforce` for the CRM update, `@Gong` if the message also
   leans on the call. Hovering a chip shows *why* it was suggested and *what*
   it can do.
2. **Try privately.** Jordan opens the Agentforce pane (right-hand pane, same
  composer as the channel). It already knows the deal, surfaces concrete
   actions, and proposes the Salesforce update with a Confirm / Cancel — plus
   "type a change below to revise" so Jordan can amend the close date inline
   before applying.
3. **Adopt publicly.** Jordan closes the pane, sends a team update with
  `@Agentforce @Gong` inline. Both auto-reply sequentially in the message's
   thread. The thread does **not** auto-open — the parent message footer shows
   per-agent status pills (⏳ queued, 👀 thinking, then a real reply count
   once an agent finishes), so the channel stays calm.

A walkthrough script lives in `[DEMO_SCRIPT.md](./DEMO_SCRIPT.md)`.

## What's implemented

### The agent-first composer

- **Sticky suggestion strip** — a heuristic engine in
`[lib/agents.ts](./lib/agents.ts)` scores each agent's triggers against the
draft and surfaces the top matches (within 1 point of the strongest signal,
so a clear winner doesn't get diluted). Chips are sticky while typing,
one-shot shimmer on first reveal, dismissals stay dismissed, chips collapse
to icon-only when space is tight.
- **Hover cards** — portaled to `document.body` for correct positioning,
with a "Why this was suggested" rationale and primary actions
(`Add to chat`, `Message {agent}`).
- **Agent pane** — same composer chrome as the channel, draggable divider,
contextual actions, propose-then-confirm with **edit-then-revise**, and a
one-tap setup screen on first run.
- **Multi-agent in threads** — `@Agentforce @Gong` in a channel triggers
sequential replies in the parent's thread. Per-agent status indicators
appear in the parent's footer; reply counts only appear for agents that
actually finished.

### The Slack scaffolding around it

- **Shell** — workspace rail, draggable sidebar (Threads / Mentions / Saved /
Drafts / Agents / More + collapsible Channels and DMs), top bar with search
and history nav.
- **Message list** — Slack-style 5-minute grouping, day dividers, hover action
bar, reactions with counts, edited indicator, file tiles, full mrkdwn
(`*bold`*, `_italic_`, ``code``, ````fences````, `> quote`,
`@mentions`, `#channel refs`, `:emoji:`).
- **Composer popovers** — `@` mention picker (people + agents in one list,
agents tagged), `#` channel picker, `/` slash menu, `:` emoji picker.
- **Threads** — right-side pane, reuses the composer.
- **Quick switcher** — `⌘K`.

All state is in-memory via [Zustand](https://github.com/pmndrs/zustand).

## Running locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 with Slack-matched tokens in `app/globals.css`
- Zustand for UI state
- Lucide React, `@floating-ui/react`, Framer Motion

## Deployment

The site is statically exported and served by GitHub Pages — see
`[.github/workflows/deploy.yml](./.github/workflows/deploy.yml)`. Every push
to `main` rebuilds and redeploys.

The Pages-only config in `next.config.ts` is gated on `GITHUB_PAGES=true`, so
local `next dev` and `next build` keep working at the root.

## Project layout

```
app/
  layout.tsx, page.tsx, globals.css
components/
  shell/        WorkspaceRail, Sidebar, TopBar, RightPaneResizer
  channel/      ChannelHeader, MessageList, Message, FileAttachmentTile
  composer/     Composer, SuggestionStrip, SuggestionHoverCard,
                MentionPicker, ChannelPicker, SlashMenu, EmojiPicker,
                PlusMenu, PopoverShell
  agent/        AgentPane (intro, suggested actions, propose+confirm)
  thread/       ThreadPane
  Avatar.tsx, QuickSwitcher.tsx, MentionHoverCard.tsx
lib/
  types.ts, mockData.ts, store.ts, format.ts, agents.ts
```

