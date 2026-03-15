"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { StorySlide } from "./StorySlide";
import { cn } from "@/lib/utils";

interface SlideSpec {
  id?: string;
  title: string;
  content: string;
  notes?: string;
}

interface StoryViewerProps {
  slides: SlideSpec[];
  autoAdvanceInterval?: number | null;
  className?: string;
}

export function StoryViewer({ slides, autoAdvanceInterval, className }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSlides = slides.length;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalSlides - 1;

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const enterPresentation = useCallback(() => {
    setIsPresentationMode(true);
    containerRef.current?.requestFullscreen().catch(() => {});
  }, []);

  const exitPresentation = useCallback(() => {
    setIsPresentationMode(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Sync: if browser exits fullscreen (ESC), also exit presentation mode
  useEffect(() => {
    function handleFSChange() {
      if (!document.fullscreenElement) {
        setIsPresentationMode(false);
      }
    }
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      if (e.key === "Escape" && isPresentationMode) exitPresentation();
      if (e.key === "F5") {
        e.preventDefault();
        if (isPresentationMode) exitPresentation();
        else enterPresentation();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, isPresentationMode, enterPresentation, exitPresentation]);

  // Auto-advance
  useEffect(() => {
    if (!autoAdvanceInterval || autoAdvanceInterval <= 0) {
      setCountdown(null);
      return;
    }
    setCountdown(autoAdvanceInterval);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c !== null && c > 1 ? c - 1 : autoAdvanceInterval));
    }, 1000);
    timerRef.current = setInterval(() => {
      setCurrentIndex((i) => {
        if (i < totalSlides - 1) return i + 1;
        return 0;
      });
      setCountdown(autoAdvanceInterval);
    }, autoAdvanceInterval * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoAdvanceInterval, totalSlides]);

  if (totalSlides === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No slides in this story.
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  if (isPresentationMode) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 bg-[#0F1117] flex flex-col items-center justify-center"
      >
        {/* Slide fills full width — aspect-ratio keeps it 16:9 */}
        <div className="w-full">
          <StorySlide
            slide={currentSlide}
            slideNumber={currentIndex + 1}
            totalSlides={totalSlides}
            presentationMode={true}
          />
        </div>

        {/* Floating controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="size-5 text-white" />
          </button>
          <span className="text-sm text-white/60">
            {currentIndex + 1} / {totalSlides}
          </span>
          {countdown !== null && (
            <span className="text-sm text-[#00D4FF]">{countdown}s</span>
          )}
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="size-5 text-white" />
          </button>
          <button
            onClick={exitPresentation}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors ml-4"
            aria-label="Exit presentation"
          >
            <Minimize2 className="size-5 text-white" />
          </button>
        </div>

        {/* Auto-advance progress bar */}
        {autoAdvanceInterval && countdown !== null && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div
              className="h-full bg-[#00D4FF] transition-all duration-1000"
              style={{
                width: `${((autoAdvanceInterval - countdown) / autoAdvanceInterval) * 100}%`,
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <StorySlide
        slide={currentSlide}
        slideNumber={currentIndex + 1}
        totalSlides={totalSlides}
        presentationMode={false}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="p-2 rounded-lg hover:bg-surface disabled:opacity-30 transition-colors border border-border"
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-4 text-muted-foreground" />
          </button>
          <span className="text-sm text-muted-foreground px-2">
            {currentIndex + 1} / {totalSlides}
          </span>
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="p-2 rounded-lg hover:bg-surface disabled:opacity-30 transition-colors border border-border"
            aria-label="Next slide"
          >
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
          {countdown !== null && (
            <span className="text-xs text-accent ml-2">Auto: {countdown}s</span>
          )}
        </div>
        <button
          onClick={enterPresentation}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-black text-sm font-medium hover:opacity-90 transition-opacity"
          aria-label="Enter presentation mode"
        >
          <Maximize2 className="size-3.5" />
          Present
        </button>
      </div>
    </div>
  );
}
