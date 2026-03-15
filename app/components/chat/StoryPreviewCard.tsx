"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { StorySlide } from "@/app/components/stories/StorySlide";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001";

// Natural render size for the slide inside the miniature
const INNER_W = 960;
const INNER_H = 540;

interface StoryPreviewCardProps {
  storyId: string;
  title: string;
  slideCount: number;
  className?: string;
  noBorder?: boolean;
  hideOpenLink?: boolean;
  /** Slot rendered inside the card (e.g. a delete button overlay) */
  children?: React.ReactNode;
}

export function StoryPreviewCard({ storyId, title, slideCount, className, noBorder, hideOpenLink, children }: StoryPreviewCardProps) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [firstSlide, setFirstSlide] = useState<any | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/stories/${storyId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        let slides = d?.slidesJson;
        if (typeof slides === "string") {
          try { slides = JSON.parse(slides); } catch { slides = []; }
        }
        if (Array.isArray(slides) && slides.length > 0) setFirstSlide(slides[0]);
      })
      .catch(() => {});
  }, [storyId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setScale(w / INNER_W);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className={`rounded-xl bg-surface p-4 flex flex-col gap-3${noBorder ? "" : " border border-border"}${className ? ` ${className}` : " max-w-sm"}${hideOpenLink ? " cursor-pointer" : ""}`}
      onClick={hideOpenLink ? () => router.push(`/stories/${storyId}`) : undefined}
    >
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 text-accent" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Story Created
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        <p className="text-xs text-muted-foreground">
          {slideCount} {slideCount === 1 ? "slide" : "slides"}
        </p>
      </div>

      {/* Miniature first-slide preview */}
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden border border-border bg-[#0F1117]"
        style={{ aspectRatio: "16/9", position: "relative" }}
      >
        {firstSlide ? (
          <div
            style={{
              width: INNER_W,
              height: INNER_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <StorySlide
              slide={firstSlide}
              slideNumber={1}
              totalSlides={slideCount}
              presentationMode={true}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="size-8 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {!hideOpenLink && (
        <Link
          href={`/stories/${storyId}`}
          className="flex items-center gap-1.5 text-sm font-medium text-accent hover:opacity-80 transition-opacity"
        >
          Open Story
          <ArrowUpRight className="size-3.5" />
        </Link>
      )}
      {children}
    </div>
  );
}
