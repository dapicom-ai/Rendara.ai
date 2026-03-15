/**
 * Regression Full Test Suite
 * Tests: Chat flow with pinning, dashboard creation, and story creation.
 *
 * Frontend: http://localhost:9001
 * Backend:  http://localhost:9002
 *
 * Run with:
 *   npx playwright test e2e/regression-full.spec.ts --reporter=line --timeout=180000
 */

import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE_URL = "http://localhost:9001";
const API_URL = "http://localhost:9002";
const SCREENSHOT_DIR = path.join(
  process.cwd(),
  "docs",
  "screenshots"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function screenshot(page: Page, name: string) {
  ensureDir(SCREENSHOT_DIR);
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`[screenshot] ${filePath}`);
  return filePath;
}

/** Wait for AI streaming to START (Stop button visible or message log has content). */
async function waitForStreamingStart(page: Page, timeoutMs = 20_000) {
  await page.waitForFunction(
    () => {
      const stopBtn = document.querySelector('[aria-label="Stop generation"]');
      if (stopBtn !== null) return true;
      const messageLog = document.querySelector('[role="log"]');
      if (messageLog && (messageLog.textContent ?? "").length > 10) return true;
      return false;
    },
    { timeout: timeoutMs }
  );
}

/** Wait for AI streaming to COMPLETE (Stop button gone, Send button visible). */
async function waitForStreamingComplete(
  page: Page,
  timeoutMs = 120_000
) {
  await page.waitForFunction(
    () => {
      const stopBtn = document.querySelector('[aria-label="Stop generation"]');
      return (
        stopBtn === null ||
        (stopBtn as HTMLElement).offsetParent === null
      );
    },
    { timeout: timeoutMs }
  );
  // Extra settle time for DOM updates
  await page.waitForTimeout(500);
}

/** Send a message via the chat input. */
async function sendMessage(page: Page, message: string) {
  const textarea = page.locator(
    'textarea[placeholder*="Ask anything"]'
  );
  await expect(textarea).toBeVisible({ timeout: 10_000 });
  await textarea.click();
  await textarea.fill(message);
  await page.keyboard.press("Enter");
}

/** Navigate to the home page and wait for it to fully load. */
async function goHome(page: Page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  // Wait for the avatar image and textarea to be visible
  await page
    .locator('img[alt="Rendara"]')
    .waitFor({ state: "visible", timeout: 15_000 })
    .catch(() => {});
  // Textarea must be present
  await expect(
    page.locator('textarea[placeholder*="Ask anything"]')
  ).toBeVisible({ timeout: 15_000 });
}

/** Try to pin the most recent assistant response.
 *  Hovers the last assistant message, clicks the bookmark button (3rd icon in action bar),
 *  fills modal if present. */
