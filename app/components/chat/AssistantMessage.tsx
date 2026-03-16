"use client";

import { motion } from 'framer-motion';
import { MessagePrimitive, useMessage } from "@assistant-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { messageVariants } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MessageActionBar } from "./MessageActionBar";
import { StreamingTypingIndicator } from "./StreamingTypingIndicator";

/**
 * AssistantAvatar -- 32px circular Rendara logo.
 */
function AssistantAvatar() {
  return (
    <div className="size-8 shrink-0 rounded-full overflow-hidden border border-accent/30">
      <img
        src="/rendara-avatar.jpg"
        alt="Rendara"
        className="size-full object-cover"
      />
    </div>
  );
}

/**
 * Assistant message bubble -- left-aligned, cyan left border accent.
 * Uses MessagePrimitive.Content with custom Text component.
 * ToolCall parts are rendered automatically by makeAssistantToolUI registrations.
 */
function TypingIndicatorIfStreaming() {
  const isStreaming = useMessage((m) => m.status?.type === "running");
  if (!isStreaming) return null;
  return <StreamingTypingIndicator />;
}

export function AssistantMessage() {
  const prefersReducedMotion = useReducedMotion();

  const variants = prefersReducedMotion
    ? {
        initial: {},
        animate: { transition: {} },
      }
    : messageVariants;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
    >
      <MessagePrimitive.Root className="group/message flex gap-3 mb-6">
      <AssistantAvatar />

      <div className="flex-1 max-w-3xl min-w-0">
        <div className="border-l-2 border-accent pl-4">
          <MessagePrimitive.Content
            components={{
              Text: ({ text }) => (
                <div className="prose prose-invert prose-sm max-w-none
                    prose-headings:text-white prose-headings:font-semibold
                    prose-p:text-white prose-p:leading-relaxed
                    prose-strong:text-white prose-strong:font-semibold
                    prose-code:text-accent prose-code:bg-surface prose-code:px-1 prose-code:rounded
                    prose-pre:bg-surface prose-pre:border prose-pre:border-border
                    prose-blockquote:border-l-2 prose-blockquote:border-accent prose-blockquote:bg-surface/50 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r
                    prose-li:text-white prose-ul:text-white prose-ol:text-white
                    prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                    prose-table:text-sm prose-th:text-muted-foreground prose-td:text-white">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                </div>
              ),
            }}
          />

          {/* Typing indicator while this message is streaming */}
          <TypingIndicatorIfStreaming />
        </div>

        <MessageActionBar />
      </div>
      </MessagePrimitive.Root>
    </motion.div>
  );
}
