"use client";

import {
  Upload,
  ClipboardPaste,
  FileText,
  ListTodo,
  PenTool,
  Calendar,
  Video,
  Megaphone,
  Workflow,
} from "lucide-react";
import { useEffect, useRef } from "react";

const items = [
  { icon: Upload, label: "Upload from your computer", desc: "" },
  { icon: ClipboardPaste, label: "From Google Drive", desc: "" },
  { icon: FileText, label: "Create a canvas", desc: "A rich document in-line" },
  { icon: ListTodo, label: "Create a list", desc: "Track work in Slack" },
  { icon: PenTool, label: "Create a post", desc: "A longform post in a channel" },
  { icon: Calendar, label: "Create an event", desc: "" },
  { icon: Video, label: "Record a clip", desc: "Video or audio clip" },
  { icon: Megaphone, label: "Create an announcement", desc: "" },
  { icon: Workflow, label: "Add a workflow", desc: "" },
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
      className="absolute bottom-[120%] left-0 z-50 w-[340px] overflow-hidden rounded-lg border border-slack-border bg-white shadow-xl"
    >
      <ul className="py-1">
        {items.map(({ icon: Icon, label, desc }) => (
          <li
            key={label}
            className="flex cursor-pointer items-center gap-3 px-3 py-1.5 hover:bg-[#1264a3] hover:text-white"
          >
            <Icon size={16} />
            <div className="flex-1">
              <div className="text-[14px] font-semibold">{label}</div>
              {desc && <div className="text-[12px] opacity-70">{desc}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
