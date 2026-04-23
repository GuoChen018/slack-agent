"use client";

import { WorkspaceRail } from "@/components/shell/WorkspaceRail";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { ChannelHeader } from "@/components/channel/ChannelHeader";
import { MessageList } from "@/components/channel/MessageList";
import { Composer } from "@/components/composer/Composer";
import { ThreadPane } from "@/components/thread/ThreadPane";
import { QuickSwitcher } from "@/components/QuickSwitcher";
import { useSlackStore } from "@/lib/store";

export default function SlackApp() {
  const threadOpen = useSlackStore((s) => !!s.openThreadParentId);
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#3F0E40]">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <WorkspaceRail />
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col bg-white">
          <ChannelHeader />
          <MessageList />
          <Composer />
        </main>
        {threadOpen && <ThreadPane />}
      </div>
      <QuickSwitcher />
    </div>
  );
}
