/**
 * Mermaid.js dark theme configuration.
 * Based on SDD Section 8.3.
 * Initialized once at module level, not per-component.
 */

export const MERMAID_CONFIG = {
  startOnLoad: false, // Manual render control via useEffect
  theme: 'dark',
  themeVariables: {
    primaryColor: '#00D4FF', // accent
    primaryTextColor: '#0F1117', // dark text for readability on bright (cyan) node fills
    primaryBorderColor: '#2A2D3E', // border
    lineColor: '#6B7280', // text-muted
    sectionBkgColor: '#1A1D27', // surface
    altSectionBkgColor: '#0F1117', // background
    gridColor: '#2A2D3E', // border
    secondaryColor: '#1A1D27', // surface
    tertiaryColor: '#0F1117', // background
  },
  securityLevel: 'loose' as const,
};

/**
 * Initialize mermaid once.
 * Call this in a top-level useEffect guard to ensure it only runs once.
 */
export function initializeMermaid(mermaid: any) {
  if (mermaid) {
    mermaid.initialize(MERMAID_CONFIG);
  }
}
