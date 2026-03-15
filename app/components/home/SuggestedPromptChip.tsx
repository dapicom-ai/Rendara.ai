"use client";

import { motion } from 'framer-motion';
import { useAui } from "@assistant-ui/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface SuggestedPromptChipProps {
  text: string;
  className?: string;
}

/**
 * A pill-shaped suggestion chip. Clicking appends the prompt text and sends it.
 */
export function SuggestedPromptChip({ text, className }: SuggestedPromptChipProps) {
  const api = useAui();
  const prefersReducedMotion = useReducedMotion();

  const handleClick = () => {
    api.thread().append({
      role: "user",
      content: [{ type: "text", text }],
    });
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
      className={cn(
        "inline-flex items-center rounded-full px-4 py-2",
        "bg-card border border-border",
        "text-sm text-muted-foreground",
        "hover:border-accent/50 hover:text-white",
        "transition-colors",
        className,
      )}
    >
      <span className="truncate">{text}</span>
    </motion.button>
  );
}
