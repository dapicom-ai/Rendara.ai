/**
 * Recharts theme configuration and color palette.
 * Based on SDD Section 8.1 and Rendara design system.
 * All hex values match design tokens in app/globals.css.
 */

export const CHART_COLORS = [
  '#00D4FF', // 0: accent cyan (primary series)
  '#7C3AED', // 1: violet
  '#10B981', // 2: emerald
  '#F59E0B', // 3: amber
  '#EF4444', // 4: red
  '#EC4899', // 5: pink
  '#6366F1', // 6: indigo
  '#14B8A6', // 7: teal
] as const;

export const MUTED_OPACITY = 0.25;
export const HIGHLIGHT_STROKE_WIDTH = 3;
export const REFERENCE_LINE_COLOR = '#9CA3AF';

export const CHART_THEME = {
  background: 'transparent',
  axis: {
    stroke: '#6B7280', // text-muted
    fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  grid: {
    stroke: '#2A2D3E', // border token (low contrast)
    strokeDasharray: '3 3',
  },
  tooltip: {
    background: '#1A1D27', // surface
    border: '#2A2D3E', // border
    text: '#E8EAED', // text-primary
  },
  title: {
    color: '#9AA0B0', // text-secondary (slightly lighter than muted)
    fontSize: 14,
    fontWeight: 500,
  },
} as const;
