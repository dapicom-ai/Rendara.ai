"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, GripVertical, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface DashboardPinCardProps {
  id: string;
  title: string;
  note?: string;
  content: React.ReactNode;
  onUnpin?: (id: string) => Promise<void>;
  onExpand?: () => void;
  isDragging?: boolean;
}

export function DashboardPinCard({
  id,
  title,
  note,
  content,
  onUnpin,
  onExpand,
  isDragging,
}: DashboardPinCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!onUnpin) return;
    try {
      setIsDeleting(true);
      await onUnpin(id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <motion.div
        layout
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-border bg-surface p-4",
          isDragging && "opacity-50"
        )}
      >
        {/* Header with drag handle */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="line-clamp-1 font-semibold text-primary">{title}</h3>
            {note && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{note}</p>
            )}
          </div>
          <button
            className="flex-shrink-0 rounded-md p-1 hover:bg-surface-hover transition-colors"
            aria-label="Drag to reorder"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content preview */}
        <div className="h-48 overflow-hidden rounded-lg bg-surface-hover">
          {content}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {onExpand && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExpand}
              className="gap-2"
            >
              <ZoomOut className="h-4 w-4" />
              Expand
            </Button>
          )}
          {onUnpin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="ml-auto gap-2 text-error hover:text-error"
            >
              <Trash2 className="h-4 w-4" />
              Unpin
            </Button>
          )}
        </div>
      </motion.div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove insight?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unpin the insight from your dashboard. You can always
              pin it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-error text-error-foreground hover:bg-error/90"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
