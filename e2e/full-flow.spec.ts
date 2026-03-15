/**
 * Full Flow E2E Tests — FLOW-1 through FLOW-6
 *
 * Complete end-to-end demo flow:
 *   Home → chat → send message → streaming response → navigate sidebar →
 *   dashboard detail → AgentChatPanel → pin response → view in /pinned
 *
 * Frontend: http://localhost:3000
 * Backend:  http://localhost:8001
 */

import { test, expect } from "@playwright/test";
import {
  BASE_URL,
  BACKEND_URL,
  TIMEOUT,
  createTestDashboard,
  createTestStory,
  createTestPinned,
  deleteResource,
  waitForStreamingComplete,
  waitForStreamingStart,
  HomePage,
  Sidebar,
  PinnedPage,
  DashboardDetailPage,
  StoryDetailPage,
} from "./helpers/page-objects";

// ---------------------------------------------------------------------------
// FLOW-1: Home → type message → streaming response → message log populated
// ---------------------------------------------------------------------------

test.describe("Full Flow", () => {
  test("FLOW-1: Home → chat → streaming response completes", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    // Home renders with hero title
    await expect(HomePage.heroTitle(page)).toBeVisible({
      timeout: TIMEOUT.navigation,
    });

    // Suggested prompt chips are visible
    const chips = page.locator("button").filter({ hasText: /revenue|profit|customer|acquisition/i });
    await expect(chips.first()).toBeVisible({ timeout: TIMEOUT.navigation });

    // Type a message and submit
    const textarea = HomePage.textarea(page);
    await expect(textarea).toBeVisible({ timeout: TIMEOUT.navigation });
    await textarea.fill("What is the total number of customers?");
    await page.keyboard.press("Enter");

    // Streaming begins (stop button appears or message log gets content)
    await waitForStreamingStart(page, 15_000);

    // Wait for streaming to complete
    await waitForStreamingComplete(page, TIMEOUT.chatStream);

    // Message log has substantive content
    const messageLog = page.locator('[role="log"]');
    await expect(messageLog).toBeVisible();
    const logText = await messageLog.textContent();
    expect((logText ?? "").length).toBeGreaterThan(10);

    await page.screenshot({ path: "test-screenshots/flow-1-chat.png" });
  });

  // ---------------------------------------------------------------------------
  // FLOW-2: Sidebar navigation works across all routes
  // ---------------------------------------------------------------------------

  test("FLOW-2: Navigate via sidebar to all main routes", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    // Home page loads
    await expect(HomePage.heroTitle(page)).toBeVisible({
      timeout: TIMEOUT.navigation,
    });

    // Navigate to Dashboards
    await Sidebar.dashboardsLink(page).click();
    await expect(page).toHaveURL(/\/dashboards/, { timeout: TIMEOUT.navigation });
    await expect(
      page.getByRole("heading", { name: /dashboards/i })
    ).toBeVisible({ timeout: TIMEOUT.navigation });

    // Navigate to Stories
    await Sidebar.storiesLink(page).click();
    await expect(page).toHaveURL(/\/stories/, { timeout: TIMEOUT.navigation });
    await expect(
      page.getByRole("heading", { name: /stories/i })
    ).toBeVisible({ timeout: TIMEOUT.navigation });

    // Navigate to Pinned
    await Sidebar.pinnedLink(page).click();
    await expect(page).toHaveURL(/\/pinned/, { timeout: TIMEOUT.navigation });
    await expect(
      page.getByRole("heading", { name: /pinned responses/i })
    ).toBeVisible({ timeout: TIMEOUT.navigation });

    // Navigate back to Conversations (home)
    await Sidebar.conversationsLink(page).click();
    await expect(page).toHaveURL(/^\/$|localhost:3000\/$/, {
      timeout: TIMEOUT.navigation,
    });

    await page.screenshot({ path: "test-screenshots/flow-2-nav.png" });
  });

  // ---------------------------------------------------------------------------
  // FLOW-3: Dashboard detail → AgentChatPanel expand/collapse
  // ---------------------------------------------------------------------------

  test("FLOW-3: Dashboard detail → AgentChatPanel toggle", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    // Seed a dashboard
    const dashboard = await createTestDashboard(request, {
      title: "FLOW-3 Dashboard",
      layout_json: [
        { id: "t1", type: "text", content: "Hello world", x: 5, y: 5, w: 40, h: 40 },
      ],
    });

    try {
      await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
        waitUntil: "domcontentloaded",
      });

      // Title visible
      await expect(page.locator("h1").filter({ hasText: "FLOW-3 Dashboard" })).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      // Agent badge visible
      await expect(page.getByText("Agent created")).toBeVisible();

      // Panel starts collapsed — expand button visible
      const expandBtn = DashboardDetailPage.agentPanelCollapsed(page);
      await expect(expandBtn).toBeVisible({ timeout: TIMEOUT.animation });

      // Click to expand
      await expandBtn.click();

      // "Agent Chat" heading appears
      await expect(page.getByText("Agent Chat")).toBeVisible({
        timeout: TIMEOUT.animation,
      });

      // Collapse button now visible
      const collapseBtn = DashboardDetailPage.agentPanelExpanded(page);
      await expect(collapseBtn).toBeVisible({ timeout: TIMEOUT.animation });

      // Click to collapse
      await collapseBtn.click();

      // "Agent Chat" heading should disappear
      await expect(page.getByText("Agent Chat")).not.toBeVisible({
        timeout: TIMEOUT.animation,
      });

      await page.screenshot({ path: "test-screenshots/flow-3-panel.png" });
    } finally {
      await deleteResource(request, `/api/dashboards/${dashboard.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // FLOW-4: Chat → pin response → verify in /pinned
  // ---------------------------------------------------------------------------

  test("FLOW-4: Chat → pin a response → card appears in /pinned", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    // Send a message to get an assistant response
    const textarea = HomePage.textarea(page);
    await expect(textarea).toBeVisible({ timeout: TIMEOUT.navigation });
    await textarea.fill("Say hello and tell me a short fact about data.");
    await page.keyboard.press("Enter");

    await waitForStreamingStart(page, 15_000);
    await waitForStreamingComplete(page, TIMEOUT.chatStream);

    // Hover over the assistant message to reveal action bar
    const assistantMessages = page.locator('[data-message-role="assistant"], .group\\/message').last();
    await assistantMessages.hover();

    // Wait for the pin button (bookmark icon) to become visible
    const pinButton = page.locator('[aria-label="Save response"]');
    await expect(pinButton.first()).toBeVisible({ timeout: TIMEOUT.modal });

    // Click the pin button
    await pinButton.first().click();

    // "Save Response" modal should open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: TIMEOUT.modal });
    await expect(
      dialog.getByText("Save Response")
    ).toBeVisible({ timeout: TIMEOUT.modal });

    // Title should be auto-filled (from the first text snippet)
    const titleInput = dialog.locator('input').first();
    await expect(titleInput).toBeVisible();
    const autoTitle = await titleInput.inputValue();
    expect(autoTitle.length).toBeGreaterThan(0);

    // Optionally fill description
    const descInput = dialog.locator('input[placeholder="Add a description..."]');
    if (await descInput.isVisible()) {
      await descInput.fill("E2E test pin description");
    }

    // Click Save
    const saveButton = dialog.locator("button").filter({ hasText: /^Save$/ });
    await saveButton.click();

    // "Saved" confirmation
    await expect(
      dialog.getByText(/saved/i)
    ).toBeVisible({ timeout: TIMEOUT.modal });

    // Modal closes after timeout
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    // Navigate to /pinned and verify the card is there
    await Sidebar.pinnedLink(page).click();
    await expect(page).toHaveURL(/\/pinned/, { timeout: TIMEOUT.navigation });
    await expect(
      PinnedPage.heading(page)
    ).toBeVisible({ timeout: TIMEOUT.navigation });

    // At least one card should be present (the one we just pinned)
    const cards = page.locator("h3");
    await expect(cards.first()).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

    await page.screenshot({ path: "test-screenshots/flow-4-pinned.png" });
  });

  // ---------------------------------------------------------------------------
  // FLOW-5: Seed story → navigate to detail → slide nav → back to index
  // ---------------------------------------------------------------------------

  test("FLOW-5: Story detail → slide navigation → back to index", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const story = await createTestStory(request, {
      title: "FLOW-5 Story",
      slides_json: [
        { id: "s1", title: "Introduction", content: "Welcome to the story." },
        { id: "s2", title: "Analysis", content: "Here is the analysis." },
        { id: "s3", title: "Conclusion", content: "In conclusion..." },
      ],
    });

    try {
      await page.goto(`${BASE_URL}/stories/${story.id}`, {
        waitUntil: "domcontentloaded",
      });

      // Title visible
      await expect(page.locator("h1").filter({ hasText: "FLOW-5 Story" })).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      // Slide counter shows "1 / 3"
      const counter = StoryDetailPage.slideCounter(page);
      await expect(counter.first()).toBeVisible({ timeout: TIMEOUT.animation });
      await expect(counter.first()).toHaveText(/1\s*\/\s*3/);

      // Next button advances
      const nextBtn = StoryDetailPage.nextButton(page);
      await nextBtn.click();
      await expect(counter.first()).toHaveText(/2\s*\/\s*3/, {
        timeout: TIMEOUT.animation,
      });

      // Back button
      const backBtn = StoryDetailPage.backButton(page);
      await backBtn.click();

      await page.screenshot({ path: "test-screenshots/flow-5-story.png" });
    } finally {
      await deleteResource(request, `/api/stories/${story.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // FLOW-6: Pinned page empty state when no items
  // ---------------------------------------------------------------------------

  test("FLOW-6: Pinned page shows empty state when no pinned items", async ({
    page,
    request,
  }) => {
    test.setTimeout(30_000);

    // First, delete all existing pinned items
    const listRes = await request.get(`${BACKEND_URL}/api/pinned`);
    if (listRes.ok()) {
      const items = await listRes.json();
      for (const item of items) {
        await deleteResource(request, `/api/pinned/${item.id}`);
      }
    }

    await page.goto(`${BASE_URL}/pinned`, { waitUntil: "domcontentloaded" });

    await expect(PinnedPage.heading(page)).toBeVisible({
      timeout: TIMEOUT.navigation,
    });

    // Empty state text
    await expect(PinnedPage.emptyStateTitle(page)).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.screenshot({ path: "test-screenshots/flow-6-empty-pinned.png" });
  });
});
