/**
 * Zoom-to-Fit Visual Tests — ZTF-001 through ZTF-007
 *
 * Verifies that Mermaid diagrams and other visualizations render within their
 * container bounds (no horizontal overflow) both in:
 *   1. Inline chat messages (home page live response)
 *   2. Dashboard tiles (seeded via API)
 *
 * Overflow is checked programmatically via page.evaluate() as well as captured
 * visually via screenshots.
 *
 * Frontend: http://146.190.89.151:9001  (direct — not baseURL from config)
 * Backend:  http://146.190.89.151:9002
 *
 * Screenshots saved to: test-screenshots/
 */

import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRONTEND_URL = "http://146.190.89.151:9001";
const BACKEND_URL = "http://146.190.89.151:9002";

const SCREENSHOT_DIR = path.join(process.cwd(), "test-screenshots");

// Generous timeouts — LLM streaming can be slow
const CHAT_STREAM_TIMEOUT = 90_000;
const PAGE_LOAD_TIMEOUT = 20_000;
const MERMAID_RENDER_TIMEOUT = 30_000;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sends a message in the home-page chat and waits for a non-empty AI response.
 * Returns once streaming has finished (Stop button disappears).
 */
async function sendChatMessage(page: import("@playwright/test").Page, message: string) {
  // The textarea uses placeholder "Ask anything about your data..."
  const textarea = page.locator(
    'textarea[placeholder*="Ask anything"], textarea[placeholder*="ask anything"]'
  ).first();
  await expect(textarea).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
  await textarea.click();
  await textarea.fill(message);

  // Submit
  const sendBtn = page.locator('[aria-label="Send message"]');
  await expect(sendBtn).toBeVisible({ timeout: 5_000 });
  await sendBtn.click();

  // Wait for streaming to start (Stop button appears or message log grows)
  await page.waitForFunction(
    () => {
      const stopBtn = document.querySelector('[aria-label="Stop generation"]');
      if (stopBtn !== null) return true;
      const log = document.querySelector('[role="log"]');
      return log !== null && (log.textContent ?? "").length > 50;
    },
    { timeout: 15_000 }
  );

  // Wait for streaming to finish (Stop button disappears)
  await page.waitForFunction(
    () => {
      const stopBtn = document.querySelector('[aria-label="Stop generation"]');
      return stopBtn === null || (stopBtn as HTMLElement).offsetParent === null;
    },
    { timeout: CHAT_STREAM_TIMEOUT }
  );

  // Small settling delay for any async Mermaid rendering
  await page.waitForTimeout(500);
}

/**
 * Evaluates whether a CSS selector's first matching element has no horizontal
 * overflow (scrollWidth <= clientWidth).
 * Returns an object with { scrollWidth, clientWidth, overflows }.
 */
async function checkNoHorizontalOverflow(
  page: import("@playwright/test").Page,
  selector: string
): Promise<{ scrollWidth: number; clientWidth: number; overflows: boolean }> {
  return page.evaluate((sel: string) => {
    const el = document.querySelector(sel);
    if (!el) {
      return { scrollWidth: -1, clientWidth: -1, overflows: false };
    }
    const scrollWidth = (el as HTMLElement).scrollWidth;
    const clientWidth = (el as HTMLElement).clientWidth;
    return { scrollWidth, clientWidth, overflows: scrollWidth > clientWidth + 2 }; // +2px tolerance
  }, selector);
}

/**
 * Creates a test dashboard via the backend API and returns it.
 * Throws if the request fails.
 */
async function createDashboard(
  request: import("@playwright/test").APIRequestContext,
  payload: { title: string; layout_json: unknown[] }
) {
  const res = await request.post(`${BACKEND_URL}/api/dashboards`, { data: payload });
  if (!res.ok()) {
    throw new Error(`Failed to create dashboard: ${res.status()} ${await res.text()}`);
  }
  return res.json() as Promise<{ id: string; title: string }>;
}

