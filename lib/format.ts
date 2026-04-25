import type { User } from "./types";

/** Simple Slack-flavored mrkdwn → HTML string.
 *  Supports: *bold*, _italic_, ~strike~, `code`, ```pre```, > quote,
 *  @mention, #channel, :emoji:, links.
 *  Not exhaustive — good enough for rendering seeded messages. */
export function renderMrkdwn(
  text: string,
  users: Record<string, User>,
  conversationsByName: Record<string, { id: string; name: string }>,
): string {
  if (!text) return "";

  // Pre-pass: extract Slack-style `<url|label>` link tokens before we escape
  // anything, since both `<` and `|` would otherwise be mangled. We swap in
  // sentinels and re-insert the rendered <a> tags at the very end so the
  // bare-URL auto-linkifier below doesn't double-wrap our hrefs.
  const linkSlots: string[] = [];
  text = text.replace(
    /<((?:https?:\/\/)[^|\s>]+)\|([^>]+)>/g,
    (_m, url: string, label: string) => {
      const idx = linkSlots.length;
      const safeUrl = escapeHtml(url);
      const safeLabel = escapeHtml(label);
      linkSlots.push(
        `<a href="${safeUrl}" target="_blank" rel="noreferrer">${safeLabel}</a>`,
      );
      return `\u0000LINK${idx}\u0000`;
    },
  );

  let safe = escapeHtml(text);

  // Code blocks ```...``` first
  safe = safe.replace(/```([\s\S]+?)```/g, (_m, code) => `<pre>${code.trim()}</pre>`);

  // Inline code `...`
  safe = safe.replace(/`([^`\n]+)`/g, (_m, code) => `<code>${code}</code>`);

  // Blockquote lines
  safe = safe
    .split("\n")
    .map((line) =>
      line.startsWith("&gt; ") ? `<blockquote>${line.slice(5)}</blockquote>` : line,
    )
    .join("\n");

  // Normalize GitHub-style **bold** down to Slack's *bold* before the bold
  // pass so scripts can use either flavor.
  safe = safe.replace(/\*\*([^*\n]+)\*\*/g, "*$1*");
  // Bold *...*
  safe = safe.replace(/(^|\s)\*([^*\n]+)\*(?=\s|[.,!?:;)]|$)/g, "$1<strong>$2</strong>");
  // Italic _..._
  safe = safe.replace(/(^|\s)_([^_\n]+)_(?=\s|[.,!?:;)]|$)/g, "$1<em>$2</em>");
  // Strike ~...~
  safe = safe.replace(/(^|\s)~([^~\n]+)~(?=\s|[.,!?:;)]|$)/g, "$1<span style='text-decoration:line-through'>$2</span>");

  // @mentions by handle
  safe = safe.replace(/@([a-z0-9_\-]+)/gi, (m, h) => {
    const u = Object.values(users).find((x) => x.handle === h.toLowerCase());
    if (!u) return m;
    return `<span class="mention" data-user="${u.id}">@${u.displayName}</span>`;
  });

  // #channel by name
  safe = safe.replace(/#([a-z0-9_\-]+)/gi, (m, n) => {
    const c = conversationsByName[n.toLowerCase()];
    if (!c) return m;
    return `<span class="channel-ref" data-channel="${c.id}">#${c.name}</span>`;
  });

  // :emoji: shortcodes
  safe = safe.replace(/:([a-z0-9_+\-]+):/gi, (m, name) => {
    const e = emojiFor(name);
    return e ? e : m;
  });

  // Naive URL linkify
  safe = safe.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}" target="_blank" rel="noreferrer">${url}</a>`,
  );

  // Newlines → <br>, but skip inside <pre>/<blockquote>
  safe = safe.replace(/\n/g, "<br/>");

  // Restore the pre-extracted <url|label> link tokens.
  if (linkSlots.length) {
    safe = safe.replace(/\u0000LINK(\d+)\u0000/g, (_m, idx) => {
      const i = Number(idx);
      return linkSlots[i] ?? "";
    });
  }

  return safe;
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const emojiMap: Record<string, string> = {
  "+1": "👍",
  "-1": "👎",
  heart: "❤️",
  eyes: "👀",
  fire: "🔥",
  rocket: "🚀",
  tada: "🎉",
  wave: "👋",
  thinking_face: "🤔",
  coffee: "☕",
  doughnut: "🍩",
  pray: "🙏",
  muscle: "💪",
  bulb: "💡",
  sparkles: "✨",
  robot_face: "🤖",
  white_check_mark: "✅",
  x: "❌",
  warning: "⚠️",
  tools: "🛠️",
  brain: "🧠",
  hundred: "💯",
  ok_hand: "👌",
  clap: "👏",
  ship_it: "🚢",
  shipit: "🚢",
};
export function emojiFor(name: string): string | null {
  return emojiMap[name] ?? null;
}

export function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const hh = ((h + 11) % 12) + 1;
  const am = h < 12 ? "AM" : "PM";
  return `${hh}:${m.toString().padStart(2, "0")} ${am}`;
}

export function formatDayDivider(ts: number) {
  const now = new Date();
  const d = new Date(ts);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (startOfDay(now) - startOfDay(d)) / (1000 * 60 * 60 * 24);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatRelativeShort(ts: number) {
  const diff = Date.now() - ts;
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return "just now";
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}
