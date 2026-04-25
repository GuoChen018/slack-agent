"use client";

import { useEffect, useRef } from "react";

interface PopoverShellProps {
  rect: DOMRect;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  maxHeight?: number;
}

/** A positioning shell for the trigger popovers — places above the caret rect. */
export function PopoverShell({
  rect,
  onClose,
  children,
  width = 340,
  maxHeight = 320,
}: PopoverShellProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  // Anchor the popover's BOTTOM edge 8px above the caret so it hugs the input
  // regardless of how many rows are rendered.
  const bottom = Math.max(10, window.innerHeight - rect.top + 8);
  const left = Math.min(
    window.innerWidth - width - 12,
    Math.max(12, rect.left - 12),
  );

  return (
    <div
      ref={ref}
      role="listbox"
      className="shadow-popover fixed z-50 overflow-hidden rounded-lg bg-white"
      style={{ bottom, left, width, maxHeight }}
    >
      {children}
    </div>
  );
}
