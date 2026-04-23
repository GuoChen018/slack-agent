"use client";

import { FileText, Image as ImageIcon, Film, File } from "lucide-react";
import type { FileAttachment } from "@/lib/types";

export function FileAttachmentTile({ attachment }: { attachment: FileAttachment }) {
  const { kind, name, size } = attachment;
  const Icon =
    kind === "image" ? ImageIcon : kind === "video" ? Film : kind === "pdf" ? FileText : File;
  const iconColor =
    kind === "pdf" ? "#E01E5A" : kind === "image" ? "#2EB67D" : "#1264A3";
  return (
    <div className="flex max-w-[420px] items-center gap-3 rounded-md border border-slack-border bg-white px-3 py-2">
      <div
        className="flex h-9 w-9 items-center justify-center rounded"
        style={{ background: `${iconColor}22`, color: iconColor }}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold text-slack-text">{name}</div>
        <div className="text-[12px] text-slack-text-muted">
          {size ?? ""} {size ? " · " : ""}
          {kind.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
