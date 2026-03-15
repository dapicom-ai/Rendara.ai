"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePinModalStore } from "@/app/stores/usePinModalStore";
import { cn } from "@/lib/utils";
import { BACKEND_URL } from "@/app/lib/api";

interface Dashboard {
  id: string;
  title: string;
}

interface PinModalProps {
  onPinSuccess?: () => void;
}

export function PinModal({ onPinSuccess }: PinModalProps) {
  const { isOpen, block, title, closeModal, setTitle } = usePinModalStore();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingDashboard, setIsCreatingDashboard] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const fetchDashboards = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/dashboards`);
        if (response.ok) {
          const data = await response.json();
          setDashboards(data || []);
          if (data.length > 0) {
            setSelectedDashboard(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch dashboards", err);
      }
    };

    fetchDashboards();
    setNote("");
    setNewDashboardName("");
  }, [isOpen]);

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) return;

    try {
      setIsCreatingDashboard(true);
      const response = await fetch(`${BACKEND_URL}/api/dashboards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newDashboardName }),
      });

      if (!response.ok) {
        throw new Error("Failed to create dashboard");
      }

      const newDashboard = await response.json();
      setDashboards([...dashboards, newDashboard]);
      setSelectedDashboard(newDashboard.id);
      setNewDashboardName("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingDashboard(false);
    }
  };

  const handlePin = async () => {
    if (!block || !selectedDashboard || !title.trim()) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/api/dashboards/${selectedDashboard}/pins`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            note: note || undefined,
            content: block,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to pin");
      }

      closeModal();
      onPinSuccess?.();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pin to Dashboard</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Content preview */}
              <div className="rounded-lg bg-surface-hover border border-border h-32 flex items-center justify-center overflow-hidden">
                <p className="text-sm text-muted-foreground">Content preview</p>
              </div>

              {/* Title input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Insight title..."
                  className="bg-surface border-border"
                />
              </div>

              {/* Dashboard selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">
                  Dashboard
                </label>
                <div className="space-y-2">
                  {dashboards.map((dashboard) => (
                    <button
                      key={dashboard.id}
                      onClick={() => setSelectedDashboard(dashboard.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                        selectedDashboard === dashboard.id
                          ? "border-accent bg-surface-hover"
                          : "border-border hover:border-accent/50"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                          selectedDashboard === dashboard.id
                            ? "border-accent bg-accent"
                            : "border-secondary"
                        )}
                      >
                        {selectedDashboard === dashboard.id && (
                          <div className="h-2 w-2 rounded-full bg-background" />
                        )}
                      </div>
                      <span className="text-sm text-primary">
                        {dashboard.title}
                      </span>
                    </button>
                  ))}

                  {/* Create new dashboard inline */}
                  {!isCreatingDashboard ? (
                    <button
                      onClick={() => setIsCreatingDashboard(true)}
                      className="w-full text-left text-sm text-accent hover:text-accent/80 transition-colors py-2"
                    >
                      + Create new dashboard
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={newDashboardName}
                        onChange={(e) => setNewDashboardName(e.target.value)}
                        placeholder="Dashboard name..."
                        className="bg-surface border-border flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCreateDashboard();
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreateDashboard}
                      >
                        Create
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Note input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">
                  Note (optional)
                </label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 200))}
                  placeholder="Add a note about this insight..."
                  maxLength={200}
                  className="bg-surface border-border min-h-20 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {note.length}/200 characters
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePin}
                  disabled={isLoading || !selectedDashboard || !title.trim()}
                  className="flex-1"
                >
                  {isLoading ? "Pinning..." : "Pin to Dashboard"}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
