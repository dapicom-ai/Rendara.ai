"use client";

import { useEffect, useState } from "react";

// The greeting split into segments: [text, isAccent]
const SEGMENTS: [string, boolean][] = [
  ["Hi, I'm ", false],
  ["Rendara", true],
  [" — how can I help you today?", false],
];

const FULL_TEXT = SEGMENTS.map(([t]) => t).join("");

/**
 * Typing animation greeting.
 * "Rendara" renders in #00D4FF, surrounding text in white.
 */
export function TypingGreeting() {
  const [displayed, setDisplayed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (displayed >= FULL_TEXT.length) {
      setDone(true);
      return;
    }
    const delay = displayed === 0 ? 400 : 38;
    const t = setTimeout(() => setDisplayed((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [displayed]);

  // Build rendered output: slice characters, colouring by segment
  let chars = displayed;
  const parts: React.ReactNode[] = [];
  for (let i = 0; i < SEGMENTS.length; i++) {
    const [seg, isAccent] = SEGMENTS[i];
    if (chars <= 0) break;
    const slice = seg.slice(0, chars);
    chars -= seg.length;
    parts.push(
      <span key={i} style={isAccent ? { color: "#00D4FF" } : { color: "#ffffff" }}>
        {slice}
      </span>
    );
  }

  return (
    <p className="text-2xl font-medium tracking-tight text-center">
      {parts}
      {!done && (
        <span
          className="inline-block w-0.5 h-5 ml-0.5 align-middle bg-[#00D4FF] animate-pulse"
        />
      )}
    </p>
  );
}
