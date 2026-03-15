"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Trash2, X, ChevronLeft } from "lucide-react";
import { BACKEND_URL } from "@/app/lib/api";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { MarkdownRenderer } from "@/app/components/ui/MarkdownRenderer";
import { VizChartBlock } from "@/app/components/viz";
import { MermaidBlock } from "@/app/components/viz";

interface PinnedItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

interface PinnedFull extends PinnedItem {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentJson: any[];
}

function formatDate(iso: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Render the saved content_json blocks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PinnedContent({ contentJson }: { contentJson: any[] }) {
  if (!contentJson || contentJson.length === 0) {
    return <p className="text-sm text-muted-foreground">No content saved.</p>;
  }

  // content_json is [{ type: "message", data: { content: [...parts] } }]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [];
  for (const block of contentJson) {
    if (block?.type === "message" && Array.isArray(block?.data?.content)) {
      parts.push(...block.data.content);
    }
  }

  if (parts.length === 0) {
    return <p className="text-sm text-muted-foreground">No content saved.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {parts.map((part, i) => {
        if (part?.type === "text" && part.text) {
          return <MarkdownRenderer key={i} content={part.text} />;
        }
        if (part?.type === "tool-call" && part.toolName === "viz_block" && part.result) {
          return (
            <VizChartBlock
              key={i}
              spec={part.result}
              status="complete"
              readOnly={true}
              showPinButton={false}
            />
          );
        }
        if (part?.type === "tool-call" && part.toolName === "mermaid_block" && part.result) {
          return (
            <MermaidBlock
              key={i}
              definition={part.result}
              status="complete"
              readOnly={true}
              showPinButton={false}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

export default function PinnedPage() {
  const router = useRouter();
  const [items, setItems] = useState<PinnedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<PinnedFull | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/pinned`);
        if (res.ok) {
          const data = await res.json();
          setItems(data as PinnedItem[]);
        }
      } catch (err) {
        console.error("Failed to load pinned responses:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  async function handleOpen(id: string) {
    setLoadingId(id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/pinned/${id}`);
      if (res.ok) {
        setExpanded(await res.json() as PinnedFull);
      }
    } catch (err) {
      console.error("Failed to load pinned item:", err);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`${BACKEND_URL}/api/pinned/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (expanded?.id === id) setExpanded(null);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-8 py-6">
        <button
          onClick={() => router.push("/")}
          className="rounded-lg p-1.5 hover:bg-surface transition-colors text-muted-foreground hover:text-primary"
          aria-label="Back to chat"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Bookmark className="h-5 w-5 text-accent" />
        <h1 className="text-xl font-semibold text-primary">Pinned Responses</h1>
      </div>

      <div className="flex-1 overflow-auto px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-surface/30 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState variant="pinned" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpen(item.id)}
                className="group relative flex flex-col gap-2 rounded-xl bg-surface border border-border p-5 hover:border-accent/40 transition-colors cursor-pointer"
              >
                {loadingId === item.id && (
                  <div className="absolute inset-0 rounded-xl bg-surface/60 flex items-center justify-center">
                    <div className="size-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-primary line-clamp-2 flex-1">
                    {item.title}
                  </h3>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    aria-label="Delete pinned response"
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-high text-muted-foreground hover:text-red-400 transition-all flex-shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {item.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-auto pt-2">
                  {formatDate(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expand overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setExpanded(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl bg-[#1A1D27] border border-border flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <h2 className="text-base font-semibold text-primary truncate">{expanded.title}</h2>
                {expanded.description && (
                  <p className="text-xs text-muted-foreground">{expanded.description}</p>
                )}
                <p className="text-xs text-muted-foreground">{formatDate(expanded.createdAt)}</p>
              </div>
              <button
                onClick={() => setExpanded(null)}
                className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <PinnedContent contentJson={expanded.contentJson} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
