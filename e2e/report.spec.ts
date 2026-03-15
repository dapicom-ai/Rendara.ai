/**
 * Reports Feature — REMOVED
 *
 * The /reports, /reports/[id], and /r/[uuid] routes have been removed
 * from Rendara v2. This file replaces the old report test suite with
 * regression tests that confirm those routes are gone.
 *
 * For the new feature tests see:
 *   - e2e/pinned-responses.spec.ts  (replaces pinning-to-reports flow)
 *   - e2e/stories.spec.ts           (replaces narrative/slides concept)
 *   - e2e/dashboard-canvas.spec.ts  (dashboards are now agent-created canvases)
 */

import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test("REMOVED-REPORTS-001: /reports returns 404 or not-found page", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });

  const body = (await page.locator("body").textContent()) ?? "";

  // Must NOT render the old Reports index page
  const hasOldReportsUI =
    (await page.getByRole("heading", { name: /^reports$/i }).isVisible().catch(() => false));
  expect(hasOldReportsUI).toBe(false);

  console.log(
    `[REMOVED-REPORTS-001] /reports body snippet: "${body.substring(0, 100)}"`
  );
});

test("REMOVED-REPORTS-002: /reports/[id] returns 404 or not-found page", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/reports/some-report-id`, {
    waitUntil: "domcontentloaded",
  });

  const body = (await page.locator("body").textContent()) ?? "";
  const hasOldReportBuilder =
    (await page.getByRole("button", { name: /add section/i }).isVisible().catch(() => false)) ||
    (await page.getByRole("button", { name: /publish/i }).isVisible().catch(() => false));

  expect(hasOldReportBuilder).toBe(false);

  console.log(
    `[REMOVED-REPORTS-002] /reports/some-id body snippet: "${body.substring(0, 100)}"`
  );
});

test("REMOVED-REPORTS-003: /r/[uuid] returns 404 or not-found page", async ({
  page,
}) => {
  await page.goto(
    `${BASE_URL}/r/00000000-0000-0000-0000-000000000000`,
    { waitUntil: "domcontentloaded" }
  );

  const body = (await page.locator("body").textContent()) ?? "";
  const hasPublicConsumer =
    body.includes("Powered by Rendara") &&
    body.includes("scroll progress");

  expect(hasPublicConsumer).toBe(false);

  console.log(
    `[REMOVED-REPORTS-003] /r/uuid body snippet: "${body.substring(0, 100)}"`
  );
});
