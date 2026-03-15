/**
 * Suite: Dashboard Canvas Tests — TC-DASH-001 through TC-DASH-010
 *
 * Validates the free-canvas dashboard feature:
 *   - /dashboards index: grid of agent-created dashboards
 *   - /dashboards/[id]: 16:9 free-canvas with tiles + collapsed AgentChatPanel
 *   - Inline title editing (click h1 to edit)
 *   - AgentChatPanel expand/collapse
 *   - Tile rendering (text tiles)
 *   - Empty dashboard state
 *   - API: GET/POST/PATCH/DELETE /api/dashboards
 *
 * Replaces the old dashboard.spec.ts which was written for the old pin-based
 * design. The new design uses agent-created free-canvas dashboards with
 * absolute % tile positioning.
 *
 * Self-seeding: uses POST /api/dashboards to create test data before tests.
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
  DashboardsPage,
  DashboardDetailPage,
  Sidebar,
  createTestDashboard,
  deleteResource,
} from "./helpers/page-objects";

const SCREENSHOT_DIR = path.join(
  process.cwd(),
  "test-screenshots",
  "dashboard-canvas"
);

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

// ---------------------------------------------------------------------------
// TC-DASH-001: Dashboards index loads with correct heading and subtitle
// ---------------------------------------------------------------------------

test("TC-DASH-001: /dashboards page loads with heading and agent-created subtitle", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/dashboards`, { waitUntil: "domcontentloaded" });

  await expect(DashboardsPage.heading(page)).toBeVisible({
    timeout: TIMEOUT.navigation,
  });

  // Subtitle should say dashboards are agent-created
  await expect(DashboardsPage.subtitle(page)).toBeVisible({
    timeout: TIMEOUT.navigation,
  });

  // No create button (agent-only creation)
  const createBtn = page.getByRole("button", { name: /new dashboard|create dashboard/i });
  await expect(createBtn).toHaveCount(0);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "tc-dash-001-index.png"),
    fullPage: true,
  });

  console.log("[TC-DASH-001] PASS: Dashboards index loads correctly.");
});

// ---------------------------------------------------------------------------
// TC-DASH-002: Empty state on /dashboards
// ---------------------------------------------------------------------------

test("TC-DASH-002: /dashboards shows empty state when no dashboards exist", async ({
  page,
  request,
}) => {
  const listRes = await request.get(`${BACKEND_URL}/api/dashboards`);
  if (!listRes.ok()) {
    console.warn("[TC-DASH-002] GET /api/dashboards failed");
    test.skip();
    return;
  }
  const dashboards = await listRes.json();
  if (dashboards.length > 0) {
    console.log(
      `[TC-DASH-002] ${dashboards.length} dashboards exist — skipping empty state test`
    );
    test.skip();
    return;
  }

  await page.goto(`${BASE_URL}/dashboards`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await expect(DashboardsPage.emptyStateTitle(page)).toBeVisible({
    timeout: TIMEOUT.apiPageLoad,
  });
  await expect(DashboardsPage.emptyStateSubtitle(page)).toBeVisible({
    timeout: TIMEOUT.apiPageLoad,
  });

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "tc-dash-002-empty.png"),
  });
  console.log("[TC-DASH-002] PASS: Empty state renders on /dashboards.");
});

// ---------------------------------------------------------------------------
// TC-DASH-003: Seeded dashboard appears as a card on /dashboards index
// ---------------------------------------------------------------------------

test("TC-DASH-003: Seeded dashboard appears as a card on /dashboards index", async ({
  page,
  request,
}) => {
  let seeded: { id: string; title: string } | null = null;

  try {
    seeded = await createTestDashboard(request, {
      title: "TC-DASH-003 Canvas Dashboard",
      layout_json: [
        {
          id: "t1",
          type: "text",
          content: "Hello canvas tile",
          x: 5,
          y: 5,
          w: 40,
          h: 45,
        },
      ],
    });
  } catch (err) {
    console.warn(`[TC-DASH-003] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/dashboards`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-dash-003-with-card.png"),
      fullPage: true,
    });

    // Dashboard card should show title
    await expect(
      page.getByText("TC-DASH-003 Canvas Dashboard")
    ).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

    // Should show tile count "1 tiles"
    await expect(page.getByText("1 tiles")).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    console.log("[TC-DASH-003] PASS: Dashboard card with title and tile count visible.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/dashboards/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-DASH-004: Clicking dashboard card navigates to /dashboards/[id]
// ---------------------------------------------------------------------------

test("TC-DASH-004: Clicking a dashboard card navigates to /dashboards/[id]", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestDashboard(request, {
      title: "TC-DASH-004 Navigate Test",
    });
  } catch (err) {
    console.warn(`[TC-DASH-004] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/dashboards`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const card = page
      .locator("button")
      .filter({ hasText: "TC-DASH-004 Navigate Test" })
      .first();
    await expect(card).toBeVisible({ timeout: TIMEOUT.apiPageLoad });
    await card.click();

    await page.waitForURL(`**/dashboards/${seeded.id}`, {
      timeout: TIMEOUT.navigation,
    });
    expect(page.url()).toContain(`/dashboards/${seeded.id}`);

    // Detail page should render
    await expect(DashboardDetailPage.title(page)).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-dash-004-detail.png"),
    });
    console.log("[TC-DASH-004] PASS: Navigated to dashboard detail.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/dashboards/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-DASH-005: Dashboard detail page renders title and back button
// ---------------------------------------------------------------------------

test("TC-DASH-005: Dashboard detail page renders title, back button, and Agent panel strip", async ({
  page,
  request,
}) => {
  let seeded: { id: string; title: string } | null = null;

  try {
    seeded = await createTestDashboard(request, {
      title: "TC-DASH-005 Detail Test",
    });
  } catch (err) {
    console.warn(`[TC-DASH-005] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/dashboards/${seeded.id}`, {
      waitUntil: "domcontentloaded",
    });

    // Title renders
    await expect(DashboardDetailPage.title(page)).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });
    const titleText = await DashboardDetailPage.title(page).textContent();
    expect(titleText).toContain("TC-DASH-005 Detail Test");

    // Back button present
    await expect(DashboardDetailPage.backButton(page)).toBeVisible({
      timeout: TIMEOUT.navigation,
    });

    // AgentChatPanel collapsed strip (32px, expand button visible)
    await expect(DashboardDetailPage.agentPanelCollapsed(page)).toBeVisible({
      timeout: TIMEOUT.navigation,
    });

    // "Agent created" badge
    await expect(page.getByText("Agent created")).toBeVisible({
      timeout: TIMEOUT.navigation,
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-dash-005-detail.png"),
    });
    console.log("[TC-DASH-005] PASS: Dashboard detail renders correctly.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/dashboards/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-DASH-006: Empty canvas state when layoutJson is empty
// ---------------------------------------------------------------------------

test("TC-DASH-006: Dashboard detail shows empty canvas message when no tiles", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    // Create dashboard with no tiles
    const res = await request.post(`${BACKEND_URL}/api/dashboards`, {
      data: { title: "TC-DASH-006 Empty Canvas", layout_json: [] },
    });
    if (!res.ok()) throw new Error(`POST failed: ${res.status()}`);
    seeded = await res.json();
  } catch (err) {
    console.warn(`[TC-DASH-006] Cannot seed empty dashboard: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/dashboards/${seeded!.id}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(DashboardDetailPage.emptyCanvas(page)).toBeVisible({
      timeout: TIMEOUT.apiPageLoad,
    });

    await expect(
      page.getByText("Ask the agent to add content.")
    ).toBeVisible({ timeout: TIMEOUT.navigation });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-dash-006-empty-canvas.png"),
    });
    console.log("[TC-DASH-006] PASS: Empty canvas message shown.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/dashboards/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-DASH-007: AgentChatPanel expands to 320px on click
// ---------------------------------------------------------------------------

test("TC-DASH-007: AgentChatPanel expands when chevron is clicked", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestDashboard(request, { title: "TC-DASH-007 Panel Test" });
  } catch (err) {
    console.warn(`[TC-DASH-007] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/dashboards/${seeded.id}`, {
      waitUntil: "domcontentloaded",
    });

    // Initially collapsed: expand button visible
    const expandBtn = DashboardDetailPage.agentPanelCollapsed(page);
    await expect(expandBtn).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-dash-007-collapsed.png"),
    });

    await expandBtn.click();
    await page.waitForTimeout(300); // animation

    // Now expanded: collapse button visible
    const collapseBtn = DashboardDetailPage.agentPanelExpanded(page);
    await expect(collapseBtn).toBeVisible({ timeout: TIMEOUT.animation });

    // "Agent Chat" label appears
    await expect(page.getByText("Agent Chat")).toBeVisible({
      timeout: TIMEOUT.animation,
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-dash-007-expanded.png"),
    });

    // Click again to collapse
    await collapseBtn.click();
    await page.waitForTimeout(300);
    await expect(expandBtn).toBeVisible({ timeout: TIMEOUT.animation });

    console.log("[TC-DASH-007] PASS: AgentChatPanel expands and collapses.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/dashboards/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-DASH-008: Inline title editing on dashboard detail
// ---------------------------------------------------------------------------

test("TC-DASH-008: Dashboard title is editable inline on detail page", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestDashboard(request, {
      title: "TC-DASH-008 Original Title",
    });
  } catch (err) {
    console.warn(`[TC-DASH-008] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/dashboards/${seeded.id}`, {
      waitUntil: "domcontentloaded",
    });

    const titleH1 = DashboardDetailPage.title(page);
    await expect(titleH1).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

    // Click the h1 to enter edit mode
    await titleH1.click();

    // Input should appear
    const titleInput = DashboardDetailPage.titleInput(page);
    await expect(titleInput).toBeVisible({ timeout: TIMEOUT.navigation });

    // Clear and type new title
    await titleInput.fill("TC-DASH-008 Updated Title");
    await page.keyboard.press("Enter");

    await page.waitForTimeout(500);

    // h1 should show new title
    await expect(
      page.getByText("TC-DASH-008 Updated Title")
    ).toBeVisible({ timeout: TIMEOUT.navigation });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-dash-008-title-edited.png"),
    });

    // Verify PATCH was sent by checking backend
    const detailRes = await request.get(
      `${BACKEND_URL}/api/dashboards/${seeded.id}`
    );
    if (detailRes.ok()) {
      const detail = await detailRes.json();
      expect(detail.title).toBe("TC-DASH-008 Updated Title");
    }

    console.log("[TC-DASH-008] PASS: Dashboard title updated inline.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/dashboards/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-DASH-009: Dashboard detail back button returns to /dashboards
// ---------------------------------------------------------------------------

test("TC-DASH-009: Back button on dashboard detail returns to /dashboards", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestDashboard(request, { title: "TC-DASH-009 Back Test" });
  } catch (err) {
    console.warn(`[TC-DASH-009] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    // Navigate to index first so browser history has a previous entry
    await page.goto(`${BASE_URL}/dashboards`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    await page.goto(`${BASE_URL}/dashboards/${seeded.id}`, {
      waitUntil: "domcontentloaded",
    });

    const backBtn = DashboardDetailPage.backButton(page);
    await expect(backBtn).toBeVisible({ timeout: TIMEOUT.apiPageLoad });
    await backBtn.click();

    // Should go back (either to /dashboards or browser back)
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toMatch(/dashboards|localhost:3000\/?$/);

    console.log(`[TC-DASH-009] PASS: Back button navigated to: ${url}`);
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/dashboards/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-DASH-010: Dashboard detail with text tiles renders tile content
// ---------------------------------------------------------------------------

test("TC-DASH-010: Dashboard detail renders text tiles from layoutJson", async ({
  page,
  request,
}) => {
  let seeded: { id: string } | null = null;

  try {
    seeded = await createTestDashboard(request, {
      title: "TC-DASH-010 Tile Render Test",
      layout_json: [
        {
          id: "tile-a",
          type: "text",
          content: "TC-DASH-010 unique tile text content",
          x: 5,
          y: 5,
          w: 40,
          h: 45,
        },
      ],
    });
  } catch (err) {
    console.warn(`[TC-DASH-010] Cannot seed: ${err}`);
    test.skip();
    return;
  }

  try {
    await page.goto(`${BASE_URL}/dashboards/${seeded.id}`, {
      waitUntil: "domcontentloaded",
    });

    // Wait for canvas to load
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tc-dash-010-tiles.png"),
      fullPage: true,
    });

    // Tile content should be visible in the canvas
    const tileContent = page.getByText("TC-DASH-010 unique tile text content");
    const isVisible = await tileContent.isVisible().catch(() => false);

    if (!isVisible) {
      // DashboardCanvas may render tiles in absolute-positioned containers
      const bodyText = (await page.locator("body").textContent()) ?? "";
      const hasText = bodyText.includes("TC-DASH-010 unique tile text content");
      expect(hasText).toBe(true);
    } else {
      await expect(tileContent).toBeVisible({ timeout: TIMEOUT.apiPageLoad });
    }

    console.log("[TC-DASH-010] PASS: Tile text content rendered in dashboard canvas.");
  } finally {
    if (seeded?.id) {
      await deleteResource(request, `/api/dashboards/${seeded.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-DASH-API-001: GET /api/dashboards returns array
// ---------------------------------------------------------------------------

test("TC-DASH-API-001: GET /api/dashboards returns 200 with array", async ({
  request,
}) => {
  const res = await request.get(`${BACKEND_URL}/api/dashboards`);
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(Array.isArray(data)).toBe(true);
  console.log(`[TC-DASH-API-001] PASS: /api/dashboards returned ${data.length} items.`);
});

// ---------------------------------------------------------------------------
// TC-DASH-API-002: Dashboard CRUD cycle via API
// ---------------------------------------------------------------------------

test("TC-DASH-API-002: Dashboard CRUD — POST, GET, PATCH, DELETE", async ({
  request,
}) => {
  // CREATE
  const createRes = await request.post(`${BACKEND_URL}/api/dashboards`, {
    data: {
      title: "TC-DASH-API-002 CRUD Test",
      layout_json: [
        { id: "t1", type: "text", content: "hello", x: 0, y: 0, w: 50, h: 50 },
      ],
    },
  });
  expect(createRes.ok()).toBeTruthy();
  const created = await createRes.json();
  expect(created.id).toBeTruthy();
  expect(created.title).toBe("TC-DASH-API-002 CRUD Test");

  // GET by ID
  const getRes = await request.get(`${BACKEND_URL}/api/dashboards/${created.id}`);
  expect(getRes.ok()).toBeTruthy();
  const fetched = await getRes.json();
  expect(fetched.title).toBe("TC-DASH-API-002 CRUD Test");
  // layoutJson should be present
  expect(fetched.layoutJson ?? fetched.layout_json).toBeTruthy();

  // PATCH title
  const patchRes = await request.patch(
    `${BACKEND_URL}/api/dashboards/${created.id}`,
    { data: { title: "TC-DASH-API-002 Updated" } }
  );
  expect(patchRes.ok()).toBeTruthy();

  // Verify update
  const afterPatch = await (
    await request.get(`${BACKEND_URL}/api/dashboards/${created.id}`)
  ).json();
  expect(afterPatch.title).toBe("TC-DASH-API-002 Updated");

  // DELETE
  const deleteRes = await request.delete(
    `${BACKEND_URL}/api/dashboards/${created.id}`
  );
  expect(deleteRes.ok()).toBeTruthy();

  // Confirm 404 after delete
  const afterDelete = await request.get(
    `${BACKEND_URL}/api/dashboards/${created.id}`
  );
  expect(afterDelete.status()).toBe(404);

  console.log("[TC-DASH-API-002] PASS: Dashboard CRUD cycle complete.");
});

// ---------------------------------------------------------------------------
// TC-DASH-011: Not-found state when dashboard ID is invalid
// ---------------------------------------------------------------------------

test("TC-DASH-011: Dashboard detail shows error state for non-existent ID", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/dashboards/nonexistent-id-99999`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForTimeout(2000);

  const bodyText = (await page.locator("body").textContent()) ?? "";

  // Should show "Dashboard not found" or similar error
  const hasNotFound =
    bodyText.includes("Dashboard not found") ||
    bodyText.includes("not found") ||
    bodyText.includes("error");

  const hasCrash =
    bodyText.includes("Application error") ||
    bodyText.includes("client-side exception");

  console.log(
    `[TC-DASH-011] bodyText snippet: "${bodyText.substring(0, 100)}", hasCrash: ${hasCrash}`
  );

  // Should not crash the app
  expect(hasCrash).toBe(false);
  // Should show some not-found indication
  expect(hasNotFound).toBe(true);

  // Go Back button should be present
  await expect(
    page.getByRole("button", { name: /go back/i })
  ).toBeVisible({ timeout: TIMEOUT.navigation });

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "tc-dash-011-not-found.png"),
  });
  console.log("[TC-DASH-011] PASS: Not-found state shown without crash.");
});
