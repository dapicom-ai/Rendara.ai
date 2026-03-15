"use client";

import { useEffect, useState } from "react";
import {
  ConversationListItem,
  groupConversationsByDate,
} from "./ConversationListItem";
import { cn } from "@/lib/utils";
import { BACKEND_URL } from "@/app/lib/api";
import { useNavigationStore } from "@/app/stores/useNavigationStore";

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
}

export function ConversationHistoryPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const conversationListVersion = useNavigationStore((s) => s.conversationListVersion);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/conversations`);
        if (!response.ok) {
          throw new Error("Failed to fetch conversations");
        }
        const data = await response.json();
        setConversations(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [conversationListVersion]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg bg-surface/30 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="text-xs text-error">Error: {error}</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="text-xs text-muted-foreground text-center">No conversations yet</p>
      </div>
    );
  }

  const grouped = groupConversationsByDate(conversations);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4">
      <div className="space-y-4">
        {Object.entries(grouped).map(([group, items]) => {
          if (items.length === 0) return null;

          return (
            <div key={group}>
              <p className="px-2 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              <div className="space-y-1">
                {items.map((conv) => (
                  <ConversationListItem
                    key={conv.id}
                    id={conv.id}
                    title={conv.title}
                    createdAt={conv.createdAt}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
