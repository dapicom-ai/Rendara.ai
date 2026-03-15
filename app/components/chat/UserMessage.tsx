"use client";

import { motion } from 'framer-motion';
import { MessagePrimitive } from "@assistant-ui/react";
import { messageVariants } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * User message bubble -- right-aligned, surface background.
 */
export function UserMessage() {
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
      <MessagePrimitive.Root className="flex justify-end mb-6">
      <div className="max-w-[75%]">
        <div className="bg-card rounded-2xl px-4 py-3">
          <MessagePrimitive.Content
            components={{
              Text: ({ text }) => (
                <p className="text-white text-sm whitespace-pre-wrap text-pretty">
                  {text}
                </p>
              ),
            }}
          />
        </div>
      </div>
      </MessagePrimitive.Root>
    </motion.div>
  );
}
