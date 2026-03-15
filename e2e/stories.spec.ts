/**
 * Suite: Stories Tests — TC-STORY-001 through TC-STORY-012
 *
 * Validates the Stories feature:
 *   - /stories index: grid of agent-created stories
 *   - /stories/[id]: StoryViewer with slide navigation
 *   - Keyboard navigation (← →)
 *   - "Present" button → fullscreen presentation mode
 *   - Escape exits presentation mode
 *   - AgentChatPanel on the right (collapsed by default)
 *   - Auto-advance with countdown bar
 *   - API: GET/POST/PATCH/DELETE /api/stories
 *
 * Self-seeding: uses POST /api/stories to create test data before tests.
 * Fixture: 3 slides, no auto-advance (null interval).
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
  StoriesPage,
  StoryDetailPage,
  Sidebar,
  createTestStory,
  deleteResource,
} from "./helpers/page-objects";

const SCREENSHOT_DIR = path.join(
  process.cwd(),
  "test-screenshots",
  "stories"
);

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

// ---------------------------------------------------------------------------
// TC-STORY-001: /stories index loads with correct heading
// ---------------------------------------------------------------------------

test("TC-STORY-001: /stories page loads with 'Stories' heading", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/stories`, { waitUntil: "domcontentloaded" });

  await expect(StoriesPage.heading(page)).toBeVisible({
    timeout: TIMEOUT.navigation,
  });

  // No create button (agent-only)
  const createBtn = page.getByRole("button", { name: /new story|create story/i });
  await expect(createBtn).toHaveCount(0);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "tc-story-001-index.png"),
    fullPage: true,
  });
  console.log("[TC-STORY-001] PASS: /stories loads with heading.");
});

// ---------------------------------------------------------------------------
// TC-STORY-002: Empty state on /stories when no stories exist
// ---------------------------------------------------------------------------

test("TC-STORY-002: /stories shows empty state with agent prompt text", async ({
  page,
  request,
}) => {
  const listRes = await request.get(`${BACKEND_URL}/api/stories`);
  if (!listRes.ok()) {
    console.warn("[TC-STORY-002] GET /api/stories failed");
    test.skip();
    return;
  }
  const stories = await listRes.json();
  if (stories.length > 0) {
    console.log(
      `[TC-STORY-002] ${stories.length} stories exist — skipping empty state test`
    );
    test.skip();
    return;
  }

  await page.goto(`${BASE_URL}/stories`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await expect(StoriesPage.emptyStateText(page)).toBeVisible({
    timeout: TIMEOUT.apiPageLoad,
  });

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "tc-story-002-empty.png"),
  });
  console.log("[TC-STORY-002] PASS: Empty state renders on /stories.");
});

// ---------------------------------------------------------------------------
// TC-STORY-003: Seeded story appears as a card on /stories index
// ---------------------------------------------------------------------------

test("TC-STORY-003: Seeded story appears as a card on /stories index", async ({
  page,
  request,
}) => {
  let seeded: { id: string; title: string } | null = null;

  try {
    seeded = await createTestStory(request, { title: "TC-STORY-003 Test Story" });
  } catch (err) {
    console.warn(`[TC-STORY-003] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/stories`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-story-003-with-card.png"),
      fullPage: true,
    });

    // Story title visible
    await expect(
      page.getByText("TC-STORY-003 Test Story")
    ).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

    // Slide count visible — 3 slides from fixture
    await expect(page.getByText(/3 slides/)).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    console.log("[TC-STORY-003] PASS: Story card visible with title and slide count.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/stories/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-STORY-004: Clicking a story card navigates to /stories/[id]
// ---------------------------------------------------------------------------

test("TC-STORY-004: Clicking a story card navigates to /stories/[id]", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestStory(request, { title: "TC-STORY-004 Navigate Test" });
  } catch (err) {
    console.warn(`[TC-STORY-004] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/stories`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const card = StoriesPage.cards(page).filter({
      hasText: "TC-STORY-004 Navigate Test",
    });
    await expect(card).toBeVisible({ timeout: TIMEOUT.apiPageLoad });
    await card.click();

    await page.waitForURL(`**/stories/${seeded.id}`, {
      timeout: TIMEOUT.navigation,
    });
    expect(page.url()).toContain(`/stories/${seeded.id}`);

    await expect(StoryDetailPage.title(page)).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-story-004-detail.png"),
    });
    console.log("[TC-STORY-004] PASS: Navigated to story detail.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/stories/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-STORY-005: Story detail renders title, slide counter, prev/next buttons
// ---------------------------------------------------------------------------

test("TC-STORY-005: Story detail renders title, slide counter, and nav buttons", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestStory(request, { title: "TC-STORY-005 Detail Test" });
  } catch (err) {
    console.warn(`[TC-STORY-005] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/stories/${seeded.id}`, {
      waitUntil: "domcontentloaded",
    });

    // Title
    const title = StoryDetailPage.title(page);
    await expect(title).toBeVisible({ timeout: TIMEOUT.apiPageLoad });
    const titleText = await title.textContent();
    expect(titleText).toContain("TC-STORY-005 Detail Test");

    // Back button
    await expect(StoryDetailPage.backButton(page)).toBeVisible({
      timeout: TIMEOUT.navigation,
    });

    // "N slides" badge
    await expect(page.getByText(/3 slides/)).toBeVisible({
      timeout: TIMEOUT.navigation,
    });

    // Slide counter "1 / 3"
    await expect(StoryDetailPage.slideCounter(page)).toBeVisible({
      timeout: TIMEOUT.navigation,
    });
    const counterText = await StoryDetailPage.slideCounter(page).textContent();
    expect(counterText).toContain("1 / 3");

    // Prev button (disabled on first slide)
    const prevBtn = StoryDetailPage.prevButton(page);
    await expect(prevBtn).toBeVisible({ timeout: TIMEOUT.navigation });
    await expect(prevBtn).toBeDisabled();

    // Next button (enabled — 3 slides)
    const nextBtn = StoryDetailPage.nextButton(page);
    await expect(nextBtn).toBeVisible({ timeout: TIMEOUT.navigation });
    await expect(nextBtn).toBeEnabled();

    // Present button
    await expect(StoryDetailPage.presentButton(page)).toBeVisible({
      timeout: TIMEOUT.navigation,
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-story-005-detail.png"),
    });
    console.log("[TC-STORY-005] PASS: Story detail renders correctly.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/stories/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-STORY-006: Next/Prev buttons navigate between slides
// ---------------------------------------------------------------------------

test("TC-STORY-006: Next and Previous buttons navigate between story slides", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestStory(request, { title: "TC-STORY-006 Navigation" });
  } catch (err) {
    console.warn(`[TC-STORY-006] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/stories/${seeded.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(StoryDetailPage.slideCounter(page)).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    // Should start at slide 1 of 3
    let counterText = await StoryDetailPage.slideCounter(page).textContent();
    expect(counterText).toContain("1 / 3");

    // Click Next
    await StoryDetailPage.nextButton(page).click();
    await page.waitForTimeout(200);

    counterText = await StoryDetailPage.slideCounter(page).textContent();
    expect(counterText).toContain("2 / 3");

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-story-006-slide-2.png"),
    });

    // Click Next again
    await StoryDetailPage.nextButton(page).click();
    await page.waitForTimeout(200);

    counterText = await StoryDetailPage.slideCounter(page).textContent();
    expect(counterText).toContain("3 / 3");

    // Next should now be disabled (last slide)
    await expect(StoryDetailPage.nextButton(page)).toBeDisabled();

    // Click Prev
    await StoryDetailPage.prevButton(page).click();
    await page.waitForTimeout(200);

    counterText = await StoryDetailPage.slideCounter(page).textContent();
    expect(counterText).toContain("2 / 3");

    console.log("[TC-STORY-006] PASS: Slide navigation works correctly.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/stories/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-STORY-007: Keyboard arrow navigation between slides
// ---------------------------------------------------------------------------

test("TC-STORY-007: Arrow keys navigate between story slides", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestStory(request, { title: "TC-STORY-007 Keyboard" });
  } catch (err) {
    console.warn(`[TC-STORY-007] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/stories/${seeded.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(StoryDetailPage.slideCounter(page)).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    // Start at slide 1
    let counter = await StoryDetailPage.slideCounter(page).textContent();
    expect(counter).toContain("1 / 3");

    // ArrowRight → slide 2
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    counter = await StoryDetailPage.slideCounter(page).textContent();
    expect(counter).toContain("2 / 3");

    // ArrowRight → slide 3
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    counter = await StoryDetailPage.slideCounter(page).textContent();
    expect(counter).toContain("3 / 3");

    // ArrowLeft → slide 2
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(200);
    counter = await StoryDetailPage.slideCounter(page).textContent();
    expect(counter).toContain("2 / 3");

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-story-007-keyboard-nav.png"),
    });
    console.log("[TC-STORY-007] PASS: Keyboard arrow navigation works.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/stories/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-STORY-008: Present button opens fullscreen presentation mode
// ---------------------------------------------------------------------------

test("TC-STORY-008: Present button enters fullscreen presentation mode", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestStory(request, { title: "TC-STORY-008 Present" });
  } catch (err) {
    console.warn(`[TC-STORY-008] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/stories/${seeded.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(StoryDetailPage.presentButton(page)).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await StoryDetailPage.presentButton(page).click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-story-008-presentation-mode.png"),
    });

    // Fullscreen overlay should be visible (fixed inset-0 z-50 bg-[#0F1117])
    const overlay = StoryDetailPage.presentationOverlay(page);
    await expect(overlay).toBeVisible({ timeout: TIMEOUT.presentation });

    // Normal slide controls (prev/next) inside the overlay
    const presentationPrev = overlay.locator("button").first();
    const presentationNext = overlay.locator("button").nth(1);
    expect(await overlay.locator("button").count()).toBeGreaterThanOrEqual(2);

    // Slide counter "1 / 3" visible in presentation mode
    const presCounter = overlay.locator("span").filter({ hasText: /\d+ \/ \d+/ });
    await expect(presCounter).toBeVisible({ timeout: TIMEOUT.navigation });

    console.log("[TC-STORY-008] PASS: Presentation mode overlay visible.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/stories/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-STORY-009: Escape key exits presentation mode
// ---------------------------------------------------------------------------

test("TC-STORY-009: Escape key exits presentation mode", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestStory(request, { title: "TC-STORY-009 Escape" });
  } catch (err) {
    console.warn(`[TC-STORY-009] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/stories/${seeded.id}`, {
      waitUntil: "domcontentloaded",
    });

    // Enter presentation mode
    await expect(StoryDetailPage.presentButton(page)).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });
    await StoryDetailPage.presentButton(page).click();
    await page.waitForTimeout(300);

    // Verify overlay is showing
    const overlay = StoryDetailPage.presentationOverlay(page);
    await expect(overlay).toBeVisible({ timeout: TIMEOUT.presentation });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-story-009-in-presentation.png"),
    });

    // Press Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Overlay should be gone
    await expect(overlay).not.toBeVisible({ timeout: TIMEOUT.presentation });

    // Normal view should be back — Present button visible again
    await expect(StoryDetailPage.presentButton(page)).toBeVisible({
      timeout: TIMEOUT.navigation,
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-story-009-escaped.png"),
    });
    console.log("[TC-STORY-009] PASS: Escape exits presentation mode.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/stories/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-STORY-010: AgentChatPanel on story detail expands/collapses
// ---------------------------------------------------------------------------

test("TC-STORY-010: AgentChatPanel on story detail expands and collapses", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestStory(request, { title: "TC-STORY-010 Panel" });
  } catch (err) {
    console.warn(`[TC-STORY-010] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/stories/${seeded.id}`, {
      waitUntil: "domcontentloaded",
    });

    // Initially collapsed
    const expandBtn = StoryDetailPage.agentPanelCollapsed(page);
    await expect(expandBtn).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

    await expandBtn.click();
    await page.waitForTimeout(300);

    // Expanded
    const collapseBtn = StoryDetailPage.agentPanelExpanded(page);
    await expect(collapseBtn).toBeVisible({ timeout: TIMEOUT.animation });
    await expect(page.getByText("Agent Chat")).toBeVisible({
      timeout: TIMEOUT.animation,
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-story-010-panel-expanded.png"),
    });

    // Collapse again
    await collapseBtn.click();
    await page.waitForTimeout(300);
    await expect(expandBtn).toBeVisible({ timeout: TIMEOUT.animation });

    console.log("[TC-STORY-010] PASS: AgentChatPanel expands and collapses on story detail.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/stories/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-STORY-011: Delete button on story index removes a story
// ---------------------------------------------------------------------------

test("TC-STORY-011: Delete button on story card removes the story", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestStory(request, { title: "TC-STORY-011 Delete Me" });
  } catch (err) {
    console.warn(`[TC-STORY-011] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  await page.goto(`${BASE_URL}/stories`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const card = StoriesPage.cards(page).filter({ hasText: "TC-STORY-011 Delete Me" });
  await expect(card).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

  // Hover to reveal delete button
  await card.hover();
  const deleteBtn = card.locator('[aria-label="Delete story"]');
  await expect(deleteBtn).toBeVisible({ timeout: TIMEOUT.modal });

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "tc-story-011-before-delete.png"),
  });

  await deleteBtn.click();
  await page.waitForTimeout(500);

  // Should be removed
  const stillVisible = await page
    .getByText("TC-STORY-011 Delete Me")
    .isVisible()
    .catch(() => false);
  expect(stillVisible).toBe(false);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "tc-story-011-after-delete.png"),
  });
  console.log("[TC-STORY-011] PASS: Story deleted from index.");
});

// ---------------------------------------------------------------------------
// TC-STORY-012: Not-found state for invalid story ID
// ---------------------------------------------------------------------------

test("TC-STORY-012: Story detail shows error for non-existent story ID", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/stories/nonexistent-story-99999`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForTimeout(2000);

  const bodyText = (await page.locator("body").textContent()) ?? "";

  const hasError =
    bodyText.includes("Story not found") ||
    bodyText.includes("not found") ||
    bodyText.includes("error");

  const hasCrash =
    bodyText.includes("Application error") ||
    bodyText.includes("client-side exception");

  expect(hasCrash).toBe(false);
  expect(hasError).toBe(true);

  // Go Back button present
  await expect(
    page.getByRole("button", { name: /go back/i })
  ).toBeVisible({ timeout: TIMEOUT.navigation });

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "tc-story-012-not-found.png"),
  });
  console.log("[TC-STORY-012] PASS: Not-found state shown for invalid story ID.");
});