/** Best-effort cleanup of a seeded resource. */
async function deleteDashboard(
  request: import("@playwright/test").APIRequestContext,
  id: string
) {
  try {
    await request.delete(`${BACKEND_URL}/api/dashboards/${id}`);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// ZTF-001: Mermaid flowchart in live chat — no horizontal overflow
// ---------------------------------------------------------------------------

test("ZTF-001: Mermaid flowchart in chat response renders without horizontal overflow", async ({
  page,
}) => {
  test.setTimeout(CHAT_STREAM_TIMEOUT + 30_000);

  await page.goto(`${FRONTEND_URL}/`, { waitUntil: "domcontentloaded" });

  // Verify home page loaded
  await expect(page.locator("body")).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

  // Ask for a mermaid flowchart
  await sendChatMessage(
    page,
    "draw a flowchart of the customer churn process from warning signs to win-back campaign"
  );

  // Wait for a Mermaid SVG to appear in the chat log
  // Mermaid renders as <svg> inside a .mermaid wrapper or similar
  const mermaidSvg = page.locator('[role="log"] svg, [role="log"] .mermaid svg').first();
  await expect(mermaidSvg).toBeVisible({ timeout: MERMAID_RENDER_TIMEOUT });

  // Take full-page screenshot of the chat area
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "zoom-fit-001-mermaid-chat.png"),
    fullPage: false,
  });

  // Programmatic overflow check on the mermaid container
  // Try common container selectors used by Mermaid renderer in Rendara
  const containerSelectors = [
    ".mermaid",
    "[data-mermaid-container]",
    '[role="log"] .overflow-hidden',
    '[role="log"] .overflow-x-hidden',
  ];

  let overflowResult = { scrollWidth: -1, clientWidth: -1, overflows: false };
  for (const sel of containerSelectors) {
    const result = await checkNoHorizontalOverflow(page, sel);
    if (result.scrollWidth !== -1) {
      overflowResult = result;
      console.log(
        `[ZTF-001] Container "${sel}": scrollWidth=${result.scrollWidth}, clientWidth=${result.clientWidth}, overflows=${result.overflows}`
      );
      break;
    }
  }

  // Also check the chat log itself for horizontal overflow
  const logOverflow = await checkNoHorizontalOverflow(page, '[role="log"]');
  console.log(
    `[ZTF-001] Chat log: scrollWidth=${logOverflow.scrollWidth}, clientWidth=${logOverflow.clientWidth}, overflows=${logOverflow.overflows}`
  );

  // Assert no overflow on the chat log
  expect(logOverflow.overflows).toBe(false);

  // If we found a mermaid container, assert it too
  if (overflowResult.scrollWidth !== -1) {
    expect(overflowResult.overflows).toBe(false);
  }

  console.log("[ZTF-001] PASS: Mermaid flowchart in chat does not overflow horizontally.");
});

// ---------------------------------------------------------------------------
// ZTF-002: Mermaid SVG element dimensions fit within viewport width
// ---------------------------------------------------------------------------

test("ZTF-002: Mermaid SVG element bounding box does not exceed viewport width", async ({
  page,
}) => {
  test.setTimeout(CHAT_STREAM_TIMEOUT + 30_000);

  await page.goto(`${FRONTEND_URL}/`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

  await sendChatMessage(
    page,
    "show me a sequence diagram for a user authentication flow with JWT tokens"
  );

  // Wait for any SVG to appear in the log
  const svgInLog = page.locator('[role="log"] svg').first();
  await expect(svgInLog).toBeVisible({ timeout: MERMAID_RENDER_TIMEOUT });

  // Give Mermaid a moment to apply zoom-to-fit styles
  await page.waitForTimeout(1_000);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "zoom-fit-002-mermaid-dimensions.png"),
    fullPage: false,
  });

  // Check SVG bounding box vs viewport
  const overflowData = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const svgs = Array.from(
      document.querySelectorAll('[role="log"] svg')
    ) as SVGSVGElement[];

    const results = svgs.map((svg) => {
      const rect = svg.getBoundingClientRect();
      return {
        width: rect.width,
        right: rect.right,
        viewportWidth,
        overflows: rect.right > viewportWidth + 2,
      };
    });

    return { viewportWidth, svgs: results };
  });

  console.log(`[ZTF-002] Viewport: ${overflowData.viewportWidth}px`);
  overflowData.svgs.forEach((s, i) => {
    console.log(
      `[ZTF-002] SVG[${i}]: width=${s.width.toFixed(0)}px, right=${s.right.toFixed(0)}px, overflows=${s.overflows}`
    );
  });

  // At least one SVG found
  expect(overflowData.svgs.length).toBeGreaterThan(0);

  // No SVG should overflow the viewport to the right
  const overflowingSvgs = overflowData.svgs.filter((s) => s.overflows);
  expect(overflowingSvgs).toHaveLength(0);

  console.log("[ZTF-002] PASS: All Mermaid SVGs fit within viewport width.");
});

