"use client";

import {
  ComposerPrimitive,
  AuiIf,
} from "@assistant-ui/react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared input component used on both the home screen and active conversation view.
 * Built with ComposerPrimitive from assistant-ui.
 */
export function ConversationInput({ className }: { className?: string }) {
  return (
    <ComposerPrimitive.Root
      className={cn(
        "flex items-end gap-2 rounded-2xl border border-border bg-card px-4 py-3",
        "focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30",
        "transition-all",
        className,
      )}
    >
      <ComposerPrimitive.Input
        className={cn(
          "flex-1 resize-none bg-transparent text-sm text-white",
          "placeholder:text-muted-foreground",
          "outline-none",
          "max-h-36",
        )}
        placeholder="Ask anything about your data..."
        rows={1}
        autoFocus
      />

      {/* Send button (shown when not running) */}
      <AuiIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send
          className={cn(
            "inline-flex items-center justify-center",
            "size-8 rounded-xl",
            "bg-accent text-background",
            "disabled:opacity-40",
            "transition-opacity",
          )}
          aria-label="Send message"
        >
          <ArrowUp className="size-4" />
        </ComposerPrimitive.Send>
      </AuiIf>

      {/* Cancel button (shown when running) */}
      <AuiIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel
          className={cn(
            "inline-flex items-center justify-center",
            "size-8 rounded-xl",
            "bg-destructive text-white",
            "transition-opacity",
          )}
          aria-label="Stop generation"
        >
          <Square className="size-3" />
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </ComposerPrimitive.Root>
  );
}
