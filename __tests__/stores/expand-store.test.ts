/**
 * Suite 6: Zustand Store Tests.
 *
 * Tests the expand-store Zustand store.
 *
 * SDD Section 4.1 — Frontend Component Responsibilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useExpandStore } from '@/stores/expand-store';

describe('useExpandStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useExpandStore.setState({
      isOpen: false,
      blockId: null,
      blockType: null,
      blockContent: null,
      title: null,
    });
  });

  it('initial state is closed', () => {
    const state = useExpandStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.blockId).toBeNull();
    expect(state.blockType).toBeNull();
    expect(state.blockContent).toBeNull();
    expect(state.title).toBeNull();
  });

  it('open() sets isOpen to true with correct values', () => {
    const store = useExpandStore.getState();
    const spec = {
      type: 'bar' as const,
      title: 'Revenue Chart',
      data: [{ region: 'AMER', value: 1000 }],
      xKey: 'region',
      yKey: 'value',
    };

    store.open('block-123', 'viz_chart', spec, 'Revenue Chart');

    const state = useExpandStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.blockId).toBe('block-123');
    expect(state.blockType).toBe('viz_chart');
    expect(state.blockContent).toEqual(spec);
    expect(state.title).toBe('Revenue Chart');
  });

  it('close() resets state to initial values', () => {
    const store = useExpandStore.getState();
    const spec = {
      type: 'bar' as const,
      title: 'Chart',
      data: [{ x: 1, y: 2 }],
      xKey: 'x',
      yKey: 'y',
    };

    store.open('block-123', 'viz_chart', spec, 'Chart');
    store.close();

    const state = useExpandStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.blockId).toBeNull();
    expect(state.blockType).toBeNull();
    expect(state.blockContent).toBeNull();
    expect(state.title).toBeNull();
  });

  it('open() does nothing with empty mermaid string content', () => {
    // Guard: null/empty content should not open
    const store = useExpandStore.getState();
    store.open('block-123', 'mermaid', '   ', 'Empty Mermaid');

    const state = useExpandStore.getState();
    expect(state.isOpen).toBe(false);
  });

  it('open() works with mermaid string content', () => {
    const store = useExpandStore.getState();
    const definition = 'flowchart TD\n  A --> B';
    store.open('mmd-01', 'mermaid', definition, 'Flow Diagram');

    const state = useExpandStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.blockType).toBe('mermaid');
    expect(state.blockContent).toBe(definition);
  });

  it('blockType accepts viz_chart and mermaid', () => {
    const store = useExpandStore.getState();
    const vizSpec = {
      type: 'line' as const,
      title: 'Trend',
      data: [{ month: 'Jan', value: 100 }],
      xKey: 'month',
      yKey: 'value',
    };

    store.open('blk-1', 'viz_chart', vizSpec, 'Trend Chart');
    expect(useExpandStore.getState().blockType).toBe('viz_chart');

    store.open('blk-2', 'mermaid', 'graph TD\n  A --> B', 'Flow');
    expect(useExpandStore.getState().blockType).toBe('mermaid');
  });
});
