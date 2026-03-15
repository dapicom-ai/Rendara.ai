"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePinModalStore } from "@/app/stores/usePinModalStore";
import { useNavigationStore } from "@/app/stores/useNavigationStore";
import { BACKEND_URL } from "@/app/lib/api";

export function PinModal() {
  const { isOpen, block, title, description, closeModal, setTitle, setDescription } = usePinModalStore();
  const { currentConversationId, lastMessageId } = useNavigationStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit() {
    if (!block) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/pinned`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Untitled",
          description: description || "",
          content_json: [block],
          conversation_id: currentConversationId ?? null,
          message_id: lastMessageId ?? null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to save: ${res.status}`);
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        closeModal();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setSaved(false);
      closeModal();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-[#1A1D27] border border-[#2D313E] text-white max-w-md"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-white text-base font-semibold">
            Save Response
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8892A4] uppercase tracking-wide">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="bg-[#0F1117] border-[#2D313E] text-white placeholder:text-[#8892A4] focus-visible:border-[#00D4FF] focus-visible:ring-[#00D4FF]/20"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8892A4] uppercase tracking-wide">
              Description (optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="bg-[#0F1117] border-[#2D313E] text-white placeholder:text-[#8892A4] focus-visible:border-[#00D4FF] focus-visible:ring-[#00D4FF]/20"
            />
          </div>

          {error && <p className="text-xs text-red-400 px-1">{error}</p>}
        </div>

        <DialogFooter className="border-t border-[#2D313E] pt-4">
          <Button
            variant="outline"
            onClick={closeModal}
            disabled={isSubmitting}
            className="border-[#2D313E] text-[#8892A4] hover:text-white hover:border-[#8892A4] bg-transparent rounded-full"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || saved}
            className="bg-[#00D4FF] text-black hover:bg-[#00D4FF]/90 rounded-full font-medium disabled:opacity-50"
          >
            {saved ? "Saved ✓" : isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
