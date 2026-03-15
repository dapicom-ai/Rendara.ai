"use client";

import { useEffect } from "react";

/**
 * Scales `contentRef` to fit inside `containerRef` using CSS transform.
 * Only scales DOWN (max scale = 1.0 — never upscales).
 * Uses ResizeObserver so it reacts to container size changes.
 *
 * @param containerRef  The fixed-size outer element (the box to fit within)
 * @param contentRef    The inner element whose rendered size may exceed the container
 * @param enabled       Pass false to skip (e.g. for non-compact/inline mode)
 */
export function useFitScale(
  containerRef: React.RefObject<HTMLElement | null>,
  contentRef: React.RefObject<HTMLElement | null>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    function applyScale() {
      const c = containerRef.current;
      const el = contentRef.current;
      if (!c || !el) return;

      // Reset transform so we measure natural size
      el.style.transform = "none";
      el.style.transformOrigin = "top left";

      const cW = c.clientWidth;
      const cH = c.clientHeight;
      // Use scrollWidth/scrollHeight for natural (unscaled) content size
      const elW = el.scrollWidth;
      const elH = el.scrollHeight;

      if (elW <= 0 || elH <= 0 || cW <= 0 || cH <= 0) return;

      const scale = Math.min(cW / elW, cH / elH, 1);
      el.style.transform = scale < 1 ? `scale(${scale})` : "none";
    }

    applyScale();

    const ro = new ResizeObserver(applyScale);
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, contentRef, enabled]);
}
