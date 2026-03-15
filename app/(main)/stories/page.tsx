"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Trash2, ChevronLeft } from "lucide-react";
import { StoryPreviewCard } from "@/app/components/chat/StoryPreviewCard";
import { BACKEND_URL } from "@/app/lib/api";

interface StoryCard {
  id: string;
  title: string;
  slideCount: number;
  updatedAt: string;
}

export default function StoriesPage() {
  const router = useRouter();
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/stories`);
        if (res.ok) setStories(await res.json());
      } catch { /* silent */ }
      finally { setIsLoading(false); }
    }
    load();
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`${BACKEND_URL}/api/stories/${id}`, { method: "DELETE" });
      setStories((prev) => prev.filter((s) => s.id !== id));
    } catch { /* silent */ }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-border px-8 py-6">
        <button
          onClick={() => router.push("/")}
          className="rounded-lg p-1.5 hover:bg-surface transition-colors text-muted-foreground hover:text-primary"
          aria-label="Back to chat"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <BookOpen className="h-5 w-5 text-accent" />
        <h1 className="text-xl font-semibold text-primary">Stories</h1>
      </div>

      <div className="flex-1 overflow-auto px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl bg-surface/30 animate-pulse" style={{ aspectRatio: "3/2" }} />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <BookOpen className="size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No stories yet</p>
            <p className="text-xs text-muted-foreground">Ask the agent in chat to create a story.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <div key={story.id} className="group relative">
                <StoryPreviewCard
                  storyId={story.id}
                  title={story.title}
                  slideCount={story.slideCount}
                  className="w-full"
                  noBorder
                  hideOpenLink
                />
                <button
                  onClick={(e) => handleDelete(story.id, e)}
                  aria-label="Delete story"
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-surface hover:bg-surface-high text-muted-foreground hover:text-red-400 transition-all"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
