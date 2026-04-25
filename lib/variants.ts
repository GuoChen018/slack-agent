/**
 * Prototype variant axes. Each axis represents a design decision we want to be
 * able to flip live in the running app via the variant palette (Cmd+Shift+K)
 * so reviewers can A/B alternate placements without us having to pick one.
 *
 * Adding a new axis:
 *  1. Add a key + value union to `VariantState`.
 *  2. Add a default in `DEFAULT_VARIANTS`.
 *  3. Add an entry to `VARIANT_OPTIONS` describing the axis + each option.
 *  4. Read it from the store via `useSlackStore((s) => s.variants.<key>)` in
 *     the component(s) that should branch on it.
 */

export interface VariantState {
  /** Where the agent suggestion strip renders relative to the composer. */
  suggestionPlacement: "inline" | "above-input";
}

export const DEFAULT_VARIANTS: VariantState = {
  suggestionPlacement: "inline",
};

export interface VariantAxis<K extends keyof VariantState = keyof VariantState> {
  key: K;
  label: string;
  description: string;
  options: ReadonlyArray<{
    value: VariantState[K];
    label: string;
    description: string;
  }>;
}

export const VARIANT_OPTIONS: ReadonlyArray<VariantAxis> = [
  {
    key: "suggestionPlacement",
    label: "Suggestion placement",
    description:
      "Where agent suggestions appear while you're drafting a message.",
    options: [
      {
        value: "inline",
        label: "Inline (in toolbar)",
        description:
          "Chips share the composer footer with the formatting toolbar.",
      },
      {
        value: "above-input",
        label: "Above input (floating)",
        description:
          "Chips sit above the input field, like file upload chips or link previews.",
      },
    ],
  },
];

export const VARIANTS_STORAGE_KEY = "slack-agent.variants.v1";

export function loadVariantsFromStorage(): VariantState {
  if (typeof window === "undefined") return DEFAULT_VARIANTS;
  try {
    const raw = window.localStorage.getItem(VARIANTS_STORAGE_KEY);
    if (!raw) return DEFAULT_VARIANTS;
    const parsed = JSON.parse(raw) as Partial<VariantState>;
    return { ...DEFAULT_VARIANTS, ...parsed };
  } catch {
    return DEFAULT_VARIANTS;
  }
}

export function saveVariantsToStorage(variants: VariantState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      VARIANTS_STORAGE_KEY,
      JSON.stringify(variants),
    );
  } catch {
    // Quota or private mode — silently ignore. Defaults still apply.
  }
}
