"use client";

import { useEffect } from "react";
import { Sliders } from "lucide-react";
import { useSlackStore } from "@/lib/store";
import {
  VARIANT_OPTIONS,
  loadVariantsFromStorage,
} from "@/lib/variants";

/**
 * Bottom-right floating pill that shows the current variant for each axis and
 * opens the variant palette on click. Doubles as a discovery affordance for
 * demo viewers who don't know the Cmd+Shift+K hotkey, and as a hydrator for
 * the persisted variant state — we read localStorage on mount and seed the
 * store before the first paint that depends on variant flags.
 */
export function VariantBadge() {
  const variants = useSlackStore((s) => s.variants);
  const setVariant = useSlackStore((s) => s.setVariant);
  const setOpen = useSlackStore((s) => s.setVariantPaletteOpen);

  // Hydrate from localStorage exactly once. We do this in a client-only effect
  // so SSR and the first client render agree on `DEFAULT_VARIANTS`, then we
  // overwrite with the persisted values without triggering a hydration error.
  useEffect(() => {
    const persisted = loadVariantsFromStorage();
    for (const axis of VARIANT_OPTIONS) {
      const v = persisted[axis.key];
      if (v !== undefined && v !== variants[axis.key]) {
        setVariant(axis.key, v);
      }
    }
    // Intentionally only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = VARIANT_OPTIONS.map((axis) => {
    const current = axis.options.find((o) => o.value === variants[axis.key]);
    return current?.label ?? "—";
  }).join(" · ");

  return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-slack-border bg-white px-3 py-1.5 text-[12px] text-slack-text shadow-sm hover:bg-slack-pane-hover"
      title="Switch prototype variant (⌘⇧K)"
    >
      <Sliders size={12} className="text-slack-text-muted" />
      <span className="text-slack-text-muted">Variant:</span>
      <span className="font-bold">{summary}</span>
      <kbd className="rounded border border-slack-border bg-slack-pane-alt px-1 text-[10px] text-slack-text-muted">
        ⌘⇧K
      </kbd>
    </button>
  );
}
