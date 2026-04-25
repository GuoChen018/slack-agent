"use client";

import {
  FileText,
  Type as TypeIcon,
  Play,
  Laptop2,
  Video,
  Mic,
} from "lucide-react";
import { useEffect, useRef } from "react";

const items = [
  { icon: Laptop2, label: "Upload from your computer" },
  { icon: Video, label: "Record video clip" },
  { icon: Mic, label: "Record audio clip" },
  { icon: FileText, label: "Canvas" },
  { icon: Play, label: "Workflow" },
  { icon: TypeIcon, label: "Text snippet" },
];

export function PlusMenu({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-[120%] left-0 z-50 w-[260px] overflow-hidden rounded-lg border border-slack-border bg-white shadow-md"
    >
      <ul className="py-1">
        {items.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[14px] hover:bg-[#f4f4f4]"
          >
            <Icon size={16} strokeWidth={1.75} className="text-slack-text" />
            <span className="text-slack-text">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
