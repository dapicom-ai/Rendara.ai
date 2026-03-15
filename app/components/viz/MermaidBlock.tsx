/**
 * MermaidBlock — renders Mermaid.js diagrams inline.
 * Includes error fallback with raw code display.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { blockVariants } from '@/lib/animations';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ArrowUpRight, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MERMAID_CONFIG, initializeMermaid } from '@/lib/mermaid-theme';
import { VizSkeleton } from './VizSkeleton';
import { useExpandStore } from '@/stores/expand-store';

interface MermaidBlockProps {
  definition: string;
  blockId?: string;
  status?: 'running' | 'complete' | 'incomplete';
  showPinButton?: boolean; // default true
  readOnly?: boolean;
  className?: string;
  allowExpand?: boolean;
  compact?: boolean;
  onPin?: (blockId: string, blockType: string, blockContent: string) => void;
}

let mermaidInitialized = false;

export function MermaidBlock({
  definition,
  blockId,
  status = 'complete',
  showPinButton = true,
  readOnly = false,
  className,
  allowExpand,
  compact,
  onPin,
}: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const expandStore = useExpandStore();
  const prefersReducedMotion = useReducedMotion();

  // Initialize mermaid once at module level
  useEffect(() => {
    if (!mermaidInitialized && typeof window !== 'undefined') {
      const loadMermaid = async () => {
        try {
          const mermaid = await import('mermaid');
          initializeMermaid(mermaid.default);
          mermaidInitialized = true;
        } catch (err) {
          console.error('Failed to load mermaid:', err);
        }
      };
      loadMermaid();
    }
  }, []);

  // Render mermaid diagram
  useEffect(() => {
    if (!svgRef.current || !definition.trim() || status === 'running' || error) {
      return;
    }

    const renderDiagram = async () => {
      try {
        const mermaid = await import('mermaid');
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.default.render(id, definition);
        if (svgRef.current) {
          svgRef.current.innerHTML = svg;
          const svgEl = svgRef.current.querySelector('svg');
          if (svgEl) {
            // Always remove mermaid's hardcoded pixel dimensions — keep viewBox
            svgEl.removeAttribute('height');
            svgEl.removeAttribute('width');
            svgEl.style.display = 'block';
            if (compact) {
              // In dashboard tiles: fill container in both axes.
              // SVG viewBox + preserveAspectRatio="xMidYMid meet" (default)
              // handles aspect-ratio-correct scaling natively.
              svgEl.style.width = '100%';
              svgEl.style.height = '100%';
            } else {
              // In inline chat: grow to full width, let height be natural.
              svgEl.style.width = '100%';
              svgEl.style.height = 'auto';
              svgEl.style.maxWidth = '100%';
            }
          }
        }
        setError(null);
      } catch (err) {
        console.warn('Mermaid render error (diagram hidden):', err);
        setError('parse-error');
      }
    };

    renderDiagram();
  }, [definition, status, compact]);

  if (status === 'running') {
    return <VizSkeleton height={200} className={className} />;
  }

  function handleExpand() {
    if (blockId) {
      expandStore.open(blockId, 'mermaid', definition, 'Diagram');
    }
  }

  function handlePin() {
    if (onPin && blockId) {
      onPin(blockId, 'mermaid', definition);
    }
  }

  const variants = prefersReducedMotion
    ? {
        initial: {},
        animate: { transition: {} },
      }
    : blockVariants;

  return (
    <motion.div
      className={cn(compact ? 'h-full w-full' : 'flex flex-col gap-2', className)}
      initial="initial"
      animate="animate"
      variants={variants}
    >
      {/* Container */}
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden w-full',
          compact
            ? 'h-full'                                      // tile: fill available space, no extra card chrome
            : 'rounded-xl bg-surface p-3'                  // inline: card with padding
        )}
      >
        {error ? null : (
          // Diagram SVG wrapper
          <div
            ref={svgRef}
            className={cn('w-full', compact && 'h-full')}
          />
        )}

        {/* Expand button (top-right) */}
        {(!readOnly || allowExpand) && (
          <button
            onClick={handleExpand}
            aria-label="Expand diagram"
            className="absolute top-3 right-12 p-1.5 rounded-lg bg-surface-hover/50 hover:bg-surface-hover text-muted-foreground hover:text-accent transition-colors"
          >
            <ArrowUpRight className="size-4" />
          </button>
        )}

        {/* Pin button (bottom-right) */}
        {!readOnly && showPinButton && (
          <button
            onClick={handlePin}
            aria-label="Pin to dashboard"
            className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-surface-hover/50 hover:bg-surface-hover text-muted-foreground hover:text-accent transition-colors"
          >
            <Bookmark className="size-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
