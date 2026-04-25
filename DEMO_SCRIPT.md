# Demo Script — Slack Agentic Input

**Length:** ~3 minutes
**Persona:** Jordan Chen, AE at a SaaS company. Just got off a 30-min Acme call with Lisa (VP Data) and Jamie (Staff Eng). Headed back to Slack to wrap up.

**Setup before recording:** open `http://localhost:3000`, land on `#eval-acme-corp`, sidebar default width, no agent pane open.

---

## The premise

Slack is where work *gets talked about* — but the work itself still happens somewhere else. Today, after a customer call, Jordan would tab over to Salesforce, then Gmail, then a Doc. Each tool is a context switch.

I redesigned the Slack input around one idea: **agents are participants in the channel, not a separate place you go**. Discovery happens inline, work happens privately, and the team sees the outcome — all without leaving the conversation.

Three moments.

---

## Moment 1 — Discovery (inline, ambient)

**What I do:**

- Click into the channel composer.
- Type: `Hey - anyone able to update the Acme opportunity in Salesforce after that call?`
- Pause typing.

**What to point out:**

- *"After about 800ms of idle, a `SUGGESTED` label fades up and Agentforce slides in. The label shimmers once — that's the only flourish — and then the chip stays put. It doesn't disappear when I keep typing, and it doesn't re-fire on every keystroke."*
- Hover the Agentforce chip → context card pops above the chip.
- *"This isn't a generic agent picker. The rationale is grounded — 'Acme - Platform Upgrade is in your pipeline.' The system already knows which deal this conversation is about, so the suggestion is specific."*
- Two CTAs: **Add to chat** (insert `@Agentforce` into the draft) or **Message Agentforce** (open privately).

**Why this matters:** discovery without a slash command, without a switcher, without a modal. The user keeps their hands on the keyboard and the suggestion respects them — quiet, sticky, dismissable.

---

## Moment 2 — Try it privately, get work done

**What I do:**

- Click **Message Agentforce**.

**What to point out (setup screen):**

- *"First time touching Agentforce, so we run a one-tap setup. In a real org this would be the install/auth flow — I've collapsed it to the single moment that matters."*
- Click **Add to Slack**.

**What to point out (pane opens):**

- *"Notice the right pane is the same size and chrome as a thread. Agents are a thread primitive — same affordances, same composer, same gap and rounded edges as the channel. Nothing new to learn."*
- *"At the top: 'Context I have' — the specific Acme opportunity, stage, close date, last touch. Jordan can see exactly what the agent is grounded in before saying anything."*
- *"Below that: contextual actions, not a blank chat. The agent has read the room and is offering the three things most worth doing right now."*

**What I do:**

- Click **Update the Acme opportunity in Salesforce**.

**What to point out:**

- The agent's text shimmers while it "thinks", then a *proposal* streams in: stage, close date, next step, risk.
- *"This is propose-then-confirm. The agent never silently mutates a system of record. I see the diff first."*

**What I do (the edit-then-confirm beat):**

- In the agent composer, type: `actually push close to Aug 1` and send.

**What to point out:**

- The proposal is revised in place — same shape, but close date is now Aug 1.
- *"This is the part most agent products skip. Agreement is rarely yes/no — it's 'almost, but…'. The user can amend in plain language and see the revised proposal before committing."*

**What I do:**

- Click **Confirm**.

**What to point out:**

- A confirmation message streams in: SF updated, follow-up task logged for Jamie, ready to recap when Jordan heads back.
- *"Real work, done in chat, in the same surface where the conversation started."*

---

## Moment 3 — Public adoption (multi-agent, in the open)

**What I do:**

- Close the agent pane.
- Back in the channel composer, type: `Updated Salesforce after the call - @Agentforce can you post a quick recap and @Gong can you back it up with the call moments?`
- Hit send.

**What to point out:**

- The message lands in the channel with the two agent pills inline. **The thread does not auto-open.** Two reply rows appear under the message, each with a status pill next to the timestamp.
- *"Watch the pills. Agentforce starts on `Working` — the spinner — while Gong sits on `Waiting` with a clock. They run sequentially, like a real conversation, so Gong can read what Agentforce just said before it speaks."*
- After Agentforce finishes, its pill flips to `Done` (checkmark) and Gong flips to `Working`.
- *"This is the multi-agent primitive: agents are participants in a thread. Not a chain, not a mesh — just turns in a conversation, with the team able to glance at the channel and see exactly who's doing what right now."*
- Open the thread. Read out the recap and Gong's call-moment quotes.

---

## Wrap

**The single insight:** the input is the only surface that has to change. Once the input understands intent and surfaces the right agent, every other Slack pattern — threads, mentions, panes — already knows how to host the agent. No new mental model. No new place to go.

**Three things I'd build next:**

1. **Server-side suggestions.** The heuristic is a stand-in for an LLM call against the user's draft, channel context, and connected agents.
2. **Per-channel agent membership.** `@Agentforce` should only auto-complete in channels where it's been added, the same way Slackbots work today.
3. **Audit + permissioning for proposals.** Every confirm action becomes a record the deal team can review — same as a Salesforce audit log, just surfaced in Slack.

---

## Quick reference — exact strings to type


| Moment | Where                                | Text                                                                                                                             |
| ------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 1      | Channel composer                     | `Hey - anyone able to update the Acme opportunity in Salesforce after that call?`                                                |
| 2      | Agent pane composer (after proposal) | `actually push close to Aug 1`                                                                                                   |
| 3      | Channel composer                     | `Updated Salesforce after the call - @Agentforce can you post a quick recap and @Gong can you back it up with the call moments?` |

---

## Alt drafts — exercising the multi-agent suggestion strip

The suggestion engine surfaces up to **3** agents as long as each one has at least 2 trigger hits in the draft. Use these if you want to demo the strip handling 2–3 chips instead of one.

**Two agents — Agentforce + Gong**

> Just talked to Lisa at Acme — budget is the main risk. Need to update the opportunity in Salesforce.

- Agentforce hits: `salesforce`, `update`, `opportunity`, `lisa/acme`
- Gong hits: `talked`, `budget`, `risk`, `lisa/acme`

**Two agents — Agentforce + Clari (forecasting variant)**

> Need to update the Acme opportunity in Salesforce — pipeline forecast for Q2 is shifting.

- Agentforce hits: `salesforce`, `update`, `opportunity`, `pipeline`, `acme`
- Clari hits: `forecast`, `pipeline`, `opportunity`

**Two agents — Gong + Momentum (lighter, post-call recap)**

> Quick recap of today's Acme call — going to draft a follow-up email to Lisa.

- Momentum hits: `recap`, `follow-up`, `email/draft`
- Gong hits: `call`, `lisa/acme`

**Three agents — Agentforce + Gong + Momentum (the headline multi-agent draft)**

> Wrapping up the Acme call with Lisa and Jamie — budget concerns came up. I'll update the opportunity in Salesforce and send Jamie a follow-up email.

- Agentforce hits: `salesforce`, `update`, `opportunity`, `lisa/jamie/acme`
- Gong hits: `call`, `budget`, `lisa/jamie/acme`
- Momentum hits: `follow-up`, `email`

If you want Moment 1 to land on three chips instead of one, swap the table draft for this last one — it also flows naturally into Moment 3 since `@Agentforce` and `@Gong` are already top of mind.