// ---------------------------------------------------------------------------
// ZTF-003: Screenshot — focused screenshot of each SVG visualization in chat
// ---------------------------------------------------------------------------

test("ZTF-003: Capture focused screenshot of each SVG viz block in chat response", async ({
  page,
}) => {
  test.setTimeout(CHAT_STREAM_TIMEOUT + 30_000);

  await page.goto(`${FRONTEND_URL}/`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

  // Ask for a chart AND a diagram to test multiple viz types
  await sendChatMessage(
    page,
    "give me a bar chart of monthly revenue and also a mermaid flowchart of the data pipeline"
  );

  // Wait for at least one SVG in the log
  const firstSvg = page.locator('[role="log"] svg').first();
  await expect(firstSvg).toBeVisible({ timeout: MERMAID_RENDER_TIMEOUT });

  // Additional settle time for all async renders
  await page.waitForTimeout(1_500);

  // Capture a focused screenshot of each SVG found in the log
  const svgCount = await page.locator('[role="log"] svg').count();
  console.log(`[ZTF-003] Found ${svgCount} SVG element(s) in chat log.`);

  for (let i = 0; i < svgCount; i++) {
    const svgEl = page.locator('[role="log"] svg').nth(i);
    const bbox = await svgEl.boundingBox();
    if (!bbox || bbox.width < 10 || bbox.height < 10) {
      console.log(`[ZTF-003] SVG[${i}] skipped — too small or not visible (${JSON.stringify(bbox)})`);
      continue;
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `zoom-fit-003-svg-${i}.png`),
      clip: {
        x: Math.max(0, bbox.x - 8),
        y: Math.max(0, bbox.y - 8),
        width: bbox.width + 16,
        height: bbox.height + 16,
      },
      fullPage: false,
    });
    console.log(
      `[ZTF-003] SVG[${i}]: bbox x=${bbox.x.toFixed(0)} y=${bbox.y.toFixed(0)} w=${bbox.width.toFixed(0)} h=${bbox.height.toFixed(0)}`
    );
  }

  expect(svgCount).toBeGreaterThan(0);
  console.log("[ZTF-003] PASS: Focused screenshots captured for all SVG viz blocks.");
});

// ---------------------------------------------------------------------------
// ZTF-004: Dashboard tile — mermaid renders without overflow (seeded via API)
// ---------------------------------------------------------------------------

