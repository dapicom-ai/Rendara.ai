"use client";

import { useEffect, useState } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { ChatProvider } from "./ChatProvider";
import { ConversationView } from "./ConversationView";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001";

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string | Array<{
    type: string;
    text?: string;
    spec?: Record<string, unknown>;
    definition?: string;
    tool_call_id?: string;
    tool_name?: string;
    server_name?: string;
    success?: boolean;
    duration_ms?: number;
    tool_result?: Record<string, unknown>;
  }>;
}

function convertToThreadMessages(messages: StoredMessage[]): ThreadMessageLike[] {
  return messages.map((msg) => {
    if (msg.role === "user") {
      return {
        role: "user" as const,
        content: [{ type: "text" as const, text: typeof msg.content === "string" ? msg.content : "" }],
      };
    }

    // Assistant message — convert content blocks to assistant-ui format
    const content: Array<{ type: "text"; text: string } | { type: "tool-call"; toolCallId: string; toolName: string; args: Record<string, unknown>; argsText: string; result?: unknown }> = [];
    const blocks = Array.isArray(msg.content) ? msg.content : [];

    for (const block of blocks) {
      if (block.type === "text" && block.text) {
        content.push({ type: "text" as const, text: block.text });
      } else if (block.type === "viz_chart" && block.spec) {
        content.push({
          type: "tool-call" as const,
          toolCallId: `viz_restored_${Math.random().toString(36).slice(2, 8)}`,
          toolName: "viz_block",
          args: {},
          argsText: "{}",
          result: block.spec,
        });
      } else if (block.type === "mermaid" && block.definition) {
        content.push({
          type: "tool-call" as const,
          toolCallId: `mmd_restored_${Math.random().toString(36).slice(2, 8)}`,
          toolName: "mermaid_block",
          args: {},
          argsText: "{}",
          result: block.definition,
        });
      } else if (block.type === "tool_call" && block.tool_call_id) {
        content.push({
          type: "tool-call" as const,
          toolCallId: block.tool_call_id,
          toolName: block.tool_name ?? "unknown",
          args: {},
          argsText: "{}",
          result: block.tool_result ?? {
            success: block.success,
            duration_ms: block.duration_ms,
            server_name: block.server_name,
          },
        });
      }
    }

    return {
      role: "assistant" as const,
      content: content as ThreadMessageLike["content"],
    };
  });
}

interface ResourceConversationLoaderProps {
  conversationId: string;
  resourceId: string;
  onResourceUpdated?: (resourceType: string, resourceId: string) => void;
}

/**
 * Like ConversationLoader but passes resourceId and onResourceUpdated
 * to ChatProvider — used by the AgentChatPanel on dashboard/story detail pages.
 */
export function ResourceConversationLoader({ conversationId, resourceId, onResourceUpdated }: ResourceConversationLoaderProps) {
  const [initialMessages, setInitialMessages] = useState<ThreadMessageLike[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/conversations/${conversationId}`);
        if (!res.ok) {
          setInitialMessages(undefined);
          return;
        }
        const data = await res.json();
        if (!cancelled && data.messages?.length) {
          setInitialMessages(convertToThreadMessages(data.messages));
        }
      } catch {
        // Conversation not found or network error — start fresh
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMessages();
    return () => { cancelled = true; };
  }, [conversationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <ChatProvider
      key={conversationId}
      conversationId={conversationId}
      initialMessages={initialMessages}
      resourceId={resourceId}
      onResourceUpdated={onResourceUpdated}
    >
      <ConversationView />
    </ChatProvider>
  );
}

interface ConversationLoaderProps {
  conversationId: string;
}

export function ConversationLoader({ conversationId }: ConversationLoaderProps) {
  const [initialMessages, setInitialMessages] = useState<ThreadMessageLike[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/conversations/${conversationId}`);
        if (!res.ok) {
          setInitialMessages(undefined);
          return;
        }
        const data = await res.json();
        if (!cancelled && data.messages?.length) {
          setInitialMessages(convertToThreadMessages(data.messages));
        }
      } catch {
        // Conversation not found or network error — start fresh
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMessages();
    return () => { cancelled = true; };
  }, [conversationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground text-sm">Loading conversation...</div>
      </div>
    );
  }

  return (
    <ChatProvider
      key={conversationId}
      conversationId={conversationId}
      initialMessages={initialMessages}
    >
      <ConversationView />
    </ChatProvider>
  );
}
