"use client";

import { useState, useEffect, useRef } from "react";
import { PanelRight } from "lucide-react";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import { ConversationView } from "@/app/components/chat/ConversationView";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001";

interface AgentChatPanelProps {
  resourceId: string;   // "dashboard:{uuid}" or "story:{uuid}"
  onResourceUpdated?: (resourceType: string, resourceId: string) => void;
  className?: string;
}

/**
 * Fetches the resource, reuses an existing conversation_id if present,
 * or generates a new UUID and PATCHes it onto the resource.
 * The conversation row is auto-created by the chat stream endpoint on the first message.
 */
async function initResourceConversation(resourceId: string): Promise<string> {
  const [resourceType, resourceUuid] = resourceId.split(":", 2);
  const endpoint = resourceType === "dashboard"
    ? `${BACKEND_URL}/api/dashboards/${resourceUuid}`
    : `${BACKEND_URL}/api/stories/${resourceUuid}`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`Failed to fetch resource: ${res.status}`);
  const resource = await res.json();

  if (resource.conversationId) {
    return resource.conversationId as string;
  }

  const conversationId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  await fetch(endpoint, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId }),
  });

  return conversationId;
}

export function AgentChatPanel({ resourceId, onResourceUpdated }: AgentChatPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded || conversationId || isInitializing) return;
    setIsInitializing(true);
    initResourceConversation(resourceId)
      .then(setConversationId)
      .catch(console.error)
      .finally(() => setIsInitializing(false));
  }, [isExpanded, resourceId, conversationId, isInitializing]);

  useEffect(() => {
    if (!isExpanded) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed top-3 right-3 z-50 flex items-center justify-center h-8 w-8 rounded-lg bg-surface hover:bg-surface-high transition-colors text-muted-foreground hover:text-primary"
        aria-label="Open agent chat"
      >
        <PanelRight className="size-4" />
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className="fixed right-0 top-0 h-dvh w-80 z-40 flex flex-col bg-background border-l border-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-xs font-medium text-muted-foreground">Agent Chat</span>
        <button
          onClick={() => setIsExpanded(false)}
          aria-label="Close agent chat"
          className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-surface transition-colors text-muted-foreground hover:text-primary"
        >
          <PanelRight className="size-4" />
        </button>
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-hidden">
        {isInitializing && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            Initializing...
          </div>
        )}
        {!isInitializing && conversationId && (
          <ChatProvider
            key={conversationId}
            conversationId={conversationId}
            resourceId={resourceId}
            onResourceUpdated={onResourceUpdated}
          >
            <ConversationView />
          </ChatProvider>
        )}
      </div>
    </div>
  );
}
