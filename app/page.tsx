"use client";

import { WorkspaceRail } from "@/components/shell/WorkspaceRail";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { ChannelHeader } from "@/components/channel/ChannelHeader";
import { MessageList } from "@/components/channel/MessageList";
import { Composer } from "@/components/composer/Composer";
import { ThreadPane } from "@/components/thread/ThreadPane";
import { AgentPane } from "@/components/agent/AgentPane";
import { QuickSwitcher } from "@/components/QuickSwitcher";
import { MentionHoverCard } from "@/components/MentionHoverCard";
import { VariantPalette } from "@/components/VariantPalette";
import { VariantBadge } from "@/components/VariantBadge";
import { useSlackStore } from "@/lib/store";

export default function SlackApp() {
  const threadOpen = useSlackStore((s) => !!s.openThreadParentId);
  const agentOpen = useSlackStore((s) => !!s.openAgentId);
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slack-rail">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <WorkspaceRail />
        <div className="flex min-h-0 flex-1 pr-1.5 pb-1.5">
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-r-lg bg-white">
            <ChannelHeader />
            <MessageList />
            <Composer />
          </main>
          {threadOpen && <ThreadPane />}
          {agentOpen && <AgentPane />}
        </div>
      </div>
      <QuickSwitcher />
      <MentionHoverCard />
      <VariantPalette />
      <VariantBadge />
    </div>
  );
}
