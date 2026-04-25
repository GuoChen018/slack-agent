"use client";

import { useSlackStore } from "@/lib/store";

/**
 * Drag handle pinned to the left edge of the right-hand pane (thread or
 * agent). Dragging it leftwards widens the pane, rightwards narrows it.
 * Width is shared in the store so both panes feel like the same surface.
 */
export function RightPaneResizer() {
  const setRightPaneWidth = useSlackStore((s) => s.setRightPaneWidth);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const aside = e.currentTarget.parentElement as HTMLElement | null;
    if (!aside) return;
    const right = aside.getBoundingClientRect().right;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => setRightPaneWidth(right - ev.clientX);
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      // Sits on the very-left edge of the pane, slightly outside the
      // rounded corner so the cursor feedback is generous. Transparent
      // until hover so it doesn't compete with the pane chrome.
      className="absolute top-0 -left-1.5 z-20 h-full w-3 cursor-col-resize"
    />
  );
}
