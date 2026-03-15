"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoryViewer } from "@/app/components/stories/StoryViewer";
import { AgentChatPanel } from "@/app/components/layout/AgentChatPanel";
import { BACKEND_URL } from "@/app/lib/api";

interface SlideSpec {
  id?: string;
  title: string;
  content: string;
  notes?: string;
}

interface Story {
  id: string;
  title: string;
  slidesJson: SlideSpec[];
  autoAdvanceInterval: number | null;
  slideCount: number;
}

export default function StoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const storyId = params?.id as string;
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!storyId) return;
    async function fetchStory() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/stories/${storyId}`);
        if (!res.ok) throw new Error("Story not found");
        setStory(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }
    fetchStory();
  }, [storyId, refreshKey]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-20 border-b border-border animate-pulse bg-surface/20" />
        <div className="flex-1 p-8">
          <div className="w-full aspect-[16/9] rounded-xl bg-surface/30 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">{error ?? "Story not found"}</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border pl-6 pr-14 py-4 flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-surface transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-primary flex-1">{story.title}</h1>
          <span className="text-xs text-muted-foreground rounded-full bg-surface border border-border px-3 py-1">
            {story.slideCount} {story.slideCount === 1 ? "slide" : "slides"}
          </span>
        </div>
        <div className="flex-1 overflow-auto p-8">
          <StoryViewer
            slides={story.slidesJson}
            autoAdvanceInterval={story.autoAdvanceInterval}
          />
        </div>
      </div>
      <AgentChatPanel
        resourceId={`story:${storyId}`}
        onResourceUpdated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
