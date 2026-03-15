"use client";

import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Three-dot bounce indicator shown during streaming.
 * Pure CSS animation — always pulses while visible regardless of React re-renders.
 * Stagger via animation-delay on each dot.
 */
export function StreamingTypingIndicator() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="size-2 rounded-full bg-accent"
          style={
            prefersReducedMotion
              ? undefined
              : {
                  animation: "typingBounce 0.6s ease-in-out infinite",
                  animationDelay: `${i * 150}ms`,
                }
          }
        />
      ))}
    </div>
  );
}
