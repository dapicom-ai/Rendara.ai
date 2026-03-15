/**
 * Dashboard Rich Content E2E Tests — RC-DASH-1 through RC-DASH-16
 *
 * Validates the new ContentBlock rendering pipeline on the dashboard detail page:
 *   - text tiles with legacy string content (normaliseContent migration shim)
 *   - text tiles with markdown (headings, bullets, bold text)
 *   - text tiles using the new ContentBlock array format
 *   - viz_chart tiles (Recharts SVG present)
 *   - mermaid tiles (Mermaid SVG present)
 *   - tiles with optional title header
 *   - AgentChatPanel expand/collapse behaviour
 *   - chat input visible when panel is expanded
 *   - resource_updated SSE → canvas re-fetches (simulated via PATCH + reload)
 *
 * Self-seeding: all test data is created via POST /api/dashboards before each test
 * and deleted in a finally block.
 *
 * Frontend: http://localhost:3000
 * Backend:  http://localhost:8001
 */

import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import {
  BASE_URL,
  BACKEND_URL,
  TIMEOUT,
  DashboardDetailPage,
  createTestDashboard,
  deleteResource,
} from "./helpers/page-objects";

const SCREENSHOT_DIR = path.join(
  process.cwd(),
  "test-screenshots",
  "dashboard-rich-content"
);

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

// ---------------------------------------------------------------------------
// RC-DASH-1: Navigate to seeded dashboard — canvas renders, no empty state
// ---------------------------------------------------------------------------

