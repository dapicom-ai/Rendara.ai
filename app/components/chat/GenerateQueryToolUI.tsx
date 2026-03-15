"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { useState, useEffect, useRef } from "react";
import { Check, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Understanding what you need", ms: 8000 },
  { label: "Finding the right data", ms: 50000 },
  { label: "Verifying the answer is accurate", ms: 18000 },
];

/** Animated progress bar that fills over `durationMs` on mount. */
function StepProgressBar({ durationMs }: { durationMs: number }) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    // Double rAF ensures the 0% state is painted before the transition starts.
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setFilled(true))
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="w-20 h-1 rounded-full bg-surface-high overflow-hidden shrink-0">
      <div
        className="h-full bg-accent rounded-full"
        style={{
          width: filled ? "100%" : "0%",
          transition: `width ${durationMs}ms linear`,
        }}
      />
    </div>
  );
}

interface ResearchCardProps {
  question: string;
  isRunning: boolean;
  isComplete: boolean;
}

function ResearchCard({ question, isRunning, isComplete }: ResearchCardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [elapsedS, setElapsedS] = useState(0);
  const startRef = useRef(Date.now());
  const frozenElapsedRef = useRef<number | null>(null);

  // Advance steps on timers while running
  useEffect(() => {
    if (!isRunning) return;
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.slice(0, -1).forEach((step, i) => {
      cumulative += step.ms;
      timers.push(
        setTimeout(() => {
          setCompletedSteps((prev) => new Set([...prev, i]));
          setCurrentStep(i + 1);
        }, cumulative)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [isRunning]);

  // On complete: mark all steps done and freeze elapsed
  useEffect(() => {
    if (isComplete) {
      setCompletedSteps(new Set([0, 1, 2]));
      frozenElapsedRef.current = Math.floor((Date.now() - startRef.current) / 1000);
    }
  }, [isComplete]);

  // Elapsed seconds counter
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setElapsedS(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const displayElapsed = isComplete
    ? (frozenElapsedRef.current ?? elapsedS)
    : elapsedS;

  // Collapsed state after complete
  if (isComplete) {
    return (
      <div className="flex items-center gap-2 my-1 text-xs text-muted-foreground">
        <Zap className="size-3 text-accent shrink-0" />
        <span>Researched · {displayElapsed}s</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-accent/40 bg-card px-4 py-3 my-2 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin text-accent shrink-0" />
        <span className="text-sm font-medium text-white">Researching your question…</span>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{elapsedS}s</span>
      </div>

      {/* Question echo */}
      {question && (
        <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-2">
          &ldquo;{question}&rdquo;
        </p>
      )}

      {/* Step list */}
      <div className="space-y-2">
        {STEPS.map((step, i) => {
          const isDone = completedSteps.has(i);
          const isActive = currentStep === i && !isDone;
          const isPending = !isDone && !isActive;
          return (
            <div key={i} className="flex items-center gap-3">
              {/* Status dot / check */}
              <div className="size-4 shrink-0 flex items-center justify-center">
                {isDone ? (
                  <Check className="size-3 text-success" />
                ) : isActive ? (
                  <div className="size-2 rounded-full bg-accent animate-pulse" />
                ) : (
                  <div className="size-2 rounded-full bg-border" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-xs flex-1",
                  isDone && "text-muted-foreground",
                  isActive && "text-white",
                  isPending && "text-muted-foreground/40"
                )}
              >
                {step.label}
              </span>

              {/* Progress bar — only for active step */}
              {isActive && <StepProgressBar key={i} durationMs={step.ms} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const GenerateQueryToolUI = makeAssistantToolUI({
  toolName: "generate_query",
  render: ({ args, status }) => {
    const a = args as { question?: string } | undefined;
    const question = a?.question ?? "";
    const isRunning = status.type === "running";
    const isComplete = status.type === "complete";

    return (
      <ResearchCard
        question={question}
        isRunning={isRunning}
        isComplete={isComplete}
      />
    );
  },
});