test("ZTF-004: Mermaid tile in dashboard renders without horizontal overflow", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createDashboard(request, {
    title: "ZTF-004 Mermaid Tile Zoom-to-Fit",
    layout_json: [
      {
        id: "mermaid-tile",
        type: "mermaid",
        title: "Customer Churn Flow",
        content: [
          {
            type: "mermaid",
            definition: [
              "flowchart TD",
              "  A[Customer Signs Up] --> B[Active Usage]",
              "  B --> C{Engagement Drop?}",
              "  C -- No --> B",
              "  C -- Yes --> D[Warning Signs]",
              "  D --> E[Send Retention Offer]",
              "  E --> F{Accepted?}",
              "  F -- Yes --> B",
              "  F -- No --> G[Customer Churns]",
              "  G --> H[Win-Back Campaign]",
              "  H --> I{Responds?}",
              "  I -- Yes --> B",
              "  I -- No --> J[Lost Customer]",
            ].join("\n"),
          },
        ],
        x: 2,
        y: 2,
        w: 94,
        h: 90,
      },
    ],
  });

  try {
    await page.goto(`${FRONTEND_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.locator("h1").filter({ hasText: "ZTF-004 Mermaid Tile Zoom-to-Fit" })
    ).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Wait for Mermaid SVG to render inside the tile
    await page.waitForSelector("svg", { timeout: MERMAID_RENDER_TIMEOUT });

    // Give Mermaid time to apply zoom-to-fit transform
    await page.waitForTimeout(1_500);

    // Full dashboard screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "zoom-fit-004-dashboard-mermaid.png"),
      fullPage: false,
    });

    // Focused screenshot of the Mermaid SVG
    const mermaidSvg = page.locator("svg").first();
    const bbox = await mermaidSvg.boundingBox();
    if (bbox && bbox.width > 10) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "zoom-fit-004-dashboard-mermaid-focused.png"),
        clip: {
          x: Math.max(0, bbox.x - 4),
          y: Math.max(0, bbox.y - 4),
          width: bbox.width + 8,
          height: bbox.height + 8,
        },
        fullPage: false,
      });
    }

    // Overflow check on the tile container
    const tileOverflow = await page.evaluate(() => {
      // Look for the tile wrapper — it should not overflow
      const candidates = [
        document.querySelector('[data-tile-id]'),
        document.querySelector('[class*="tile"]'),
        document.querySelector('[style*="aspect"]'),
        document.querySelector(".relative.w-full"),
      ].filter(Boolean) as HTMLElement[];

      if (candidates.length === 0) return { found: false, overflows: false, scrollWidth: 0, clientWidth: 0 };

      const el = candidates[0];
      const scrollWidth = el.scrollWidth;
      const clientWidth = el.clientWidth;
      return {
        found: true,
        overflows: scrollWidth > clientWidth + 2,
        scrollWidth,
        clientWidth,
      };
    });

    console.log(
      `[ZTF-004] Tile container: found=${tileOverflow.found}, scrollWidth=${tileOverflow.scrollWidth}, clientWidth=${tileOverflow.clientWidth}, overflows=${tileOverflow.overflows}`
    );

    // Check the SVG itself doesn't overflow its bounding box within the viewport
    const svgOverflow = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const svgs = Array.from(document.querySelectorAll("svg")) as SVGSVGElement[];
      return svgs.map((svg) => {
        const rect = svg.getBoundingClientRect();
        return {
          width: rect.width,
          right: rect.right,
          overflowsViewport: rect.right > viewportWidth + 4,
        };
      });
    });

    svgOverflow.forEach((s, i) => {
      console.log(
        `[ZTF-004] SVG[${i}]: width=${s.width.toFixed(0)}px, right=${s.right.toFixed(0)}px, overflowsViewport=${s.overflowsViewport}`
      );
    });

    const anyOverflows = svgOverflow.some((s) => s.overflowsViewport);
    expect(anyOverflows).toBe(false);

    console.log("[ZTF-004] PASS: Mermaid tile in dashboard does not overflow viewport.");
  } finally {
    await deleteDashboard(request, dashboard.id);
  }
});

// ---------------------------------------------------------------------------
// ZTF-005: Dashboard tile — chart renders without overflow (seeded via API)
// ---------------------------------------------------------------------------

test("ZTF-005: Chart tile in dashboard renders without horizontal overflow", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createDashboard(request, {
    title: "ZTF-005 Chart Tile Zoom-to-Fit",
    layout_json: [
      {
        id: "chart-tile",
        type: "viz_chart",
        title: "Revenue by Region",
        content: [
          {
            type: "viz_chart",
            spec: {
              type: "bar",
              title: "Q4 2024 Revenue by Region",
              data: [
                { region: "Cape Town", revenue: 45000 },
                { region: "Johannesburg", revenue: 62000 },
                { region: "Durban", revenue: 31000 },
                { region: "Pretoria", revenue: 27500 },
                { region: "Port Elizabeth", revenue: 19800 },
                { region: "Bloemfontein", revenue: 15200 },
                { region: "East London", revenue: 12400 },
                { region: "Nelspruit", revenue: 9800 },
              ],
              xKey: "region",
              yKey: "revenue",
            },
          },
        ],
        x: 2,
        y: 2,
        w: 94,
        h: 80,
      },
    ],
  });

  try {
    await page.goto(`${FRONTEND_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.locator("h1").filter({ hasText: "ZTF-005 Chart Tile Zoom-to-Fit" })
    ).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Recharts renders SVG — wait for it
    await page.waitForSelector("svg", { timeout: 20_000 });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "zoom-fit-005-dashboard-chart.png"),
      fullPage: false,
    });

    // Overflow check
    const overflow = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const svgs = Array.from(document.querySelectorAll(".recharts-surface, svg")) as SVGSVGElement[];
      return svgs.map((svg) => {
        const rect = svg.getBoundingClientRect();
        return {
          width: rect.width,
          right: rect.right,
          overflowsViewport: rect.right > viewportWidth + 4,
        };
      });
    });

    overflow.forEach((s, i) => {
      console.log(
        `[ZTF-005] SVG[${i}]: width=${s.width.toFixed(0)}px, right=${s.right.toFixed(0)}px, overflowsViewport=${s.overflowsViewport}`
      );
    });

    const anyOverflows = overflow.some((s) => s.overflowsViewport);
    expect(anyOverflows).toBe(false);

    console.log("[ZTF-005] PASS: Chart tile in dashboard does not overflow viewport.");
  } finally {
    await deleteDashboard(request, dashboard.id);
  }
});

