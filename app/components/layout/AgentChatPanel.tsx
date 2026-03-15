"use client";

import { useState, useEffect, useRef } from "react";
import { PanelRight, RotateCcw } from "lucide-react";
import { ResourceConversationLoader } from "@/app/components/chat/ConversationLoader";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001";

interface AgentChatPanelProps {
  resourceId: string;   // "dashboard:{uuid}" or "story:{uuid}"
  onResourceUpdated?: (resourceType: string, resourceId: string) => void;
  className?: string;
}

/**
 * Fetches the resource, reuses an existing conversation_id if present,
 * or generates a new UUID and PATCHes it onto the resource.
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

/**
 * Creates a fresh conversation_id and PATCHes it onto the resource.
 */
async function resetResourceConversation(resourceId: string): Promise<string> {
  const [resourceType, resourceUuid] = resourceId.split(":", 2);
  const endpoint = resourceType === "dashboard"
    ? `${BACKEND_URL}/api/dashboards/${resourceUuid}`
    : `${BACKEND_URL}/api/stories/${resourceUuid}`;

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
  // Bump this to force ResourceConversationLoader to re-mount and re-fetch
  const [loadKey, setLoadKey] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId || isInitializing) return;
    setIsInitializing(true);
    initResourceConversation(resourceId)
      .then(setConversationId)
      .catch(console.error)
      .finally(() => setIsInitializing(false));
  }, [resourceId, conversationId, isInitializing]);

  // When the panel re-expands, bump loadKey to re-fetch messages from DB
  useEffect(() => {
    if (isExpanded && conversationId) {
      setLoadKey((k) => k + 1);
    }
  }, [isExpanded, conversationId]);

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

  const handleNewConversation = async () => {
    try {
      const newId = await resetResourceConversation(resourceId);
      setConversationId(newId);
      setLoadKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to reset conversation", err);
    }
  };

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
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewConversation}
            aria-label="New conversation"
            title="New conversation"
            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-surface transition-colors text-muted-foreground hover:text-primary"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            aria-label="Close agent chat"
            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-surface transition-colors text-muted-foreground hover:text-primary"
          >
            <PanelRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-hidden">
        {isInitializing && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            Initializing...
          </div>
        )}
        {!isInitializing && conversationId && (
          <ResourceConversationLoader
            key={`${conversationId}-${loadKey}`}
            conversationId={conversationId}
            resourceId={resourceId}
            onResourceUpdated={onResourceUpdated}
          />
        )}
      </div>
    </div>
  );
}
