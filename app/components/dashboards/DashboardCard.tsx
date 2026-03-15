"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  id: string;
  title: string;
  tileCount: number;
  updatedAt: string | Date;
  thumbnail?: string;
}

export function DashboardCard({
  id,
  title,
  tileCount,
  updatedAt,
}: DashboardCardProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const handleClick = () => {
    router.push(`/dashboards/${id}`);
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={prefersReducedMotion ? {} : { y: -3 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent/50"
    >
      {/* Thumbnail placeholder */}
      <div className="flex h-32 items-center justify-center rounded-lg bg-surface-hover">
        <LayoutGrid className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Card content */}
      <div className="flex flex-col gap-2">
        <h3 className="line-clamp-2 font-semibold text-primary">{title}</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{tileCount} tiles</span>
          <span>{new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
      </div>
    </motion.button>
  );
}