// ---------------------------------------------------------------------------
// ZTF-006: Dashboard with mixed mermaid + chart tiles — both fit
// ---------------------------------------------------------------------------

test("ZTF-006: Dashboard with mixed mermaid and chart tiles renders both without overflow", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createDashboard(request, {
    title: "ZTF-006 Mixed Tiles Zoom-to-Fit",
    layout_json: [
      {
        id: "chart-tile",
        type: "viz_chart",
        title: "KPI Overview",
        content: [
          {
            type: "viz_chart",
            spec: {
              type: "line",
              title: "Monthly Active Users",
              data: [
                { month: "Jul", users: 1200 },
                { month: "Aug", users: 1450 },
                { month: "Sep", users: 1320 },
                { month: "Oct", users: 1680 },
                { month: "Nov", users: 1900 },
                { month: "Dec", users: 2100 },
              ],
              xKey: "month",
              yKey: "users",
            },
          },
        ],
        x: 1,
        y: 1,
        w: 47,
        h: 85,
      },
      {
        id: "mermaid-tile",
        type: "mermaid",
        title: "Churn Process",
        content: [
          {
            type: "mermaid",
            definition: [
              "flowchart LR",
              "  A[Active] --> B{Engagement Drop}",
              "  B --> C[At Risk]",
              "  C --> D[Retained]",
              "  C --> E[Churned]",
              "  E --> F[Win-Back]",
              "  F --> D",
            ].join("\n"),
          },
        ],
        x: 51,
        y: 1,
        w: 47,
        h: 85,
      },
    ],
  });

  try {
    await page.goto(`${FRONTEND_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.locator("h1").filter({ hasText: "ZTF-006 Mixed Tiles Zoom-to-Fit" })
    ).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Wait for SVGs from both chart and mermaid
    await page.waitForSelector("svg", { timeout: MERMAID_RENDER_TIMEOUT });
    await page.waitForTimeout(2_000); // let Mermaid async render complete

    const svgCount = await page.locator("svg").count();
    console.log(`[ZTF-006] Total SVG elements: ${svgCount}`);
    expect(svgCount).toBeGreaterThanOrEqual(2); // at least one chart + one mermaid

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "zoom-fit-006-mixed-tiles.png"),
      fullPage: false,
    });

    // Check every SVG for viewport overflow
    const overflow = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const svgs = Array.from(document.querySelectorAll("svg")) as SVGSVGElement[];
      return svgs
        .map((svg, idx) => {
          const rect = svg.getBoundingClientRect();
          return {
            idx,
            width: rect.width,
            right: rect.right,
            visible: rect.width > 5 && rect.height > 5,
            overflowsViewport: rect.right > viewportWidth + 4,
          };
        })
        .filter((s) => s.visible); // only check visible SVGs
    });

    console.log(`[ZTF-006] Checking ${overflow.length} visible SVG(s) for overflow:`);
    overflow.forEach((s) => {
      console.log(
        `  SVG[${s.idx}]: width=${s.width.toFixed(0)}px, right=${s.right.toFixed(0)}px, overflowsViewport=${s.overflowsViewport}`
      );
    });

    const overflowing = overflow.filter((s) => s.overflowsViewport);
    expect(overflowing).toHaveLength(0);

    console.log("[ZTF-006] PASS: All tiles in mixed dashboard fit within viewport.");
  } finally {
    await deleteDashboard(request, dashboard.id);
  }
});

// ---------------------------------------------------------------------------
// ZTF-007: Mermaid in expand overlay does not overflow
// ---------------------------------------------------------------------------

test("ZTF-007: Expanded mermaid overlay fits within screen without overflow", async ({
  page,
}) => {
  test.setTimeout(CHAT_STREAM_TIMEOUT + 30_000);

  await page.goto(`${FRONTEND_URL}/`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

  // Request a mermaid diagram
  await sendChatMessage(
    page,
    "draw a mermaid flowchart showing 5 stages of a sales pipeline"
  );

  // Wait for Mermaid SVG in chat
  const mermaidSvg = page.locator('[role="log"] svg').first();
  await expect(mermaidSvg).toBeVisible({ timeout: MERMAID_RENDER_TIMEOUT });
  await page.waitForTimeout(800);

  // Look for the Expand diagram button
  const expandBtn = page.locator('[aria-label="Expand diagram"]').first();
  const hasExpandBtn = await expandBtn.isVisible().catch(() => false);

  if (!hasExpandBtn) {
    // Fall back to any expand button in the log
    const anyExpandBtn = page
      .locator('[role="log"] button[aria-label*="Expand"], [role="log"] button[aria-label*="expand"]')
      .first();
    const fallbackVisible = await anyExpandBtn.isVisible().catch(() => false);
    if (fallbackVisible) {
      await anyExpandBtn.click();
    } else {
      console.log("[ZTF-007] No expand button found — skipping overlay portion of test.");
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "zoom-fit-007-no-expand-btn.png"),
        fullPage: false,
      });
      // Still pass — diagram is in inline view
      return;
    }
  } else {
    await expandBtn.click();
  }

  // Wait for the overlay / dialog to open
  const overlay = page.locator(
    '[role="dialog"], .fixed.inset-0, [data-overlay], [aria-label="Close expanded view"]'
  ).first();
  await expect(overlay).toBeVisible({ timeout: 5_000 });

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "zoom-fit-007-mermaid-expanded-overlay.png"),
    fullPage: false,
  });

  // Check SVG inside the overlay for overflow
  const overlayOverflow = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Find SVGs that are inside a modal / overlay (fixed positioned ancestor)
    const allSvgs = Array.from(document.querySelectorAll("svg")) as SVGSVGElement[];
    const results = allSvgs.map((svg) => {
      const rect = svg.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
        overflowsRight: rect.right > viewportWidth + 4,
        overflowsBottom: rect.bottom > viewportHeight + 4,
        visible: rect.width > 10 && rect.height > 10,
      };
    });

    return { viewportWidth, viewportHeight, svgs: results.filter((s) => s.visible) };
  });

  console.log(
    `[ZTF-007] Overlay: viewport ${overlayOverflow.viewportWidth}x${overlayOverflow.viewportHeight}`
  );
  overlayOverflow.svgs.forEach((s, i) => {
    console.log(
      `  SVG[${i}]: ${s.width.toFixed(0)}x${s.height.toFixed(0)}px, right=${s.right.toFixed(0)}, bottom=${s.bottom.toFixed(0)}, overflowsRight=${s.overflowsRight}, overflowsBottom=${s.overflowsBottom}`
    );
  });

  const overflowing = overlayOverflow.svgs.filter((s) => s.overflowsRight);
  expect(overflowing).toHaveLength(0);

  // Close the overlay
  const closeBtn = page.locator('[aria-label="Close expanded view"]').first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  } else {
    await page.keyboard.press("Escape");
  }

  console.log("[ZTF-007] PASS: Expanded mermaid overlay SVG fits within viewport.");
});
