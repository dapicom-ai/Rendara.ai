/**
 * LLM Tool Call E2E Tests — LLM-TC-1 through LLM-TC-4
 *
 * These tests require a RUNNING LLM backend (OpenRouter) and use long timeouts.
 * They verify that the LLM actually calls tool functions when prompted.
 *
 * Tests:
 *   - Ask LLM to create a dashboard → create_dashboard tool called → DashboardPreviewCard appears
 *   - Click "Open Dashboard" → navigates to /dashboards/{id}
 *   - Ask LLM to create a story → create_story tool called → StoryPreviewCard appears
 *   - Click "Open Story" → navigates to /stories/{id}
 *
 * Frontend: http://localhost:3000
 * Backend:  http://localhost:8001
 *
 * NOTE: These tests are inherently non-deterministic since they depend on LLM behaviour.
 * They use generous timeouts and retry logic.
 */

import { test, expect } from "@playwright/test";
import {
  BASE_URL,
  BACKEND_URL,
  TIMEOUT,
  deleteResource,
  waitForStreamingComplete,
  waitForStreamingStart,
  HomePage,
} from "./helpers/page-objects";

test.describe("LLM Tool Calls", () => {
  // ---------------------------------------------------------------------------
  // LLM-TC-1: Ask to create a dashboard → tool call indicator → preview card
  // ---------------------------------------------------------------------------

  test("LLM-TC-1: Create dashboard via chat → DashboardPreviewCard appears", async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000); // 3 minutes for LLM + tool execution

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    const textarea = HomePage.textarea(page);
    await expect(textarea).toBeVisible({ timeout: TIMEOUT.navigation });

    // Ask the LLM to create a dashboard
    await textarea.fill(
      "Create a simple dashboard with two text tiles. The first tile should say 'Revenue: $1M' and the second should say 'Users: 5000'."
    );
    await page.keyboard.press("Enter");

    await waitForStreamingStart(page, 15_000);

    // Wait for tool call indicator to appear (create_dashboard)
    const toolIndicator = page.locator("span").filter({ hasText: /create_dashboard/i });
    await expect(toolIndicator.first()).toBeVisible({ timeout: TIMEOUT.toolCall });

    // Wait for streaming to complete (tool execution + response)
    await waitForStreamingComplete(page, 120_000);

    // DashboardPreviewCard should appear with "Open Dashboard" link
    const openDashLink = page.locator("a").filter({ hasText: /open dashboard/i });
    await expect(openDashLink.first()).toBeVisible({ timeout: TIMEOUT.toolCall });

    // Extract the dashboard ID from the link href
    const href = await openDashLink.first().getAttribute("href");
    expect(href).toMatch(/^\/dashboards\/.+/);
    const dashboardId = href?.replace("/dashboards/", "") ?? "";

    await page.screenshot({
      path: "test-screenshots/llm-tc-1-dashboard-created.png",
    });

    // Cleanup
    if (dashboardId) {
      await deleteResource(request, `/api/dashboards/${dashboardId}`);
    }
  });

  // ---------------------------------------------------------------------------
  // LLM-TC-2: Click "Open Dashboard" link → navigates to dashboard detail
  // ---------------------------------------------------------------------------

  test("LLM-TC-2: Click Open Dashboard → navigates to dashboard detail", async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    const textarea = HomePage.textarea(page);
    await expect(textarea).toBeVisible({ timeout: TIMEOUT.navigation });

    await textarea.fill(
      "Create a dashboard with one tile that says 'Hello from E2E'."
    );
    await page.keyboard.press("Enter");

    await waitForStreamingStart(page, 15_000);
    await waitForStreamingComplete(page, 120_000);

    const openDashLink = page.locator("a").filter({ hasText: /open dashboard/i });
    await expect(openDashLink.first()).toBeVisible({ timeout: TIMEOUT.toolCall });

    const href = await openDashLink.first().getAttribute("href");
    const dashboardId = href?.replace("/dashboards/", "") ?? "";

    // Click the link
    await openDashLink.first().click();

    // Should navigate to the dashboard detail page
    await expect(page).toHaveURL(/\/dashboards\//, { timeout: TIMEOUT.navigation });

    // Dashboard detail should load with h1 title
    await expect(page.locator("h1")).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.screenshot({
      path: "test-screenshots/llm-tc-2-dashboard-detail.png",
    });

    // Cleanup
    if (dashboardId) {
      await deleteResource(request, `/api/dashboards/${dashboardId}`);
    }
  });

  // ---------------------------------------------------------------------------
  // LLM-TC-3: Ask to create a story → tool call indicator → preview card
  // ---------------------------------------------------------------------------

  test("LLM-TC-3: Create story via chat → StoryPreviewCard appears", async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    const textarea = HomePage.textarea(page);
    await expect(textarea).toBeVisible({ timeout: TIMEOUT.navigation });

    await textarea.fill(
      "Create a story about customer growth with 3 slides: Introduction, Growth Metrics, and Conclusion."
    );
    await page.keyboard.press("Enter");

    await waitForStreamingStart(page, 15_000);

    // Wait for tool call indicator
    const toolIndicator = page.locator("span").filter({ hasText: /create_story/i });
    await expect(toolIndicator.first()).toBeVisible({ timeout: TIMEOUT.toolCall });

    await waitForStreamingComplete(page, 120_000);

    // StoryPreviewCard should appear with "Open Story" link
    const openStoryLink = page.locator("a").filter({ hasText: /open story/i });
    await expect(openStoryLink.first()).toBeVisible({ timeout: TIMEOUT.toolCall });

    // Verify link points to /stories/{id}
    const href = await openStoryLink.first().getAttribute("href");
    expect(href).toMatch(/^\/stories\/.+/);
    const storyId = href?.replace("/stories/", "") ?? "";

    await page.screenshot({
      path: "test-screenshots/llm-tc-3-story-created.png",
    });

    // Cleanup
    if (storyId) {
      await deleteResource(request, `/api/stories/${storyId}`);
    }
  });

  // ---------------------------------------------------------------------------
  // LLM-TC-4: Click "Open Story" link → navigates to story detail
  // ---------------------------------------------------------------------------

  test("LLM-TC-4: Click Open Story → navigates to story detail", async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    const textarea = HomePage.textarea(page);
    await expect(textarea).toBeVisible({ timeout: TIMEOUT.navigation });

    await textarea.fill(
      "Create a story with 2 slides about data analysis best practices."
    );
    await page.keyboard.press("Enter");

    await waitForStreamingStart(page, 15_000);
    await waitForStreamingComplete(page, 120_000);

    const openStoryLink = page.locator("a").filter({ hasText: /open story/i });
    await expect(openStoryLink.first()).toBeVisible({ timeout: TIMEOUT.toolCall });

    const href = await openStoryLink.first().getAttribute("href");
    const storyId = href?.replace("/stories/", "") ?? "";

    // Click the link
    await openStoryLink.first().click();

    // Should navigate to story detail
    await expect(page).toHaveURL(/\/stories\//, { timeout: TIMEOUT.navigation });

    // Story detail should load with h1 title
    await expect(page.locator("h1")).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.screenshot({
      path: "test-screenshots/llm-tc-4-story-detail.png",
    });

    // Cleanup
    if (storyId) {
      await deleteResource(request, `/api/stories/${storyId}`);
    }
  });
});