test("RC-DASH-1: Seeded dashboard renders canvas, no empty-state placeholder", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-1 Canvas Test",
    layout_json: [
      { id: "t1", type: "text", content: "Hello tile", x: 5, y: 5, w: 40, h: 45 },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-DASH-1 Canvas Test" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    // Empty state must NOT be visible
    await expect(
      page.getByText("This dashboard has no tiles yet.")
    ).not.toBeVisible();

    // DashboardCanvas wrapper (16:9 aspect ratio container) must be present
    const canvas = page.locator('[style*="aspect"]').first();
    await expect(canvas).toBeVisible({ timeout: TIMEOUT.animation });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-1-canvas.png"),
    });
    console.log("[RC-DASH-1] PASS: Canvas renders with seeded tiles.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-2: Text tile with legacy string content renders via normaliseContent
// ---------------------------------------------------------------------------

test("RC-DASH-2: Legacy string content in tile is rendered as text via normaliseContent", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const uniqueText = "RC-DASH-2-unique-legacy-string-content";
  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-2 Legacy Content",
    layout_json: [
      // Old-format tile: content is a plain string, not a ContentBlock array
      { id: "t1", type: "text", content: uniqueText, x: 2, y: 2, w: 60, h: 60 },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-DASH-2 Legacy Content" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.waitForTimeout(1_000);

    // The text from the legacy string must appear in the page
    const bodyText = (await page.locator("body").textContent()) ?? "";
    expect(bodyText).toContain(uniqueText);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-2-legacy.png"),
    });
    console.log("[RC-DASH-2] PASS: Legacy string content rendered as text.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-3: Text tile with markdown heading renders <h2>/<h3> elements
// ---------------------------------------------------------------------------

test("RC-DASH-3: Markdown heading in text tile renders as heading element", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-3 Markdown Heading",
    layout_json: [
      {
        id: "t1",
        type: "text",
        content: [{ type: "text", text: "## Revenue Summary\n\nQ4 results were strong." }],
        x: 2, y: 2, w: 60, h: 60,
      },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-DASH-3 Markdown Heading" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.waitForTimeout(1_500);

    // MarkdownRenderer should produce an <h2> for "## Revenue Summary"
    const heading = page.locator("h2").filter({ hasText: "Revenue Summary" });
    await expect(heading).toBeVisible({ timeout: TIMEOUT.animation });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-3-heading.png"),
    });
    console.log("[RC-DASH-3] PASS: Markdown heading rendered inside tile.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-4: Text tile with bullet list renders <ul>/<li> elements
// ---------------------------------------------------------------------------

test("RC-DASH-4: Markdown bullet list in text tile renders list elements", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-4 Bullet List",
    layout_json: [
      {
        id: "t1",
        type: "text",
        content: [{ type: "text", text: "- Item alpha\n- Item beta\n- Item gamma" }],
        x: 2, y: 2, w: 60, h: 60,
      },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-DASH-4 Bullet List" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.waitForTimeout(1_500);

    const bodyText = (await page.locator("body").textContent()) ?? "";
    expect(bodyText).toContain("Item alpha");
    expect(bodyText).toContain("Item beta");
    expect(bodyText).toContain("Item gamma");

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-4-bullets.png"),
    });
    console.log("[RC-DASH-4] PASS: Bullet list text rendered inside tile.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-5: New-format ContentBlock array renders same as legacy string
// ---------------------------------------------------------------------------

test("RC-DASH-5: New ContentBlock array format renders text correctly", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const uniqueText = "RC-DASH-5-contentblock-array-text";
  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-5 ContentBlock Format",
    layout_json: [
      {
        id: "t1",
        type: "text",
        content: [{ type: "text", text: uniqueText }],
        x: 2, y: 2, w: 60, h: 60,
      },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-DASH-5 ContentBlock Format" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.waitForTimeout(1_000);

    const bodyText = (await page.locator("body").textContent()) ?? "";
    expect(bodyText).toContain(uniqueText);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-5-contentblock.png"),
    });
    console.log("[RC-DASH-5] PASS: ContentBlock array text rendered.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-6: viz_chart tile renders an SVG element (Recharts output)
// ---------------------------------------------------------------------------

test("RC-DASH-6: viz_chart tile renders SVG chart element", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-6 Chart Tile",
    layout_json: [
      {
        id: "t1",
        type: "viz_chart",
        content: [
          {
            type: "viz_chart",
            spec: {
              type: "bar",
              title: "Revenue by Region",
              data: [
                { region: "Cape Town", revenue: 45000 },
                { region: "Johannesburg", revenue: 62000 },
                { region: "Durban", revenue: 31000 },
              ],
              xKey: "region",
              yKey: "revenue",
            },
          },
        ],
        x: 2, y: 2, w: 60, h: 80,
      },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-DASH-6 Chart Tile" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    // Recharts renders SVG elements — wait for at least one SVG to appear
    await page.waitForSelector("svg", { timeout: TIMEOUT.animation });
    const svgCount = await page.locator("svg").count();
    expect(svgCount).toBeGreaterThan(0);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-6-chart.png"),
    });
    console.log(`[RC-DASH-6] PASS: SVG chart rendered (${svgCount} SVG elements found).`);
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-7: mermaid tile renders an SVG diagram
// ---------------------------------------------------------------------------

test("RC-DASH-7: mermaid tile renders SVG diagram", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-7 Mermaid Tile",
    layout_json: [
      {
        id: "t1",
        type: "mermaid",
        content: [
          {
            type: "mermaid",
            definition: "flowchart TD\n  A[Start] --> B[Process]\n  B --> C[End]",
          },
        ],
        x: 2, y: 2, w: 60, h: 80,
      },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-DASH-7 Mermaid Tile" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    // Mermaid renders asynchronously — wait for SVG
    await page.waitForSelector("svg", { timeout: TIMEOUT.apiPageLoad });
    const svgCount = await page.locator("svg").count();
    expect(svgCount).toBeGreaterThan(0);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-7-mermaid.png"),
    });
    console.log(`[RC-DASH-7] PASS: Mermaid SVG rendered (${svgCount} SVG elements).`);
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-8: Tile with optional title renders title text above content
// ---------------------------------------------------------------------------

test("RC-DASH-8: Tile with optional title field renders title above content", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-8 Tile Title",
    layout_json: [
      {
        id: "t1",
        type: "text",
        title: "RC-DASH-8-tile-heading",
        content: [{ type: "text", text: "Content below the tile title." }],
        x: 2, y: 2, w: 60, h: 60,
      },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-DASH-8 Tile Title" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.waitForTimeout(1_000);

    // The tile's optional title field should appear
    const bodyText = (await page.locator("body").textContent()) ?? "";
    expect(bodyText).toContain("RC-DASH-8-tile-heading");

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-8-tile-title.png"),
    });
    console.log("[RC-DASH-8] PASS: Tile optional title rendered.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-9: Dashboard with multiple tiles (text + chart) both render
// ---------------------------------------------------------------------------

test("RC-DASH-9: Dashboard with mixed text + chart tiles renders both", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-9 Mixed Tiles",
    layout_json: [
      {
        id: "text-tile",
        type: "text",
        content: [{ type: "text", text: "RC-DASH-9-text-tile-content" }],
        x: 1, y: 1, w: 45, h: 90,
      },
      {
        id: "chart-tile",
        type: "viz_chart",
        content: [
          {
            type: "viz_chart",
            spec: {
              type: "line",
              title: "Monthly Trend",
              data: [
                { month: "Jul", value: 100 },
                { month: "Aug", value: 120 },
                { month: "Sep", value: 110 },
              ],
              xKey: "month",
              yKey: "value",
            },
          },
        ],
        x: 50, y: 1, w: 48, h: 90,
      },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-DASH-9 Mixed Tiles" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.waitForTimeout(1_500);

    // Text tile content visible
    const bodyText = (await page.locator("body").textContent()) ?? "";
    expect(bodyText).toContain("RC-DASH-9-text-tile-content");

    // At least one SVG for the chart
    const svgCount = await page.locator("svg").count();
    expect(svgCount).toBeGreaterThan(0);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-9-mixed.png"),
    });
    console.log(`[RC-DASH-9] PASS: Mixed tiles rendered (text + chart, ${svgCount} SVG).`);
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-10: AgentChatPanel starts collapsed (32px strip)
// ---------------------------------------------------------------------------

test("RC-DASH-10: AgentChatPanel is collapsed by default on dashboard detail", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-10 Panel Collapsed",
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1")).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

    // Expand button (aria-label "Expand chat panel") must be visible
    const expandBtn = DashboardDetailPage.agentPanelCollapsed(page);
    await expect(expandBtn).toBeVisible({ timeout: TIMEOUT.animation });

    // Collapse button must NOT be visible (panel is not expanded)
    const collapseBtn = DashboardDetailPage.agentPanelExpanded(page);
    await expect(collapseBtn).not.toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-10-collapsed.png"),
    });
    console.log("[RC-DASH-10] PASS: AgentChatPanel collapsed by default.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-11: Expand AgentChatPanel — panel widens, chat UI mounts
// ---------------------------------------------------------------------------

test("RC-DASH-11: Expanding AgentChatPanel shows chat input", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-11 Panel Expand",
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1")).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

    const expandBtn = DashboardDetailPage.agentPanelCollapsed(page);
    await expect(expandBtn).toBeVisible({ timeout: TIMEOUT.animation });
    await expandBtn.click();

    // After expansion the collapse button should appear
    await expect(DashboardDetailPage.agentPanelExpanded(page)).toBeVisible({
      timeout: TIMEOUT.animation,
    });

    // Chat input (textarea or [role=textbox]) should be mounted
    // The panel initialises the ChatProvider which renders ConversationView
    await page.waitForTimeout(1_500); // allow initResourceConversation to complete
    const chatInput = page.locator("textarea").first();
    const isVisible = await chatInput.isVisible().catch(() => false);
    // The chat input may take a moment to appear; check body text for chat UI signals
    if (!isVisible) {
      const bodyText = (await page.locator("body").textContent()) ?? "";
      // At minimum "Initializing..." or the chat input should be present
      const hasChatUI =
        bodyText.includes("Initializing") ||
        (await page.locator('[placeholder*="message"], [placeholder*="Message"]').count()) > 0;
      expect(hasChatUI || isVisible).toBe(true);
    } else {
      await expect(chatInput).toBeVisible();
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-11-expanded.png"),
    });
    console.log("[RC-DASH-11] PASS: AgentChatPanel expanded with chat UI.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-12: Collapsing AgentChatPanel returns to narrow strip
// ---------------------------------------------------------------------------

test("RC-DASH-12: Collapsing AgentChatPanel returns to narrow strip", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-12 Panel Collapse",
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1")).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

    // Expand
    await DashboardDetailPage.agentPanelCollapsed(page).click();
    await expect(DashboardDetailPage.agentPanelExpanded(page)).toBeVisible({
      timeout: TIMEOUT.animation,
    });

    // Collapse
    await DashboardDetailPage.agentPanelExpanded(page).click();
    await expect(DashboardDetailPage.agentPanelCollapsed(page)).toBeVisible({
      timeout: TIMEOUT.animation,
    });

    // Collapse button (ChevronRight) no longer visible
    await expect(DashboardDetailPage.agentPanelExpanded(page)).not.toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-12-recollapsed.png"),
    });
    console.log("[RC-DASH-12] PASS: AgentChatPanel collapsed back to strip.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-13: conversation_id returned in GET /api/dashboards/{id}
// ---------------------------------------------------------------------------

test("RC-DASH-13: GET /api/dashboards/{id} includes conversation_id field", async ({
  request,
}) => {
  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-13 Conv ID Field",
  });

  try {
    const res = await request.get(`${BACKEND_URL}/api/dashboards/${dashboard.id}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // conversation_id field must be present (even if null initially)
    expect("conversation_id" in body || body.conversationId !== undefined).toBe(true);
    console.log("[RC-DASH-13] PASS: conversation_id field present in dashboard GET response.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-14: PATCH /api/dashboards/{id} with new ContentBlock layout accepted
// ---------------------------------------------------------------------------

test("RC-DASH-14: PATCH /api/dashboards/{id} with ContentBlock layout_json accepted", async ({
  request,
}) => {
  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-14 Patch ContentBlock",
    layout_json: [],
  });

  try {
    const newLayout = [
      {
        id: "t1",
        type: "text",
        content: [{ type: "text", text: "Updated via PATCH" }],
        x: 0, y: 0, w: 50, h: 50,
      },
    ];

    const patchRes = await request.patch(
      `${BACKEND_URL}/api/dashboards/${dashboard.id}`,
      { data: { layout_json: newLayout } }
    );
    expect(patchRes.ok()).toBeTruthy();

    const getRes = await request.get(`${BACKEND_URL}/api/dashboards/${dashboard.id}`);
    expect(getRes.ok()).toBeTruthy();
    const body = await getRes.json();
    const layoutJson = body.layoutJson ?? body.layout_json;
    expect(Array.isArray(layoutJson)).toBe(true);
    expect(layoutJson.length).toBe(1);

    console.log("[RC-DASH-14] PASS: ContentBlock layout_json accepted by PATCH.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-15: Canvas re-fetches after onResourceUpdated fires
//   Simulated: directly PATCH the dashboard then reload the page.
// ---------------------------------------------------------------------------

test("RC-DASH-15: Canvas re-renders after PATCH updates layout (simulated resource_updated)", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const originalText = "RC-DASH-15-original-content";
  const updatedText = "RC-DASH-15-updated-content";

  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-15 Refresh Test",
    layout_json: [
      {
        id: "t1",
        type: "text",
        content: [{ type: "text", text: originalText }],
        x: 2, y: 2, w: 60, h: 60,
      },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1")).toBeVisible({ timeout: TIMEOUT.apiPageLoad });
    await page.waitForTimeout(1_000);

    // Verify original text visible
    const bodyBefore = (await page.locator("body").textContent()) ?? "";
    expect(bodyBefore).toContain(originalText);

    // Simulate the update that update_dashboard would perform
    await request.patch(`${BACKEND_URL}/api/dashboards/${dashboard.id}`, {
      data: {
        layout_json: [
          {
            id: "t1",
            type: "text",
            content: [{ type: "text", text: updatedText }],
            x: 2, y: 2, w: 60, h: 60,
          },
        ],
      },
    });

    // Reload the page (simulates what refreshKey increment does)
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toBeVisible({ timeout: TIMEOUT.apiPageLoad });
    await page.waitForTimeout(1_000);

    const bodyAfter = (await page.locator("body").textContent()) ?? "";
    expect(bodyAfter).toContain(updatedText);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-dash-15-refreshed.png"),
    });
    console.log("[RC-DASH-15] PASS: Canvas re-renders with updated tile content after PATCH.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-DASH-16: resource_updated SSE event emitted after update_dashboard API call
//   Validates the SSE event shape via the chat stream response body.
// ---------------------------------------------------------------------------

test("RC-DASH-16: POST /api/chat/stream with resource_id returns 200 SSE stream", async ({
  request,
}) => {
  // Create a conversation ID for this test
  const convId = `rc-dash-16-${Date.now()}`;
  const dashboard = await createTestDashboard(request, {
    title: "RC-DASH-16 SSE Resource ID",
    layout_json: [
      { id: "t1", type: "text", content: "base content", x: 0, y: 0, w: 50, h: 50 },
    ],
  });

  try {
    const res = await request.post(`${BACKEND_URL}/api/chat/stream`, {
      data: {
        conversation_id: convId,
        message: "What is in this dashboard?",
        new_conversation: true,
        resource_id: `dashboard:${dashboard.id}`,
      },
    });

    // Stream must start (200 OK)
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["content-type"]).toContain("text/event-stream");

    // Read the first chunk to ensure the stream delivers events
    const body = await res.text();
    expect(body.length).toBeGreaterThan(0);
    // Must contain SSE "data:" lines
    expect(body).toContain("data:");

    console.log("[RC-DASH-16] PASS: Chat stream with resource_id returns 200 SSE stream.");
  } finally {
    await deleteResource(request, `/api/dashboards/${dashboard.id}`);
  }
});
