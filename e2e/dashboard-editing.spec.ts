/**
 * Dashboard Editing E2E Tests — DASH-EDIT-1 through DASH-EDIT-6
 *
 * Tests:
 *   - Inline title editing (click h1 → input → type → Enter/blur → PATCH)
 *   - AgentChatPanel expand/collapse behaviour
 *   - AgentChatPanel content when expanded
 *   - Dashboard canvas renders tiles
 *   - Empty dashboard shows empty state
 *   - "Agent created" badge visible
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
  deleteResource,
  DashboardDetailPage,
} from "./helpers/page-objects";

test.describe("Dashboard Editing", () => {
  // ---------------------------------------------------------------------------
  // DASH-EDIT-1: Inline title edit — click title → type → Enter → title updates
  // ---------------------------------------------------------------------------

  test("DASH-EDIT-1: Inline title edit with Enter key", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const dashboard = await createTestDashboard(request, {
      title: "Original Title",
      layout_json: [
        { id: "t1", type: "text", content: "Content", x: 5, y: 5, w: 40, h: 40 },
      ],
    });

    try {
      await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
        waitUntil: "domcontentloaded",
      });

      // Wait for title to be visible
      const titleH1 = page.locator("h1").filter({ hasText: "Original Title" });
      await expect(titleH1).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

      // Click the title to enter edit mode
      await titleH1.click();

      // Input should appear
      const titleInput = page.locator('input[type="text"]').first();
      await expect(titleInput).toBeVisible({ timeout: TIMEOUT.animation });
      await expect(titleInput).toBeFocused();

      // Clear and type new title
      await titleInput.fill("Updated Title via Enter");
      await page.keyboard.press("Enter");

      // Title should update in the h1
      await expect(
        page.locator("h1").filter({ hasText: "Updated Title via Enter" })
      ).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

      // Verify the PATCH was sent by re-fetching
      const res = await request.get(
        `${BACKEND_URL}/api/dashboards/${dashboard.id}`
      );
      const data = await res.json();
      expect(data.title).toBe("Updated Title via Enter");

      await page.screenshot({
        path: "test-screenshots/dash-edit-1-title-enter.png",
      });
    } finally {
      await deleteResource(request, `/api/dashboards/${dashboard.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // DASH-EDIT-2: Inline title edit — type → blur → title updates
  // ---------------------------------------------------------------------------

  test("DASH-EDIT-2: Inline title edit with blur", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const dashboard = await createTestDashboard(request, {
      title: "Blur Test Title",
      layout_json: [
        { id: "t1", type: "text", content: "Content", x: 5, y: 5, w: 40, h: 40 },
      ],
    });

    try {
      await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
        waitUntil: "domcontentloaded",
      });

      const titleH1 = page.locator("h1").filter({ hasText: "Blur Test Title" });
      await expect(titleH1).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

      // Click to edit
      await titleH1.click();
      const titleInput = page.locator('input[type="text"]').first();
      await expect(titleInput).toBeVisible({ timeout: TIMEOUT.animation });

      // Type new title and blur
      await titleInput.fill("Updated via Blur");
      await page.locator("body").click(); // blur

      // Title should update
      await expect(
        page.locator("h1").filter({ hasText: "Updated via Blur" })
      ).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

      // Verify the PATCH
      const res = await request.get(
        `${BACKEND_URL}/api/dashboards/${dashboard.id}`
      );
      const data = await res.json();
      expect(data.title).toBe("Updated via Blur");

      await page.screenshot({
        path: "test-screenshots/dash-edit-2-title-blur.png",
      });
    } finally {
      await deleteResource(request, `/api/dashboards/${dashboard.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // DASH-EDIT-3: AgentChatPanel expand/collapse cycle
  // ---------------------------------------------------------------------------

  test("DASH-EDIT-3: AgentChatPanel expand and collapse", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const dashboard = await createTestDashboard(request, {
      title: "Panel Test Dashboard",
    });

    try {
      await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page.locator("h1")).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      // Panel starts collapsed
      const expandBtn = DashboardDetailPage.agentPanelCollapsed(page);
      await expect(expandBtn).toBeVisible({ timeout: TIMEOUT.animation });

      // "Agent Chat" heading should NOT be visible when collapsed
      await expect(page.getByText("Agent Chat")).not.toBeVisible();

      // Expand
      await expandBtn.click();
      await expect(page.getByText("Agent Chat")).toBeVisible({
        timeout: TIMEOUT.animation,
      });

      // Content placeholder text is visible
      await expect(
        page.getByText("Chat with the agent to modify this content.")
      ).toBeVisible({ timeout: TIMEOUT.animation });

      // Collapse
      const collapseBtn = DashboardDetailPage.agentPanelExpanded(page);
      await collapseBtn.click();
      await expect(page.getByText("Agent Chat")).not.toBeVisible({
        timeout: TIMEOUT.animation,
      });

      await page.screenshot({
        path: "test-screenshots/dash-edit-3-panel.png",
      });
    } finally {
      await deleteResource(request, `/api/dashboards/${dashboard.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // DASH-EDIT-4: Dashboard canvas renders tiles
  // ---------------------------------------------------------------------------

  test("DASH-EDIT-4: Dashboard canvas renders seeded tiles", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const dashboard = await createTestDashboard(request, {
      title: "Canvas Tiles Test",
      layout_json: [
        { id: "t1", type: "text", content: "Tile A", x: 2, y: 2, w: 30, h: 30 },
        { id: "t2", type: "text", content: "Tile B", x: 50, y: 2, w: 30, h: 30 },
      ],
    });

    try {
      await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page.locator("h1").filter({ hasText: "Canvas Tiles Test" })).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      // The "no tiles" empty state should NOT be visible
      await expect(
        page.getByText("This dashboard has no tiles yet.")
      ).not.toBeVisible();

      // Canvas container (16:9 aspect ratio) should be visible
      const canvas = page.locator('[style*="aspect"]');
      await expect(canvas.first()).toBeVisible({ timeout: TIMEOUT.animation });

      await page.screenshot({
        path: "test-screenshots/dash-edit-4-canvas.png",
      });
    } finally {
      await deleteResource(request, `/api/dashboards/${dashboard.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // DASH-EDIT-5: Empty dashboard shows empty state
  // ---------------------------------------------------------------------------

  test("DASH-EDIT-5: Empty dashboard shows empty state", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const dashboard = await createTestDashboard(request, {
      title: "Empty Dashboard",
      layout_json: [],
    });

    try {
      await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page.locator("h1").filter({ hasText: "Empty Dashboard" })).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      // Empty state message
      await expect(
        page.getByText("This dashboard has no tiles yet.")
      ).toBeVisible({ timeout: TIMEOUT.animation });
      await expect(
        page.getByText("Ask the agent to add content.")
      ).toBeVisible({ timeout: TIMEOUT.animation });

      await page.screenshot({
        path: "test-screenshots/dash-edit-5-empty.png",
      });
    } finally {
      await deleteResource(request, `/api/dashboards/${dashboard.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // DASH-EDIT-6: "Agent created" badge visible
  // ---------------------------------------------------------------------------

  test("DASH-EDIT-6: Agent created badge is visible", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const dashboard = await createTestDashboard(request, {
      title: "Badge Test Dashboard",
    });

    try {
      await page.goto(`${BASE_URL}/dashboards/${dashboard.id}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page.locator("h1")).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      await expect(page.getByText("Agent created")).toBeVisible();

      await page.screenshot({
        path: "test-screenshots/dash-edit-6-badge.png",
      });
    } finally {
      await deleteResource(request, `/api/dashboards/${dashboard.id}`);
    }
  });
});
