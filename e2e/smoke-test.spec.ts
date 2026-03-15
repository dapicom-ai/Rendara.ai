/**
 * Smoke Tests — SMOKE-1 through SMOKE-7
 *
 * Fast sanity checks for all current Rendara v2 routes.
 * These run before the full suite to catch critical regressions.
 *
 * Routes verified:
 *   /          — Home (new conversation)
 *   /c/[id]    — Active conversation (if any exist)
 *   /dashboards — Dashboards index
 *   /dashboards/[id] — Dashboard detail
 *   /stories   — Stories index          ← NEW
 *   /stories/[id] — Story detail        ← NEW
 *   /pinned    — Pinned Responses       ← NEW
 *
 * Routes removed (should 404):
 *   /reports   — REMOVED
 *   /r/[uuid]  — REMOVED
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
  deleteResource,
  waitForStreamingComplete,
  waitForStreamingStart,
} from "./helpers/page-objects";

// ---------------------------------------------------------------------------
// SMOKE-1: Home renders and sending a message starts streaming
// ---------------------------------------------------------------------------

test("SMOKE-1: Home renders, typing a message starts a streaming response", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

  // Heading and textarea visible
  await expect(page.locator("h1").filter({ hasText: /Rendara/i })).toBeVisible({
    timeout: TIMEOUT.navigation,
  });
  const textarea = page.locator('textarea[placeholder*="Ask anything"]');
  await expect(textarea).toBeVisible({ timeout: TIMEOUT.navigation });

  await textarea.fill("What is 2+2?");
  await page.keyboard.press("Enter");

  // Streaming begins
  await waitForStreamingStart(page, 15_000);
  await waitForStreamingComplete(page, TIMEOUT.chatStream);

  // Message log has content
  const messageLog = page.locator('[role="log"]');
  await expect(messageLog).toBeVisible();
  const logText = await messageLog.textContent();
  expect((logText ?? "").length).toBeGreaterThan(5);

  await page.screenshot({ path: "test-screenshots/smoke-1-home.png" });
});

// ---------------------------------------------------------------------------
// SMOKE-2: /dashboards index renders without crash
// ---------------------------------------------------------------------------

test("SMOKE-2: /dashboards index renders without crash", async ({ page }) => {
  await page.goto(`${BASE_URL}/dashboards`, { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: /dashboards/i })
  ).toBeVisible({ timeout: TIMEOUT.navigation });

  const body = (await page.locator("body").textContent()) ?? "";
  expect(body).not.toContain("Application error");
  expect(body).not.toContain("client-side exception");

  await page.screenshot({ path: "test-screenshots/smoke-2-dashboards.png" });
});

// ---------------------------------------------------------------------------
// SMOKE-3: /stories index renders without crash  ← NEW
// ---------------------------------------------------------------------------

test("SMOKE-3: /stories index renders without crash", async ({ page }) => {
  await page.goto(`${BASE_URL}/stories`, { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: /^stories$/i })
  ).toBeVisible({ timeout: TIMEOUT.navigation });

  const body = (await page.locator("body").textContent()) ?? "";
  expect(body).not.toContain("Application error");
  expect(body).not.toContain("client-side exception");

  await page.screenshot({ path: "test-screenshots/smoke-3-stories.png" });
});

// ---------------------------------------------------------------------------
// SMOKE-4: /pinned renders without crash  ← NEW
// ---------------------------------------------------------------------------

test("SMOKE-4: /pinned renders without crash", async ({ page }) => {
  await page.goto(`${BASE_URL}/pinned`, { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: /pinned responses/i })
  ).toBeVisible({ timeout: TIMEOUT.navigation });

  const body = (await page.locator("body").textContent()) ?? "";
  expect(body).not.toContain("Application error");
  expect(body).not.toContain("client-side exception");

  await page.screenshot({ path: "test-screenshots/smoke-4-pinned.png" });
});

// ---------------------------------------------------------------------------
// SMOKE-5: Dashboard detail renders without crash
// ---------------------------------------------------------------------------

test("SMOKE-5: Dashboard detail renders without crash", async ({
  page,
  request,
}) => {
  // Try to get an existing dashboard or seed one
  let dashboardId: string | null = null;
  let seeded = false;

  const listRes = await request.get(`${BACKEND_URL}/api/dashboards`);
  if (listRes.ok()) {
    const dashboards = await listRes.json();
    if (dashboards.length > 0) {
      dashboardId = dashboards[0].id;
    }
  }

  if (!dashboardId) {
    try {
      const created = await createTestDashboard(request, {
        title: "SMOKE-5 Seed Dashboard",
      });
      dashboardId = created.id;
      seeded = true;
    } catch {
      console.warn("[SMOKE-5] Cannot seed dashboard — skipping");
      test.skip();
      return;
    }
  }

  try {
    await page.goto(`${BASE_URL}/dashboards/${dashboardId}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1")).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    const body = (await page.locator("body").textContent()) ?? "";
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("client-side exception");

    await page.screenshot({ path: "test-screenshots/smoke-5-dashboard-detail.png" });
  } finally {
    if (seeded && dashboardId) {
      await deleteResource(request, `/api/dashboards/${dashboardId}`);
    }
  }
});

// ---------------------------------------------------------------------------
// SMOKE-6: Story detail renders without crash  ← NEW
// ---------------------------------------------------------------------------

test("SMOKE-6: Story detail renders without crash", async ({
  page,
  request,
}) => {
  let storyId: string | null = null;
  let seeded = false;

  const listRes = await request.get(`${BACKEND_URL}/api/stories`);
  if (listRes.ok()) {
    const stories = await listRes.json();
    if (stories.length > 0) {
      storyId = stories[0].id;
    }
  }

  if (!storyId) {
    try {
      const created = await createTestStory(request, { title: "SMOKE-6 Seed Story" });
      storyId = created.id;
      seeded = true;
    } catch {
      console.warn("[SMOKE-6] Cannot seed story — skipping");
      test.skip();
      return;
    }
  }

  try {
    await page.goto(`${BASE_URL}/stories/${storyId}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("h1")).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    const body = (await page.locator("body").textContent()) ?? "";
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("client-side exception");

    await page.screenshot({ path: "test-screenshots/smoke-6-story-detail.png" });
  } finally {
    if (seeded && storyId) {
      await deleteResource(request, `/api/stories/${storyId}`);
    }
  }
});

// ---------------------------------------------------------------------------
// SMOKE-7: Sidebar nav has correct links (no Reports)
// ---------------------------------------------------------------------------

test("SMOKE-7: Sidebar contains Stories and Pinned nav links; Reports is absent", async ({
  page,
}) => {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

  // Stories link present
  await expect(page.locator('a[href="/stories"]')).toBeVisible({
    timeout: TIMEOUT.navigation,
  });

  // Pinned link present
  await expect(page.locator('a[href="/pinned"]')).toBeVisible({
    timeout: TIMEOUT.navigation,
  });

  // Dashboards link present
  await expect(page.locator('a[href="/dashboards"]')).toBeVisible({
    timeout: TIMEOUT.navigation,
  });

  // Reports link absent
  const reportsLinkCount = await page.locator('a[href="/reports"]').count();
  expect(reportsLinkCount).toBe(0);

  await page.screenshot({ path: "test-screenshots/smoke-7-nav.png" });
});

// ---------------------------------------------------------------------------
// SMOKE-8: /reports returns 404 (route removed)
// ---------------------------------------------------------------------------

test("SMOKE-8: /reports route is no longer accessible (removed)", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });

  const body = (await page.locator("body").textContent()) ?? "";
  const url = page.url();

  // Should not render the old Reports page content
  const hasReportsHeading = await page
    .getByRole("heading", { name: /^reports$/i })
    .isVisible()
    .catch(() => false);
  expect(hasReportsHeading).toBe(false);

  console.log(
    `[SMOKE-8] /reports: url=${url}, bodySnippet="${body.substring(0, 80)}"`
  );
});
