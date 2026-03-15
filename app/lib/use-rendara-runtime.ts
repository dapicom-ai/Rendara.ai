"use client";

import { useLocalRuntime } from "@assistant-ui/react";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { useMemo, useCallback } from "react";
import { createRendaraAdapter } from "./rendara-adapter";
import { useNavigationStore } from "@/app/stores/useNavigationStore";

/**
 * Creates the assistant-ui runtime wired to the Rendara FastAPI backend.
 * Accepts an optional conversationId (from URL) and initial messages (from API).
 */
export function useRendaraRuntime(
  conversationId?: string,
  initialMessages?: ThreadMessageLike[],
  onConversationCreated?: (id: string) => void,
  onResourceUpdated?: (resourceType: string, resourceId: string) => void,
  resourceId?: string,
) {
  const setCurrentConversation = useNavigationStore(
    (s) => s.setCurrentConversation,
  );

  const onMessageComplete = useCallback(
    (convId: string, msgId: string) => {
      setCurrentConversation(convId, msgId);
    },
    [setCurrentConversation],
  );

  const onConversationCreatedRef = useCallback(
    (id: string) => {
      if (onConversationCreated) onConversationCreated(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const adapter = useMemo(
    () => createRendaraAdapter(conversationId, onMessageComplete, onConversationCreatedRef, undefined, onResourceUpdated, resourceId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, resourceId],
  );
  return useLocalRuntime(adapter, {
    initialMessages: initialMessages?.length ? initialMessages : undefined,
  });
}
