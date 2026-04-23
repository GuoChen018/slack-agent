# Slack Agentic Playground

A faithful Slack clone built as a playground for redesigning the Slack input
for AI agents. Phase 1 focuses on getting the current Slack experience right —
the agentic redesign (context chips, unified `@` picker, real LLM calls via
Anthropic) will layer on top in Phase 2.

## Running locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## What's built (Phase 1)

- **Shell** — workspace rail, sidebar (Threads / Mentions / Saved / Drafts /
  Agents / More + collapsible Channels and Direct messages sections), top bar
  with search and history nav.
- **Channels + DMs** — 6 channels, 4 DMs, 1 group DM, 8 seeded users with
  avatars, statuses, and presence indicators.
- **Message list** — Slack-style grouping within a 5-minute window, day
  dividers, hover action bar, reactions with counts, thread preview rows, edited
  indicator, file attachment tiles, rendered mrkdwn (`*bold*`, `_italic_`,
  `` `code` ``, ` ```fences``` `, `> quote`, `@mentions`, `#channel refs`,
  `:emoji:`).
- **Composer** — formatting toolbar (bold, italic, strike, link, lists, quote,
  inline + block code) with keyboard shortcuts, `+` attach menu, emoji picker,
  per-conversation draft persistence, `Enter` sends / `Shift+Enter` newline.
- **Four composer popovers**
  - `@` — mention picker with `@channel` / `@here` / `@everyone` specials, fuzzy
    search, keyboard nav.
  - `#` — channel picker.
  - `/` — slash command menu (`/remind`, `/dm`, `/huddle`, `/ask-agent`, …).
  - `:` — inline emoji autocomplete.
- **Threads** — right-side pane that opens on "Reply in thread" or on a thread
  preview row; reuses the composer for replies.
- **Quick switcher** — `⌘K` fuzzy switcher across channels + DMs.

All state is in-memory via [Zustand](https://github.com/pmndrs/zustand). No
backend yet.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 with Slack-matched design tokens in `app/globals.css`
- Zustand for UI state
- Lucide React for icons
- `@floating-ui/react` (for future positioning work) + Framer Motion (for future
  micro-interactions)

## Project layout

```
app/
  layout.tsx, page.tsx, globals.css
components/
  shell/        WorkspaceRail, Sidebar, TopBar
  channel/      ChannelHeader, MessageList, Message, FileAttachmentTile
  composer/     Composer, MentionPicker, ChannelPicker, SlashMenu,
                EmojiPicker, PlusMenu, PopoverShell
  thread/       ThreadPane
  Avatar.tsx, QuickSwitcher.tsx
lib/
  types.ts, mockData.ts, store.ts, format.ts
```

## Phase 2 (upcoming)

The composer is the hero surface. Once Phase 1 is signed off, Phase 2 will
redesign the input for AI agents:

1. **Context chips** — pills above the composer showing exactly what the agent
   can "see" (channels, threads, files, time ranges); removable and editable.
2. **Unified `@` picker** — one mental model: `@agent` switches agents,
   `@#channel` adds channel context, `@person` pulls their messages, `@file`
   attaches.
3. **Real streaming responses** — wire to the Anthropic Messages API via a
   `/api/agent` route; render agent replies with a small subset of Slack's
   Block Kit (section / header / context / actions).

Context and direction came from a take-home prompt: _"Redesign the Slack input
so it feels fast, intuitive, and powerful when AI agents are first-class."_
