"use client";

import { ThreadPrimitive } from "@assistant-ui/react";
import { ChevronDown } from "lucide-react";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { ConversationInput } from "./ConversationInput";

/**
 * Active conversation thread view.
 * Uses ThreadPrimitive for message rendering with auto-scroll.
 */
export function ConversationView() {
  return (
    <ThreadPrimitive.Root className="relative flex flex-col h-full">
      {/* Scrollable message area */}
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6" role="log" aria-live="polite" aria-label="Chat messages">
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
        </div>
      </ThreadPrimitive.Viewport>

      {/* Scroll to bottom button */}
      <ThreadPrimitive.ScrollToBottom
        className="absolute bottom-24 right-6 inline-flex items-center justify-center size-8 rounded-full bg-secondary border border-border text-muted-foreground hover:text-white hover:border-accent transition-colors"
        aria-label="Scroll to bottom"
      >
        <ChevronDown className="size-4" />
      </ThreadPrimitive.ScrollToBottom>

      {/* Sticky input bar */}
      <div className="border-t border-border bg-background px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <ConversationInput />
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
}
