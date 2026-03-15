"use client";

import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";
import { ChevronDown } from "lucide-react";
import { ConversationInput } from "../chat/ConversationInput";
import { SuggestedPromptChip } from "./SuggestedPromptChip";
import { TypingGreeting } from "./TypingGreeting";
import { UserMessage } from "../chat/UserMessage";
import { AssistantMessage } from "../chat/AssistantMessage";

const SUGGESTED_PROMPTS = [
  "What data do you have?",
  "Build me a dashboard",
  "Create a story from my data",
];

/**
 * HomeScreen -- serves as both the empty state hero and the active conversation.
 *
 * When the thread is empty: centered hero with input and prompt chips.
 * When messages exist: full conversation thread with sticky bottom input.
 */
export function HomeScreen() {
  return (
    <ThreadPrimitive.Root className="relative flex flex-col h-full">
      {/* Empty state -- hero layout */}
      <ThreadPrimitive.Empty>
        <div className="flex h-full flex-col items-center justify-center px-4 gap-0">
          {/* Circular logo */}
          <div className="size-24 rounded-full overflow-hidden border-2 border-accent/40 shadow-[0_0_24px_rgba(0,212,255,0.2)]">
            <img
              src="/rendara-avatar.jpg"
              alt="Rendara"
              className="size-full object-cover"
            />
          </div>

          {/* Typing greeting */}
          <div className="mt-5">
            <TypingGreeting />
          </div>

          {/* Input bar */}
          <div className="mt-8 w-full max-w-2xl">
            <ConversationInput />
          </div>

          {/* Suggested prompts */}
          <div className="mt-5 flex flex-wrap justify-center gap-3 max-w-2xl">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <SuggestedPromptChip key={prompt} text={prompt} />
            ))}
          </div>
        </div>
      </ThreadPrimitive.Empty>

      {/* Message thread -- only visible when messages exist */}
      <AuiIf condition={({ thread }) => !thread.isEmpty}>
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

        {/* Scroll to bottom */}
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
      </AuiIf>
    </ThreadPrimitive.Root>
  );
}
