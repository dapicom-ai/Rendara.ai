"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { HomeScreen } from "@/app/components/home/HomeScreen";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import { useNavigationStore } from "@/app/stores/useNavigationStore";

export function HomePageClient() {
  const router = useRouter();
  const refreshConversationList = useNavigationStore((s) => s.refreshConversationList);

  const handleConversationCreated = useCallback(
    (id: string) => {
      refreshConversationList();
      router.push(`/c/${id}`);
    },
    [refreshConversationList, router],
  );

  return (
    <ChatProvider onConversationCreated={handleConversationCreated}>
      <HomeScreen />
    </ChatProvider>
  );
}