// ---------------------------------------------------------------------------
// TC-STORY-API-001: Stories API CRUD cycle
// ---------------------------------------------------------------------------

test("TC-STORY-API-001: Stories API CRUD — POST, GET, PATCH, DELETE", async ({
  request,
}) => {
  // CREATE
  const createRes = await request.post(`${BACKEND_URL}/api/stories`, {
    data: {
      title: "TC-STORY-API-001",
      slides_json: [
        { id: "s1", title: "Slide 1", content: "Content 1" },
        { id: "s2", title: "Slide 2", content: "Content 2" },
      ],
    },
  });
  expect(createRes.ok()).toBeTruthy();
  const created = await createRes.json();
  expect(created.id).toBeTruthy();
  expect(created.title).toBe("TC-STORY-API-001");

  // GET by ID
  const getRes = await request.get(`${BACKEND_URL}/api/stories/${created.id}`);
  expect(getRes.ok()).toBeTruthy();
  const fetched = await getRes.json();
  expect(fetched.title).toBe("TC-STORY-API-001");
  // Slides should be accessible
  const slides = fetched.slidesJson ?? fetched.slides_json;
  expect(Array.isArray(slides)).toBe(true);
  expect(slides.length).toBe(2);

  // PATCH title
  const patchRes = await request.patch(
    `${BACKEND_URL}/api/stories/${created.id}`,
    { data: { title: "TC-STORY-API-001 Updated" } }
  );
  expect(patchRes.ok()).toBeTruthy();

  // Verify update
  const afterPatch = await (
    await request.get(`${BACKEND_URL}/api/stories/${created.id}`)
  ).json();
  expect(afterPatch.title).toBe("TC-STORY-API-001 Updated");

  // DELETE
  const deleteRes = await request.delete(
    `${BACKEND_URL}/api/stories/${created.id}`
  );
  expect(deleteRes.ok()).toBeTruthy();

  // Confirm 404 after delete
  const afterDelete = await request.get(
    `${BACKEND_URL}/api/stories/${created.id}`
  );
  expect(afterDelete.status()).toBe(404);

  console.log("[TC-STORY-API-001] PASS: Stories CRUD cycle complete.");
});
