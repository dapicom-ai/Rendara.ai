"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  useAuiState,
} from "@assistant-ui/react";
import { Copy, Check, RefreshCw, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePinModalStore } from "@/app/stores/usePinModalStore";

const iconButtonClass = cn(
  "inline-flex items-center justify-center rounded-full p-1.5",
  "text-muted-foreground transition-colors",
  "hover:text-accent hover:bg-secondary",
);

/**
 * Action row below assistant messages.
 * Uses ActionBarPrimitive for copy/reload; Bookmark pins the entire message.
 */
export function MessageActionBar() {
  const openModal = usePinModalStore((s) => s.openModal);
  const content = useAuiState((s) => s.message?.content ?? []);

  function handlePin() {
    // Extract a title from the first text part
    const firstText = content.find((p: { type: string }) => p.type === "text") as { type: string; text?: string } | undefined;
    const snippet = firstText?.text?.slice(0, 60) ?? "Pinned Response";
    const title = snippet.length < (firstText?.text?.length ?? 0) ? `${snippet}…` : snippet;

    openModal(
      { type: "message", data: { content } },
      title,
      "",
    );
  }

  return (
    <ActionBarPrimitive.Root
      className="flex items-center gap-1 mt-2"
      hideWhenRunning
    >
      {/* Copy */}
      <ActionBarPrimitive.Copy
        className={iconButtonClass}
        copiedDuration={2000}
        aria-label="Copy message"
      >
        <AuiIf condition={({ message }) => message.isCopied}>
          <Check className="size-4 text-success" />
        </AuiIf>
        <AuiIf condition={({ message }) => !message.isCopied}>
          <Copy className="size-4" />
        </AuiIf>
      </ActionBarPrimitive.Copy>

      {/* Regenerate */}
      <ActionBarPrimitive.Reload
        className={iconButtonClass}
        aria-label="Regenerate response"
      >
        <RefreshCw className="size-4" />
      </ActionBarPrimitive.Reload>

      {/* Pin entire message */}
      <button
        className={iconButtonClass}
        aria-label="Save response"
        onClick={handlePin}
      >
        <Bookmark className="size-4" />
      </button>
    </ActionBarPrimitive.Root>
  );
}
