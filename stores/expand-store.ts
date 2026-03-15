/**
 * Zustand store for ExpandOverlay state management.
 * Provides open/close methods and tracks which block is being expanded.
 */

import { create } from 'zustand';
import { VizSpec, KpiVizSpec } from '@/types/viz';

export interface ExpandState {
  isOpen: boolean;
  blockId: string | null;
  blockType: 'viz_chart' | 'mermaid' | null;
  blockContent: VizSpec | KpiVizSpec | string | null;
  title: string | null;

  /**
   * Open the expand overlay.
   * blockContent is either a VizSpec, KpiVizSpec (for charts) or string (for mermaid).
   */
  open: (
    blockId: string,
    blockType: 'viz_chart' | 'mermaid',
    blockContent: VizSpec | KpiVizSpec | string,
    title: string
  ) => void;

  /**
   * Close the expand overlay and clear state.
   */
  close: () => void;
}

export const useExpandStore = create<ExpandState>((set) => ({
  isOpen: false,
  blockId: null,
  blockType: null,
  blockContent: null,
  title: null,

  open: (blockId, blockType, blockContent, title) => {
    // Guard against null/empty content
    if (!blockContent || (typeof blockContent === 'string' && !blockContent.trim())) {
      return;
    }
    set({ isOpen: true, blockId, blockType, blockContent, title });
  },

  close: () => {
    set({ isOpen: false, blockId: null, blockType: null, blockContent: null, title: null });
  },
}));
