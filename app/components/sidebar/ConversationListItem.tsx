"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface ConversationListItemProps {
  id: string;
  title: string;
  createdAt: string | Date;
}

function getRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffTime = today.getTime() - dateOnly.getTime();
  const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) return "Today";
  if (daysDiff === 1) return "Yesterday";
  if (daysDiff <= 7) return "Last 7 days";
  return "Older";
}

export function ConversationListItem({
  id,
  title,
  createdAt,
}: ConversationListItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const isActive = pathname === `/c/${id}`;

  const handleClick = () => {
    router.push(`/c/${id}`);
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={prefersReducedMotion ? {} : { x: 2 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "w-full text-left flex flex-col gap-1 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-surface-hover text-primary"
          : "text-muted-foreground hover:text-primary hover:bg-surface/50"
      )}
    >
      <span className="truncate font-medium">{title}</span>
      <span className="truncate text-xs text-muted-foreground">
        {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
    </motion.button>
  );
}

export function groupConversationsByDate(
  conversations: Array<{ id: string; title: string; createdAt: string | Date }>
): Record<string, Array<{ id: string; title: string; createdAt: string | Date }>> {
  const grouped: Record<
    string,
    Array<{ id: string; title: string; createdAt: string | Date }>
  > = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Older: [],
  };

  conversations.forEach((conv) => {
    const timeGroup = getRelativeTime(conv.createdAt);
    grouped[timeGroup].push(conv);
  });

  return grouped;
}