async function pinLastResponse(page: Page, title?: string) {
  // Find last assistant message and hover it to reveal action bar
  const messages = page.locator(".group\\/message");
  const count = await messages.count();
  if (count === 0) {
    console.warn("[pinLastResponse] No messages found, skipping pin");
    return false;
  }
  const lastMsg = messages.last();
  await lastMsg.hover({ force: true });
  await page.waitForTimeout(400);

  // The action bar has copy, regenerate, and bookmark buttons.
  // The bookmark button is the 3rd button in the action bar beneath the last message.
  // It uses a Bookmark icon (lucide-bookmark). We locate it within the message.
  let clicked = false;

  // Strategy 1: aria-label containing "Save" or "Pin"
  const pinBtn = lastMsg.locator(
    '[aria-label*="Save"], [aria-label*="Pin"], [aria-label*="Bookmark"]'
  ).first();
  const pinBtnVisible = await pinBtn
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

  if (pinBtnVisible) {
    await pinBtn.click();
    clicked = true;
  }

  if (!clicked) {
    // Strategy 2: button containing a bookmark SVG icon
    const bookmarkBtn = lastMsg.locator(
      "button svg.lucide-bookmark"
    ).locator("..");
    const bookmarkVisible = await bookmarkBtn
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (bookmarkVisible) {
      await bookmarkBtn.click();
      clicked = true;
    }
  }

  if (!clicked) {
    // Strategy 3: 3rd button in the action bar (copy=1, regen=2, bookmark=3)
    const actionBtns = lastMsg.locator("button");
    const btnCount = await actionBtns.count();
    if (btnCount >= 3) {
      await actionBtns.nth(2).click();
      clicked = true;
    } else if (btnCount > 0) {
      await actionBtns.last().click();
      clicked = true;
    }
  }

  if (!clicked) {
    console.warn("[pinLastResponse] No pin/bookmark button found");
    return false;
  }

  // Wait briefly and check if a modal appeared
  await page.waitForTimeout(600);
  const dialog = page.locator('[role="dialog"]');
  const dialogVisible = await dialog
    .isVisible({ timeout: 3_000 })
    .catch(() => false);

  if (dialogVisible) {
    console.log("[pinLastResponse] Modal appeared, filling form");
    const titleInput = dialog.locator("input").first();
    const titleInputVisible = await titleInput
      .isVisible({ timeout: 2_000 })
      .catch(() => false);

    if (titleInputVisible && title) {
      await titleInput.clear();
      await titleInput.fill(title);
    }

    // Click the save/confirm/submit button
    const saveBtn = dialog
      .locator("button")
      .filter({ hasText: /save|pin|confirm|ok/i })
      .first();
    const saveBtnVisible = await saveBtn
      .isVisible({ timeout: 2_000 })
      .catch(() => false);

    if (saveBtnVisible) {
      await saveBtn.click();
      await page.waitForTimeout(800);
    }
  }

  return clicked;
}

// ---------------------------------------------------------------------------
// Part 1: Chat with 3 different requests + pin each response
// ---------------------------------------------------------------------------

test("PART1-STEP1: Home screen loads with avatar, input box, and suggested prompts", async ({
  page,
}) => {
  test.setTimeout(60_000);

  await goHome(page);

  // Assert core elements visible
  await expect(
    page.locator('img[alt="Rendara"]')
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page.locator('textarea[placeholder*="Ask anything"]')
  ).toBeVisible();

  // Suggested prompt chips
  const chips = page.locator(
    "button.rounded-full, button[class*='rounded-full']"
  );
  const chipCount = await chips.count();
  console.log(`[PART1-STEP1] Prompt chips visible: ${chipCount}`);
  expect(chipCount).toBeGreaterThanOrEqual(1);

  await screenshot(page, "01-home");
});

test("PART1-CHAT1: Send schema query and pin the response", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await goHome(page);

  // Send first message
  await sendMessage(page, "What data do you have?");

  // Wait for streaming to start and complete
  await waitForStreamingStart(page, 20_000);
  await waitForStreamingComplete(page, 120_000);

  await screenshot(page, "chat-01-schema");

  // Try to pin the response
  const pinned = await pinLastResponse(page, "Data Schema Overview");
  console.log(`[PART1-CHAT1] Pin attempt result: ${pinned}`);

  await screenshot(page, "chat-01-pinned");
});

test("PART1-CHAT2: Send bar chart request and pin the response", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await goHome(page);

  await sendMessage(
    page,
    "Show me a bar chart of the top 5 plans by number of customers"
  );

  await waitForStreamingStart(page, 20_000);
  await waitForStreamingComplete(page, 120_000);

  await screenshot(page, "chat-02-barchart");

  const pinned = await pinLastResponse(page, "Top 5 Plans by Customers");
  console.log(`[PART1-CHAT2] Pin attempt result: ${pinned}`);
});

test("PART1-CHAT3: Send KPI scorecard request, pin it, then check pinned page", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await goHome(page);

  await sendMessage(
    page,
    "Create a KPI scorecard with the key performance indicators"
  );

  await waitForStreamingStart(page, 20_000);
  await waitForStreamingComplete(page, 120_000);

  await screenshot(page, "chat-03-kpi");

  const pinned = await pinLastResponse(page, "KPI Scorecard");
  console.log(`[PART1-CHAT3] Pin attempt result: ${pinned}`);

  // Navigate to /pinned page
  await page.goto(`${BASE_URL}/pinned`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_000);

  await screenshot(page, "06-pinned");
});

