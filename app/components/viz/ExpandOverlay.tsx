/**
 * ExpandOverlay — fullscreen viewer for charts and diagrams.
 * Includes focus management, Escape key handling, scroll lock, and pin button.
 */

"use client";

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { overlayVariants, panelVariants } from '@/lib/animations';
import { X, Bookmark } from 'lucide-react';
import { VizSpec, KpiVizSpec, isValidVizSpec, isValidKpiSpec } from '@/types/viz';
import { useExpandStore } from '@/stores/expand-store';
import { VizChartBlock } from './VizChartBlock';
import { MermaidBlock } from './MermaidBlock';
import { VizErrorCard } from './VizErrorCard';

export function ExpandOverlay() {
  const { isOpen, blockId, blockType, blockContent, title, close } = useExpandStore();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Focus management on open
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the close button
      setTimeout(() => closeButtonRef.current?.focus(), 100);
      // Scroll lock
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Restore focus and scroll
      previousFocusRef.current?.focus();
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key handler
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    },
    [isOpen, close]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleEscape]);

  if (!isMounted || !isOpen || !blockType || !blockContent || !blockId || !title) {
    return null;
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  function handlePin() {
    // [INFERRED] Pin behavior handled by parent; this just closes after pin
    console.log('Pin from expanded view:', blockId);
  }

  let content;

  if (blockType === 'viz_chart') {
    // blockContent is VizSpec | KpiVizSpec
    if (
      isValidVizSpec(blockContent) ||
      isValidKpiSpec(blockContent as VizSpec & { type: 'kpi' })
    ) {
      content = (
        <VizChartBlock
          spec={blockContent as VizSpec}
          inlineHeight={Math.floor(window.innerHeight * 0.65)}
          showPinButton={true}
          blockId={blockId}
          onPin={handlePin}
        />
      );
    } else {
      content = <VizErrorCard message="Invalid chart data" />;
    }
  } else if (blockType === 'mermaid') {
    // blockContent is string
    content = (
      <MermaidBlock
        definition={blockContent as string}
        blockId={blockId}
        showPinButton={true}
        onPin={handlePin}
        compact={true}
      />
    );
  } else {
    content = <VizErrorCard message="Unknown block type" />;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="overlay"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={handleBackdropClick}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={prefersReducedMotion ? { initial: {}, animate: { transition: {} }, exit: { transition: {} } } : overlayVariants}
        >
          <motion.div
            className="max-w-5xl mx-auto mt-16 bg-surface rounded-2xl p-8 w-full"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={prefersReducedMotion ? { initial: {}, animate: { transition: {} }, exit: { transition: {} } } : panelVariants}
          >
            {/* Header with title and buttons */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-primary">{title}</h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePin}
                  aria-label="Pin to dashboard"
                  className="p-2 rounded-lg bg-surface-hover hover:bg-surface-high text-muted-foreground hover:text-accent transition-colors"
                >
                  <Bookmark className="size-5" />
                </button>
                <button
                  ref={closeButtonRef}
                  onClick={close}
                  aria-label="Close expanded view"
                  className="p-2 rounded-lg bg-surface-hover hover:bg-surface-high text-muted-foreground hover:text-accent transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ height: 'calc(70vh)' }} className="overflow-hidden rounded-xl">
              {content}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
