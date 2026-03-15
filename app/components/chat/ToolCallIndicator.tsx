"use client";

import { cn } from "@/lib/utils";
import { Loader2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { toolCallStatusVariants } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface ToolCallResult {
  success?: boolean;
  duration_ms?: number;
  result_summary?: string;
  server_name?: string;
  error_code?: string;
  error_message?: string;
}

interface ToolCallIndicatorProps {
  toolName: string;
  status: "running" | "complete" | "incomplete" | "requires-action";
  result?: ToolCallResult;
}

export function ToolCallIndicator({ toolName, status, result }: ToolCallIndicatorProps) {
  const prefersReducedMotion = useReducedMotion();
  const isRunning = status === "running";
  const isComplete = status === "complete" && !result?.error_code;
  const isError = status === "incomplete" || !!result?.error_code;

  const serverName = result?.server_name ?? "MCP Server";
  const duration = result?.duration_ms;
  const summary = result?.result_summary ?? result?.error_message;

  const variants = prefersReducedMotion
    ? {
        initial: {},
        animate: { transition: {} },
        exit: { transition: {} },
      }
    : toolCallStatusVariants;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 my-2",
        "bg-card",
        isRunning && "border-accent/50",
        isComplete && "border-success/50",
        isError && "border-destructive/50",
      )}
    >
      {/* Status icon */}
      <AnimatePresence mode="wait">
        {isRunning && (
          <motion.div
            key="running"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
          >
            <Loader2 className="size-4 animate-spin text-accent" />
          </motion.div>
        )}
        {isComplete && (
          <motion.div
            key="complete"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
          >
            <Check className="size-4 text-success" />
          </motion.div>
        )}
        {isError && (
          <motion.div
            key="error"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
          >
            <X className="size-4 text-destructive" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-white truncate">{toolName}</span>
          <span className="text-muted-foreground text-xs">{serverName}</span>
          {duration != null && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {duration}ms
            </span>
          )}
        </div>
        {summary && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate text-pretty">
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}
