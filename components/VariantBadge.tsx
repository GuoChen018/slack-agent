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
    return `${axis.label}: ${current?.label ?? "—"}`;
  }).join("\n");

  return (
    <button
      onClick={() => setOpen(true)}
      // Tucked all the way into the bottom-right corner so it stays out of
      // the way of the composer and the agent pane. Icon-only by design —
      // the current values surface in the native title tooltip on hover.
      className="fixed bottom-3 right-3 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-slack-border bg-white text-slack-text-muted shadow-sm transition-colors hover:bg-slack-pane-hover hover:text-slack-text"
      title={`Switch prototype variant\n\n${summary}`}
      aria-label="Switch prototype variant"
    >
      <Sliders size={14} />
    </button>
  );
}