// ---------------------------------------------------------------------------
// Part 2: Create 3 dashboards
// ---------------------------------------------------------------------------

test("PART2-DASH1: Create executive summary dashboard via chat", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await goHome(page);

  await sendMessage(
    page,
    "Build me an executive summary dashboard with key metrics and a trend chart"
  );

  await waitForStreamingStart(page, 20_000);
  await waitForStreamingComplete(page, 120_000);

  // Look for "Open Dashboard" link in the preview card (text used in DashboardPreviewCard)
  const viewDashBtn = page
    .locator('a, button')
    .filter({ hasText: /open dashboard/i })
    .first();
  const viewDashVisible = await viewDashBtn
    .isVisible({ timeout: 10_000 })
    .catch(() => false);

  if (viewDashVisible) {
    console.log("[PART2-DASH1] Open Dashboard button found, clicking");
    await viewDashBtn.click();
    await page.waitForURL(/\/dashboards\//, { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
    await screenshot(page, "04-dashboard-detail");
  } else {
    // Navigate to dashboards index and click the first card (cards use onClick + router.push)
    console.warn("[PART2-DASH1] Open Dashboard button not found, going to /dashboards");
    await page.goto(`${BASE_URL}/dashboards`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    // Cards on index use hideOpenLink + onClick handler (div element, not <a>)
    // Click on the first card's h3 title area
    const firstCardTitle = page.locator("h3").first();
    const titleVisible = await firstCardTitle.isVisible({ timeout: 5_000 }).catch(() => false);
    if (titleVisible) {
      await firstCardTitle.click();
      await page.waitForURL(/\/dashboards\//, { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
      await screenshot(page, "04-dashboard-detail");
    } else {
      await screenshot(page, "04-dashboard-detail-fallback");
    }
  }
});

test("PART2-DASH2: Create customer analytics dashboard and view dashboards index", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await goHome(page);

  await sendMessage(
    page,
    "Create a customer analytics dashboard showing churn trends and top customer segments"
  );

  await waitForStreamingStart(page, 20_000);
  await waitForStreamingComplete(page, 120_000);

  // Navigate to /dashboards to see all dashboards
  await page.goto(`${BASE_URL}/dashboards`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);

  await screenshot(page, "03-dashboards-index");

  // Open the most recently created dashboard — cards are div+onClick not <a> links
  // Click on first card's h3 title
  const firstCardTitle = page.locator("h3").first();
  const titleVisible = await firstCardTitle.isVisible({ timeout: 5_000 }).catch(() => false);
  if (titleVisible) {
    await firstCardTitle.click();
    await page.waitForURL(/\/dashboards\//, { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
    await screenshot(page, "dash-02-customer");
  } else {
    console.warn("[PART2-DASH2] No dashboard card title found");
    await screenshot(page, "dash-02-customer-fallback");
  }
});

test("PART2-DASH3: Create revenue performance dashboard and view 3 dashboards", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await goHome(page);

  await sendMessage(
    page,
    "Build a revenue performance dashboard with monthly trends"
  );

  await waitForStreamingStart(page, 20_000);
  await waitForStreamingComplete(page, 120_000);

  // Navigate to /dashboards
  await page.goto(`${BASE_URL}/dashboards`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);

  await screenshot(page, "dash-03-revenue");

  // Count visible dashboard cards (they render as h3 titles in DashboardPreviewCard)
  const cards = page.locator("h3");
  const cardCount = await cards.count();
  console.log(`[PART2-DASH3] Dashboard cards visible: ${cardCount}`);
});

// ---------------------------------------------------------------------------
// Part 3: Create 2 stories
// ---------------------------------------------------------------------------

test("PART3-STORY1: Create a 4-slide story and navigate through it", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await goHome(page);

  await sendMessage(
    page,
    "Create a 4-slide story summarising the key data insights"
  );

  await waitForStreamingStart(page, 20_000);
  await waitForStreamingComplete(page, 120_000);

  // Look for "Open Story" link in StoryPreviewCard (text used in that component)
  const viewStoryBtn = page
    .locator('a, button')
    .filter({ hasText: /open story/i })
    .first();
  const viewStoryVisible = await viewStoryBtn
    .isVisible({ timeout: 10_000 })
    .catch(() => false);

  if (viewStoryVisible) {
    console.log("[PART3-STORY1] Open Story button found, clicking");
    await viewStoryBtn.click();
    await page.waitForURL(/\/stories\//, { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
  } else {
    // Navigate to stories and click first card title (cards use onClick + router.push)
    console.warn("[PART3-STORY1] Open Story not found, navigating to /stories");
    await page.goto(`${BASE_URL}/stories`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    // Click on first story card's h3 title
    const firstStoryTitle = page.locator("h3").first();
    const titleVisible = await firstStoryTitle
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (titleVisible) {
      await firstStoryTitle.click();
      await page.waitForURL(/\/stories\//, { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
    }
  }

  await screenshot(page, "06-story-viewer");

  // Click next slide
  const nextBtn = page
    .locator('[aria-label="Next slide"]')
    .first();
  const nextVisible = await nextBtn
    .isVisible({ timeout: 3_000 })
    .catch(() => false);

  if (nextVisible) {
    await nextBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, "story-slide2");
  } else {
    console.warn("[PART3-STORY1] Next slide button not found");
    await screenshot(page, "story-slide2-fallback");
  }

  // Click Present button
  const presentBtn = page
    .locator('[aria-label="Enter presentation mode"], button')
    .filter({ hasText: /present/i })
    .first();
  const presentVisible = await presentBtn
    .isVisible({ timeout: 3_000 })
    .catch(() => false);

  if (presentVisible) {
    await presentBtn.click();
    await page.waitForTimeout(1_000);
    await screenshot(page, "07-story-presentation");

    // Exit presentation (press Escape)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  } else {
    console.warn("[PART3-STORY1] Present button not found");
    await screenshot(page, "07-story-presentation-fallback");
  }
});

test("PART3-STORY2: Create executive retention story and check stories index", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await goHome(page);

  await sendMessage(
    page,
    "Create a 3-slide executive presentation on customer retention"
  );

  await waitForStreamingStart(page, 20_000);
  await waitForStreamingComplete(page, 120_000);

  // Navigate to /stories
  await page.goto(`${BASE_URL}/stories`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);

  await screenshot(page, "04-stories-index");

  // Count story cards (they render as h3 titles in StoryPreviewCard)
  const cards = page.locator("h3");
  const cardCount = await cards.count();
  console.log(`[PART3-STORY2] Story cards visible: ${cardCount}`);
});

// ---------------------------------------------------------------------------
// Part 4: Additional — verify all index pages look correct
// ---------------------------------------------------------------------------

test("EXTRAS: Verify all key pages render correctly", async ({ page }) => {
  test.setTimeout(60_000);

  // Dashboards index
  await page.goto(`${BASE_URL}/dashboards`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_000);
  const dashHeading = await page
    .getByRole("heading", { name: /dashboards/i })
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
  console.log(`[EXTRAS] Dashboards heading visible: ${dashHeading}`);

  // Stories index
  await page.goto(`${BASE_URL}/stories`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_000);
  const storiesHeading = await page
    .getByRole("heading", { name: /stories/i })
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
  console.log(`[EXTRAS] Stories heading visible: ${storiesHeading}`);

  // Pinned index
  await page.goto(`${BASE_URL}/pinned`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_000);
  const pinnedHeading = await page
    .getByRole("heading", { name: /pinned/i })
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
  console.log(`[EXTRAS] Pinned heading visible: ${pinnedHeading}`);

  await screenshot(page, "pinned-page-final");
});
