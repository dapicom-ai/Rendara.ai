"use client";

import type { ChatModelAdapter } from "@assistant-ui/react";
import type { SSEEvent, ResourceUpdatedEvent } from "@/types";

type ReadonlyJSONValue = string | number | boolean | null | ReadonlyJSONObject | readonly ReadonlyJSONValue[];
type ReadonlyJSONObject = { readonly [key: string]: ReadonlyJSONValue };

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001";

/**
 * Factory that creates a ChatModelAdapter bound to a specific conversation ID.
 * If no ID is provided, a new one is generated on the first message.
 */
export function createRendaraAdapter(
  existingConversationId?: string,
  onMessageComplete?: (conversationId: string, messageId: string) => void,
  onConversationCreated?: (id: string) => void,
  onPinnedMetadata?: (title: string, description: string) => void,
  onResourceUpdated?: (resourceType: string, resourceId: string) => void,
  resourceId?: string,
): ChatModelAdapter {
  let conversationId = existingConversationId ?? "";

  return {
  async *run({ messages, abortSignal }) {
    // Extract last user message text for the backend
    const lastMessage = messages[messages.length - 1];
    const userText = lastMessage?.content
      ?.filter(
        (p): p is { type: "text"; text: string } => p.type === "text",
      )
      .map((p) => p.text)
      .join("") ?? "";

    // Generate a conversation ID if we don't have one yet
    if (!conversationId) {
      conversationId =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      // NOTE: do NOT call onConversationCreated here — the fetch hasn't started yet.
      // Navigation fires after message_complete below so the stream isn't aborted.
    }

    const response = await fetch(`${BACKEND_URL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        message: userText,
        new_conversation: messages.length <= 1,
        ...(resourceId ? { resource_id: resourceId } : {}),
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body from backend");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    // Mutable content accumulator
    type TextPart = { type: "text"; text: string };
    type ToolCallPart = {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args: ReadonlyJSONObject;
      argsText: string;
      result?: unknown;
      isError?: boolean;
    };
    type ContentPart = TextPart | ToolCallPart;

    const content: ContentPart[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          // SSE format: "event: <type>\ndata: <json>\n\n" or "data: <json>\n"
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") return;

          let event: SSEEvent;
          try {
            event = JSON.parse(raw) as SSEEvent;
          } catch {
            console.warn("Malformed SSE data, skipping:", raw);
            continue;
          }

          switch (event.type) {
            case "text_delta": {
              // Accumulate into the last text part, or create a new one
              const lastPart = content[content.length - 1];
              if (lastPart && lastPart.type === "text") {
                lastPart.text += event.delta;
              } else {
                content.push({ type: "text", text: event.delta });
              }
              yield { content: [...content] };
              break;
            }

            case "tool_call_start": {
              content.push({
                type: "tool-call",
                toolCallId: event.tool_call_id,
                toolName: event.tool_name,
                args: (event.arguments ?? {}) as ReadonlyJSONObject,
                argsText: JSON.stringify(event.arguments ?? {}),
              });
              yield { content: [...content] };
              break;
            }

            case "tool_call_result": {
              const tc = content.find(
                (p): p is ToolCallPart =>
                  p.type === "tool-call" && p.toolCallId === event.tool_call_id,
              );
              if (tc) {
                // Use structured tool_result if present (e.g. create_dashboard, create_story),
                // otherwise fall back to the summary envelope used by MCPToolCallUI.
                tc.result = event.tool_result ?? {
                  success: event.success,
                  duration_ms: event.duration_ms,
                  result_summary: event.result_summary,
                  server_name: event.server_name,
                };
              }
              yield { content: [...content] };
              break;
            }

            case "tool_call_error": {
              const tcErr = content.find(
                (p): p is ToolCallPart =>
                  p.type === "tool-call" && p.toolCallId === event.tool_call_id,
              );
              if (tcErr) {
                tcErr.result = {
                  error_code: event.error_code,
                  error_message: event.error_message,
                  server_name: event.server_name,
                };
                tcErr.isError = true;
              }
              yield { content: [...content] };
              break;
            }

            case "viz_block": {
              content.push({
                type: "tool-call",
                toolCallId: event.block_id,
                toolName: "viz_block",
                args: {},
                argsText: "{}",
                result: event.spec,
              });
              yield { content: [...content] };
              break;
            }

            case "mermaid_block": {
              content.push({
                type: "tool-call",
                toolCallId: event.block_id,
                toolName: "mermaid_block",
                args: {},
                argsText: "{}",
                result: event.definition,
              });
              yield { content: [...content] };
              break;
            }

            case "message_complete": {
              // Final yield
              yield { content: [...content] };
              if (onMessageComplete) {
                onMessageComplete(conversationId, event.message_id ?? "");
              }
              // Navigate to the conversation page now that the response is saved
              if (!existingConversationId && onConversationCreated) {
                onConversationCreated(conversationId);
              }
              return;
            }

            case "pinned_metadata": {
              if (onPinnedMetadata) {
                onPinnedMetadata(event.title, event.description);
              }
              break;
            }

            case "dashboard_creating":
            case "story_creating": {
              // Progress indicator — emitted as text delta so it appears inline
              const lastPart = content[content.length - 1];
              if (lastPart && lastPart.type === "text") {
                lastPart.text += `\n*${event.message}*`;
              } else {
                content.push({ type: "text", text: `*${event.message}*` });
              }
              yield { content: [...content] };
              break;
            }

            case "dashboard_complete": {
              content.push({
                type: "tool-call",
                toolCallId: event.dashboard_id,
                toolName: "create_dashboard",
                args: {},
                argsText: "{}",
                result: { dashboard_id: event.dashboard_id, title: event.title },
              });
              yield { content: [...content] };
              break;
            }

            case "story_complete": {
              content.push({
                type: "tool-call",
                toolCallId: event.story_id,
                toolName: "create_story",
                args: {},
                argsText: "{}",
                result: { story_id: event.story_id, title: event.title },
              });
              yield { content: [...content] };
              break;
            }

            case "resource_updated": {
              if (onResourceUpdated) {
                const ru = event as ResourceUpdatedEvent;
                onResourceUpdated(ru.resource_type, ru.resource_id);
              }
              break;
            }

            case "error": {
              throw new Error(event.error_message);
            }
          }
        }
      }

      // End of stream without message_complete -- yield what we have
      if (content.length > 0) {
        yield { content: [...content] };
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled -- return silently
        return;
      }
      throw err;
    }
  },
  };
}

// Default adapter for use without a specific conversation ID (e.g. new conversations)
export const rendaraAdapter: ChatModelAdapter = createRendaraAdapter();
