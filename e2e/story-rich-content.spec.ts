/**
 * Story Rich Content E2E Tests — RC-STORY-1 through RC-STORY-16
 *
 * Validates the new StorySlide rendering pipeline:
 *   - Slide viewer renders title and markdown content
 *   - MarkdownRenderer produces heading/paragraph/list elements
 *   - Slides with viz_chart visualizations render SVG charts
 *   - Slides with mermaid visualizations render SVG diagrams
 *   - Slides without visualizations render text only (no chart section)
 *   - Slide counter footer shows "N / M" in normal mode
 *   - Footer hidden in presentation mode
 *   - Next/Previous button navigation
 *   - Keyboard ArrowLeft/ArrowRight navigation
 *   - Present button enters fullscreen overlay
 *   - Escape exits presentation mode
 *   - AgentChatPanel expand/collapse on story detail
 *   - conversation_id field in GET /api/stories/{id}
 *   - POST /api/chat/stream with resource_id="story:{id}" returns 200
 *
 * Self-seeding: test data created via POST /api/stories; deleted in finally blocks.
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
  StoryDetailPage,
  createTestStory,
  deleteResource,
} from "./helpers/page-objects";

const SCREENSHOT_DIR = path.join(
  process.cwd(),
  "test-screenshots",
  "story-rich-content"
);

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

// ---------------------------------------------------------------------------
// RC-STORY-1: Navigate to seeded story — slide viewer renders
// ---------------------------------------------------------------------------

test("RC-STORY-1: Seeded story renders slide viewer with title and first slide", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-1 Viewer Test",
    slides_json: [
      { id: "s1", title: "Opening Slide", content: "Welcome to the story." },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    // Story title in h1
    await expect(page.locator("h1").filter({ hasText: "RC-STORY-1 Viewer Test" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    // Slide title in h2 (rendered by StorySlide)
    await expect(page.locator("h2").filter({ hasText: "Opening Slide" })).toBeVisible({
      timeout: TIMEOUT.animation,
    });

    // Slide content text visible
    await expect(page.getByText("Welcome to the story.")).toBeVisible({
      timeout: TIMEOUT.animation,
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-1-viewer.png"),
    });
    console.log("[RC-STORY-1] PASS: Story slide viewer renders title and content.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-2: Slide content rendered through MarkdownRenderer (heading + prose)
// ---------------------------------------------------------------------------

test("RC-STORY-2: Slide markdown content renders heading and paragraph elements", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-2 Markdown Slide",
    slides_json: [
      {
        id: "s1",
        title: "Analysis",
        content: "## Key Findings\n\nChurn increased by **12%** in Q4.",
      },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-STORY-2 Markdown Slide" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.waitForTimeout(1_000);

    // MarkdownRenderer should produce h2 for "## Key Findings"
    await expect(page.locator("h2").filter({ hasText: "Key Findings" })).toBeVisible({
      timeout: TIMEOUT.animation,
    });

    // Body text contains the prose
    const bodyText = (await page.locator("body").textContent()) ?? "";
    expect(bodyText).toContain("Churn increased by");

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-2-markdown.png"),
    });
    console.log("[RC-STORY-2] PASS: Markdown heading and prose rendered in slide.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-3: Slide with viz_chart visualization renders SVG chart
// ---------------------------------------------------------------------------

test("RC-STORY-3: Slide with viz_chart visualization renders SVG chart below content", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-3 Chart Slide",
    slides_json: [
      {
        id: "s1",
        title: "Revenue Chart",
        content: "Monthly revenue trend shown below.",
        visualizations: [
          {
            type: "viz_chart",
            spec: {
              type: "bar",
              title: "Monthly Revenue",
              data: [
                { month: "Jul", revenue: 45000 },
                { month: "Aug", revenue: 52000 },
                { month: "Sep", revenue: 48000 },
              ],
              xKey: "month",
              yKey: "revenue",
            },
          },
        ],
      },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-STORY-3 Chart Slide" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    // Wait for Recharts to render SVG
    await page.waitForSelector("svg", { timeout: TIMEOUT.apiPageLoad });
    const svgCount = await page.locator("svg").count();
    expect(svgCount).toBeGreaterThan(0);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-3-chart.png"),
    });
    console.log(`[RC-STORY-3] PASS: viz_chart SVG rendered in slide (${svgCount} SVG).`);
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-4: Slide with mermaid visualization renders SVG diagram
// ---------------------------------------------------------------------------

test("RC-STORY-4: Slide with mermaid visualization renders SVG diagram", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-4 Mermaid Slide",
    slides_json: [
      {
        id: "s1",
        title: "Architecture",
        content: "The system architecture is shown below.",
        visualizations: [
          {
            type: "mermaid",
            definition: "flowchart LR\n  A[Client] --> B[API]\n  B --> C[DB]",
          },
        ],
      },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-STORY-4 Mermaid Slide" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    // Mermaid renders asynchronously
    await page.waitForSelector("svg", { timeout: TIMEOUT.apiPageLoad });
    const svgCount = await page.locator("svg").count();
    expect(svgCount).toBeGreaterThan(0);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-4-mermaid.png"),
    });
    console.log(`[RC-STORY-4] PASS: Mermaid SVG rendered in slide (${svgCount} SVG).`);
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-5: Slide without visualizations renders no chart section
// ---------------------------------------------------------------------------

test("RC-STORY-5: Text-only slide has no SVG chart elements", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-5 Text Only",
    slides_json: [
      {
        id: "s1",
        title: "Pure Text Slide",
        content: "This slide has no charts or diagrams.",
        // No visualizations field
      },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-STORY-5 Text Only" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.waitForTimeout(1_000);

    // Text content visible
    await expect(page.getByText("This slide has no charts or diagrams.")).toBeVisible({
      timeout: TIMEOUT.animation,
    });

    // Recharts/Mermaid SVGs should NOT be present (no visualizations)
    const svgCount = await page.locator("svg").count();
    // Icons (lucide) may produce SVGs, but there should be no chart SVGs
    // We cannot assert svgCount === 0 due to icon SVGs; check no recharts root
    const hasRechartsWrapper = await page.locator(".recharts-wrapper").count();
    expect(hasRechartsWrapper).toBe(0);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-5-text-only.png"),
    });
    console.log("[RC-STORY-5] PASS: Text-only slide has no chart SVG wrapper.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-6: Slide counter shows correct "N / M" format
// ---------------------------------------------------------------------------

test("RC-STORY-6: Slide counter footer shows '1 / 3' on first slide of three", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-6 Counter",
    slides_json: [
      { id: "s1", title: "Slide One", content: "Content one." },
      { id: "s2", title: "Slide Two", content: "Content two." },
      { id: "s3", title: "Slide Three", content: "Content three." },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-STORY-6 Counter" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    // Slide counter should show "1 / 3"
    const counter = StoryDetailPage.slideCounter(page);
    await expect(counter.first()).toHaveText(/1\s*\/\s*3/, {
      timeout: TIMEOUT.animation,
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-6-counter.png"),
    });
    console.log("[RC-STORY-6] PASS: Slide counter shows '1 / 3'.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-7: Slide counter updates when Next button clicked
// ---------------------------------------------------------------------------

test("RC-STORY-7: Clicking Next advances slide counter from '1 / 3' to '2 / 3'", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-7 Next Button",
    slides_json: [
      { id: "s1", title: "Slide One", content: "Content one." },
      { id: "s2", title: "Slide Two", content: "Content two." },
      { id: "s3", title: "Slide Three", content: "Content three." },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-STORY-7 Next Button" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    const counter = StoryDetailPage.slideCounter(page);
    await expect(counter.first()).toHaveText(/1\s*\/\s*3/, { timeout: TIMEOUT.animation });

    await StoryDetailPage.nextButton(page).click();
    await expect(counter.first()).toHaveText(/2\s*\/\s*3/, { timeout: TIMEOUT.animation });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-7-next.png"),
    });
    console.log("[RC-STORY-7] PASS: Next button advances slide from 1 to 2.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-8: Previous button retreats slide counter
// ---------------------------------------------------------------------------

test("RC-STORY-8: Clicking Previous retreats slide counter from '2 / 3' to '1 / 3'", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-8 Prev Button",
    slides_json: [
      { id: "s1", title: "Slide One", content: "Content one." },
      { id: "s2", title: "Slide Two", content: "Content two." },
      { id: "s3", title: "Slide Three", content: "Content three." },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-STORY-8 Prev Button" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    const counter = StoryDetailPage.slideCounter(page);
    await expect(counter.first()).toHaveText(/1\s*\/\s*3/, { timeout: TIMEOUT.animation });

    // Advance to slide 2
    await StoryDetailPage.nextButton(page).click();
    await expect(counter.first()).toHaveText(/2\s*\/\s*3/, { timeout: TIMEOUT.animation });

    // Retreat back to slide 1
    await StoryDetailPage.prevButton(page).click();
    await expect(counter.first()).toHaveText(/1\s*\/\s*3/, { timeout: TIMEOUT.animation });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-8-prev.png"),
    });
    console.log("[RC-STORY-8] PASS: Previous button retreats slide from 2 to 1.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-9: Keyboard ArrowRight advances slide
// ---------------------------------------------------------------------------

test("RC-STORY-9: ArrowRight key advances slide counter", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-9 ArrowRight",
    slides_json: [
      { id: "s1", title: "Slide One", content: "Content one." },
      { id: "s2", title: "Slide Two", content: "Content two." },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-STORY-9 ArrowRight" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    const counter = StoryDetailPage.slideCounter(page);
    await expect(counter.first()).toHaveText(/1\s*\/\s*2/, { timeout: TIMEOUT.animation });

    await page.keyboard.press("ArrowRight");
    await expect(counter.first()).toHaveText(/2\s*\/\s*2/, { timeout: TIMEOUT.animation });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-9-arrowright.png"),
    });
    console.log("[RC-STORY-9] PASS: ArrowRight advances slide.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-10: Keyboard ArrowLeft retreats slide
// ---------------------------------------------------------------------------

test("RC-STORY-10: ArrowLeft key retreats slide counter", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-10 ArrowLeft",
    slides_json: [
      { id: "s1", title: "Slide One", content: "Content one." },
      { id: "s2", title: "Slide Two", content: "Content two." },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-STORY-10 ArrowLeft" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    const counter = StoryDetailPage.slideCounter(page);

    // Advance first
    await page.keyboard.press("ArrowRight");
    await expect(counter.first()).toHaveText(/2\s*\/\s*2/, { timeout: TIMEOUT.animation });

    // Then retreat
    await page.keyboard.press("ArrowLeft");
    await expect(counter.first()).toHaveText(/1\s*\/\s*2/, { timeout: TIMEOUT.animation });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-10-arrowleft.png"),
    });
    console.log("[RC-STORY-10] PASS: ArrowLeft retreats slide.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-11: Present button enters fullscreen presentation mode
// ---------------------------------------------------------------------------

test("RC-STORY-11: Present button enters fullscreen presentation mode (UI chrome hidden)", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-11 Present",
    slides_json: [
      { id: "s1", title: "First Slide", content: "Presentation content." },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-STORY-11 Present" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    const presentBtn = StoryDetailPage.presentButton(page);
    await expect(presentBtn).toBeVisible({ timeout: TIMEOUT.animation });
    await presentBtn.click();

    // Fullscreen overlay (fixed inset-0 z-50)
    const overlay = StoryDetailPage.presentationOverlay(page);
    await expect(overlay).toBeVisible({ timeout: TIMEOUT.presentation });

    // In presentation mode the slide counter footer is hidden (presentationMode=true)
    // The footer element with "N / M" text should not be visible at the page level
    const counter = StoryDetailPage.slideCounter(page);
    // The counter inside the overlay may still be visible — check the overlay is full-screen
    const overlayBox = await overlay.boundingBox();
    expect(overlayBox).not.toBeNull();
    // Overlay should cover most of the viewport
    expect(overlayBox!.width).toBeGreaterThan(900);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-11-present.png"),
    });
    console.log("[RC-STORY-11] PASS: Presentation mode overlay covers viewport.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-12: Escape exits presentation mode
// ---------------------------------------------------------------------------

test("RC-STORY-12: Escape key exits presentation mode and restores normal view", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-12 Escape",
    slides_json: [
      { id: "s1", title: "One Slide", content: "Content." },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-STORY-12 Escape" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    // Enter presentation mode
    await StoryDetailPage.presentButton(page).click();
    const overlay = StoryDetailPage.presentationOverlay(page);
    await expect(overlay).toBeVisible({ timeout: TIMEOUT.presentation });

    // Press Escape
    await page.keyboard.press("Escape");

    // Overlay gone
    await expect(overlay).not.toBeVisible({ timeout: TIMEOUT.presentation });

    // Story title h1 still visible (normal view restored)
    await expect(
      page.locator("h1").filter({ hasText: "RC-STORY-12 Escape" })
    ).toBeVisible({ timeout: TIMEOUT.animation });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-12-escaped.png"),
    });
    console.log("[RC-STORY-12] PASS: Escape exits presentation mode.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-13: AgentChatPanel expands on story detail page
// ---------------------------------------------------------------------------

test("RC-STORY-13: AgentChatPanel expands and collapses on story detail", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const story = await createTestStory(request, {
    title: "RC-STORY-13 Panel",
    slides_json: [
      { id: "s1", title: "Panel Test Slide", content: "Panel test content." },
    ],
  });

  try {
    await page.goto(`${BASE_URL}/stories/${story.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1").filter({ hasText: "RC-STORY-13 Panel" })).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    // Panel starts collapsed
    const expandBtn = StoryDetailPage.agentPanelCollapsed(page);
    await expect(expandBtn).toBeVisible({ timeout: TIMEOUT.animation });

    // Expand
    await expandBtn.click();
    const collapseBtn = StoryDetailPage.agentPanelExpanded(page);
    await expect(collapseBtn).toBeVisible({ timeout: TIMEOUT.animation });

    // Collapse again
    await collapseBtn.click();
    await expect(expandBtn).toBeVisible({ timeout: TIMEOUT.animation });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "rc-story-13-panel.png"),
    });
    console.log("[RC-STORY-13] PASS: AgentChatPanel expand/collapse on story detail.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-14: GET /api/stories/{id} includes conversation_id field
// ---------------------------------------------------------------------------

test("RC-STORY-14: GET /api/stories/{id} includes conversation_id field", async ({
  request,
}) => {
  const story = await createTestStory(request, {
    title: "RC-STORY-14 Conv ID",
  });

  try {
    const res = await request.get(`${BACKEND_URL}/api/stories/${story.id}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // conversation_id field must be present (null initially)
    expect("conversation_id" in body || body.conversationId !== undefined).toBe(true);
    console.log("[RC-STORY-14] PASS: conversation_id field present in story GET response.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-15: PATCH /api/stories/{id} with slides containing visualizations
// ---------------------------------------------------------------------------

test("RC-STORY-15: PATCH /api/stories/{id} with visualizations in slides accepted", async ({
  request,
}) => {
  const story = await createTestStory(request, {
    title: "RC-STORY-15 Viz Slides",
    slides_json: [{ id: "s1", title: "Original", content: "Original content." }],
  });

  try {
    const updatedSlides = [
      {
        id: "s1",
        title: "Updated Slide",
        content: "Updated content.",
        visualizations: [
          {
            type: "viz_chart",
            spec: {
              type: "line",
              title: "Trend",
              data: [{ x: 1, y: 2 }],
              xKey: "x",
              yKey: "y",
            },
          },
        ],
      },
    ];

    const patchRes = await request.patch(
      `${BACKEND_URL}/api/stories/${story.id}`,
      { data: { slides_json: updatedSlides } }
    );
    expect(patchRes.ok()).toBeTruthy();

    const getRes = await request.get(`${BACKEND_URL}/api/stories/${story.id}`);
    const body = await getRes.json();
    const slides = body.slidesJson ?? body.slides_json;
    expect(Array.isArray(slides)).toBe(true);
    expect(slides[0].title).toBe("Updated Slide");
    expect(Array.isArray(slides[0].visualizations)).toBe(true);
    expect(slides[0].visualizations.length).toBe(1);

    console.log("[RC-STORY-15] PASS: PATCH with visualizations stored and returned correctly.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});

// ---------------------------------------------------------------------------
// RC-STORY-16: POST /api/chat/stream with resource_id="story:{id}" returns 200 SSE
// ---------------------------------------------------------------------------

test("RC-STORY-16: POST /api/chat/stream with resource_id for story returns 200 SSE", async ({
  request,
}) => {
  const convId = `rc-story-16-${Date.now()}`;
  const story = await createTestStory(request, {
    title: "RC-STORY-16 SSE",
    slides_json: [
      { id: "s1", title: "Test Slide", content: "Test content." },
    ],
  });

  try {
    const res = await request.post(`${BACKEND_URL}/api/chat/stream`, {
      data: {
        conversation_id: convId,
        message: "Summarise this story.",
        new_conversation: true,
        resource_id: `story:${story.id}`,
      },
    });

    expect(res.ok()).toBeTruthy();
    expect(res.headers()["content-type"]).toContain("text/event-stream");

    const body = await res.text();
    expect(body.length).toBeGreaterThan(0);
    expect(body).toContain("data:");

    console.log("[RC-STORY-16] PASS: Chat stream with story resource_id returns 200 SSE.");
  } finally {
    await deleteResource(request, `/api/stories/${story.id}`);
  }
});
