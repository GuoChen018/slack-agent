"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { useSlackStore } from "@/lib/store";
import {
  VARIANT_OPTIONS,
  type VariantState,
} from "@/lib/variants";

/**
 * Cmd+Shift+K palette for swapping prototype variants live. Each variant axis
 * (e.g. "suggestionPlacement") contributes one row per option; selecting a row
 * sets that axis. Mirrors the QuickSwitcher chrome so the palette feels native
 * to Slack.
 */
type Row = {
  axisKey: keyof VariantState;
  axisLabel: string;
  optionLabel: string;
  optionDescription: string;
  value: VariantState[keyof VariantState];
  selected: boolean;
};

export function VariantPalette() {
  const open = useSlackStore((s) => s.variantPaletteOpen);
  const setOpen = useSlackStore((s) => s.setVariantPaletteOpen);
  const variants = useSlackStore((s) => s.variants);
  const setVariant = useSlackStore((s) => s.setVariant);

  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const axis of VARIANT_OPTIONS) {
      for (const opt of axis.options) {
        out.push({
          axisKey: axis.key,
          axisLabel: axis.label,
          optionLabel: opt.label,
          optionDescription: opt.description,
          value: opt.value,
          selected: variants[axis.key] === opt.value,
        });
      }
    }
    return out;
  }, [variants]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.axisLabel.toLowerCase().includes(s) ||
        r.optionLabel.toLowerCase().includes(s) ||
        r.optionDescription.toLowerCase().includes(s),
    );
  }, [rows, q]);

  // Reset selection when the search or open state changes.
  const [lastKey, setLastKey] = useState(`${q}|${open}`);
  const currentKey = `${q}|${open}`;
  if (lastKey !== currentKey) {
    setLastKey(currentKey);
    setIdx(0);
  }

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const row = filtered[idx];
        if (row) {
          setVariant(row.axisKey, row.value);
          setOpen(false);
          setQ("");
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, filtered, idx, setVariant, setOpen]);

  if (!open) return null;

  // Group filtered rows by axis for the rendered list, preserving order.
  const grouped: Array<{ axisKey: string; axisLabel: string; rows: Row[] }> = [];
  for (const r of filtered) {
    const last = grouped[grouped.length - 1];
    if (last && last.axisKey === r.axisKey) last.rows.push(r);
    else
      grouped.push({
        axisKey: r.axisKey as string,
        axisLabel: r.axisLabel,
        rows: [r],
      });
  }

  let runningIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[640px] overflow-hidden rounded-lg border border-slack-border bg-white shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-slack-border px-3 py-2">
          <Search size={16} className="text-slack-text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Switch a prototype variant…"
            className="w-full bg-transparent text-[15px] outline-none"
          />
          <span className="rounded border border-slack-border bg-slack-pane-alt px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slack-text-muted">
            Variants
          </span>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-slack-text-muted hover:bg-slack-pane-hover"
          >
            <X size={14} />
          </button>
        </div>

        <ul className="max-h-[420px] overflow-y-auto py-1">
          {grouped.map((group) => (
            <div key={group.axisKey}>
              <li className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slack-text-muted">
                {group.axisLabel}
              </li>
              {group.rows.map((row) => {
                const myIdx = runningIdx;
                runningIdx += 1;
                const active = myIdx === idx;
                return (
                  <li
                    key={`${row.axisKey}-${String(row.value)}`}
                    onMouseEnter={() => setIdx(myIdx)}
                    onClick={() => {
                      setVariant(row.axisKey, row.value);
                      setOpen(false);
                      setQ("");
                    }}
                    className={
                      "flex cursor-pointer items-start gap-2 px-3 py-2 " +
                      (active ? "bg-[#1264a3] text-white" : "text-slack-text")
                    }
                  >
                    <div
                      className={
                        "mt-[3px] flex h-4 w-4 flex-shrink-0 items-center justify-center rounded " +
                        (row.selected
                          ? active
                            ? "bg-white text-[#1264a3]"
                            : "bg-[#1264a3] text-white"
                          : "")
                      }
                    >
                      {row.selected && <Check size={11} strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[14px]">
                        {row.optionLabel}
                      </div>
                      <div
                        className={
                          "text-[12px] " +
                          (active ? "text-white/80" : "text-slack-text-muted")
                        }
                      >
                        {row.optionDescription}
                      </div>
                    </div>
                  </li>
                );
              })}
            </div>
          ))}
          {!filtered.length && (
            <li className="px-3 py-6 text-center text-[13px] text-slack-text-muted">
              No variants match &ldquo;{q}&rdquo;
            </li>
          )}
        </ul>

        <div className="border-t border-slack-border bg-slack-pane-alt px-3 py-1.5 text-[11px] text-slack-text-muted">
          <kbd className="rounded border border-slack-border bg-white px-1">↵</kbd> apply ·{" "}
          <kbd className="rounded border border-slack-border bg-white px-1">↑↓</kbd> navigate ·{" "}
          <kbd className="rounded border border-slack-border bg-white px-1">esc</kbd> close
        </div>
      </div>
    </div>
  );
}
