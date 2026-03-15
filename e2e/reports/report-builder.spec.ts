/**
 * DEPRECATED — Report Builder Tests
 *
 * The /reports/[id] route has been removed from Rendara v2.
 * All tests below are disabled. See e2e/report.spec.ts for the
 * regression guard that confirms this route returns 404.
 *
 * Original header (kept for reference):
 * Report Builder E2E Tests — TC-RPT-002 through TC-RPT-008, TC-RPT-013,
 * TC-RPT-016, TC-RPT-017, TC-RPT-018, TC-RPT-019
 *
 * Tests the report builder page at /reports/[id]:
 *   - Page structure (title, buttons, back nav)
 *   - Add heading / text sections
 *   - Inline editing of sections and title
 *   - Delete sections
 *   - Reorder sections (move up / move down)
 *
 * Each test creates its own data via the backend API for isolation.
 *
 * Run:
 *   npx playwright test tests/e2e/reports/report-builder.spec.ts
 */

import { test, expect, request } from "@playwright/test";
import {
  BACKEND_URL,
  ensureScreenshotDir,
  createReport,
  createReportWithSections,
  createAndPublishReport,
  ReportBuilderPage,
  screenshotPath,
  TIMEOUTS,
} from "./helpers/report-helpers";

test.beforeAll(() => {
  ensureScreenshotDir();
});

// ---------------------------------------------------------------------------
// TC-RPT-002 — Builder renders with title and action buttons
// ---------------------------------------------------------------------------

test("TC-RPT-002: Builder page renders title, Add Heading, Add Text, and Publish buttons", async ({
  page,
  request: apiCtx,
}) => {
  // TC-RPT-002: Create report via API, navigate to builder, verify structure
  const report = await createReport(apiCtx, "TC-RPT-002 Builder Test");
  const builder = new ReportBuilderPage(page);

  await builder.goto(report.id);
  await builder.waitForLoad();

  await builder.screenshot("tc-rpt-002-builder-structure.png");

  // Title is visible
  await expect(builder.titleHeading).toContainText("TC-RPT-002 Builder Test");

  // Add Heading button
  await expect(builder.addHeadingButton).toBeVisible();

  // Add Text button
  await expect(builder.addTextButton).toBeVisible();

  // Back button
  await expect(builder.backButton).toBeVisible();

  // Publish button (report is not published yet, so text should be "Publish")
  await expect(builder.publishButton).toBeVisible();
});

// ---------------------------------------------------------------------------
// TC-RPT-003 — Add heading section
// ---------------------------------------------------------------------------

test("TC-RPT-003: Add heading section appears with default text", async ({
  page,
  request: apiCtx,
}) => {
  // TC-RPT-003: Create empty report, click Add Heading, verify section appears
  const report = await createReport(apiCtx, "TC-RPT-003 Add Heading");
  const builder = new ReportBuilderPage(page);

  await builder.goto(report.id);
  await builder.waitForLoad();

  // Initially no sections
  const initialCount = await builder.sectionBlocks.count();
  expect(initialCount).toBe(0);

  // Click Add Heading
  await builder.addHeading();
  await page.waitForTimeout(500);

  await builder.screenshot("tc-rpt-003-heading-added.png");

  // One section block should now exist
  const sectionCount = await builder.sectionBlocks.count();
  expect(sectionCount).toBe(1);

  // Section should contain an h2 with "New heading"
  const heading = builder.getSectionHeading(0);
  await expect(heading).toContainText("New heading");

  // Delete button should be present
  const deleteBtn = builder.getDeleteButton(0);
  await expect(deleteBtn).toBeVisible();
});

// ---------------------------------------------------------------------------
// TC-RPT-004 — Add text section
// ---------------------------------------------------------------------------

test("TC-RPT-004: Add text section appears with default content", async ({
  page,
  request: apiCtx,
}) => {
  // TC-RPT-004: Create empty report, click Add Text, verify section appears
  const report = await createReport(apiCtx, "TC-RPT-004 Add Text");
  const builder = new ReportBuilderPage(page);

  await builder.goto(report.id);
  await builder.waitForLoad();

  // Click Add Text
  await builder.addText();
  await page.waitForTimeout(500);

  await builder.screenshot("tc-rpt-004-text-added.png");

  const sectionCount = await builder.sectionBlocks.count();
  expect(sectionCount).toBe(1);

  // Section should contain a p with "New section"
  const text = builder.getSectionText(0);
  await expect(text).toContainText("New section");

  // Delete button should be present
  const deleteBtn = builder.getDeleteButton(0);
  await expect(deleteBtn).toBeVisible();
});

// ---------------------------------------------------------------------------
// TC-RPT-005 — Edit heading section inline
// ---------------------------------------------------------------------------

test("TC-RPT-005: Click heading to edit inline, type new text, blur to save", async ({
  page,
  request: apiCtx,
}) => {
  // TC-RPT-005: Create report with heading, click heading, edit, blur
  const report = await createReport(apiCtx, "TC-RPT-005 Edit Heading", [
    { id: "h1", type: "heading", content: "Original Heading" },
  ]);
  const builder = new ReportBuilderPage(page);

  await builder.goto(report.id);
  await builder.waitForLoad();

  // Verify original heading text
  const heading = builder.getSectionHeading(0);
  await expect(heading).toContainText("Original Heading");

  // Click heading to enter edit mode
  await heading.click();

  // Input should appear (autoFocus)
  const editInput = builder.sectionBlocks
    .nth(0)
    .locator("input[type='text']");
  await expect(editInput).toBeVisible();

  // Clear and type new text
  await editInput.fill("Updated Heading Text");

  // Blur by pressing Tab (moves focus away, triggers onBlur → handleSave)
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);

  await builder.screenshot("tc-rpt-005-heading-edited.png");

  // Heading should now show the updated text
  const updatedHeading = builder.getSectionHeading(0);
  await expect(updatedHeading).toContainText("Updated Heading Text");
});

// ---------------------------------------------------------------------------
// TC-RPT-006 — Edit text section inline
// ---------------------------------------------------------------------------

test("TC-RPT-006: Click text to edit inline, type new content, blur to save", async ({
  page,
  request: apiCtx,
}) => {
  // TC-RPT-006: Create report with text section, click text, edit, blur
  const report = await createReport(apiCtx, "TC-RPT-006 Edit Text", [
    { id: "t1", type: "text", content: "Original text content" },
  ]);
  const builder = new ReportBuilderPage(page);

  await builder.goto(report.id);
  await builder.waitForLoad();

  // Verify original text
  const textEl = builder.getSectionText(0);
  await expect(textEl).toContainText("Original text content");

  // Click text to enter edit mode
  await textEl.click();

  // Textarea should appear (autoFocus)
  const editTextarea = builder.sectionBlocks.nth(0).locator("textarea");
  await expect(editTextarea).toBeVisible();

  // Clear and type new text
  await editTextarea.fill("Updated text content with more details");

  // Blur by pressing Tab (moves focus away, triggers onBlur → handleSave)
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);

  await builder.screenshot("tc-rpt-006-text-edited.png");

  // Text should now show the updated content
  const updatedText = builder.getSectionText(0);
  await expect(updatedText).toContainText(
    "Updated text content with more details"
  );
});

// ---------------------------------------------------------------------------
// TC-RPT-007 — Delete a section
// ---------------------------------------------------------------------------

test("TC-RPT-007: Delete a section removes it from the builder", async ({
  page,
  request: apiCtx,
}) => {
  // TC-RPT-007: Create report with two sections, delete first, verify removal
  const report = await createReport(apiCtx, "TC-RPT-007 Delete Section", [
    { id: "h1", type: "heading", content: "Heading to Keep" },
    { id: "t1", type: "text", content: "Text to Delete" },
  ]);
  const builder = new ReportBuilderPage(page);

  await builder.goto(report.id);
  await builder.waitForLoad();

  // Verify two sections
  expect(await builder.sectionBlocks.count()).toBe(2);

  // Delete the second section (text)
  const deleteBtn = builder.getDeleteButton(1);
  await deleteBtn.click();
  await page.waitForTimeout(500);

  await builder.screenshot("tc-rpt-007-section-deleted.png");

  // Only one section should remain
  expect(await builder.sectionBlocks.count()).toBe(1);

  // The remaining section should be the heading
  const heading = builder.getSectionHeading(0);
  await expect(heading).toContainText("Heading to Keep");
});

// ---------------------------------------------------------------------------
// TC-RPT-008 — Move section up/down
// ---------------------------------------------------------------------------

test("TC-RPT-008: Move sections up and down reorders them", async ({
  page,
  request: apiCtx,
}) => {
  // TC-RPT-008: Create report with 3 sections, reorder, verify new order
  const report = await createReport(apiCtx, "TC-RPT-008 Reorder", [
    { id: "s1", type: "heading", content: "First" },
    { id: "s2", type: "heading", content: "Second" },
    { id: "s3", type: "heading", content: "Third" },
  ]);
  const builder = new ReportBuilderPage(page);

  await builder.goto(report.id);
  await builder.waitForLoad();

  // Verify initial order: First, Second, Third
  await expect(builder.getSectionHeading(0)).toContainText("First");
  await expect(builder.getSectionHeading(1)).toContainText("Second");
  await expect(builder.getSectionHeading(2)).toContainText("Third");

  // Move "First" down: should become First <-> Second swap
  const moveDownBtn = builder.getMoveDownButton(0);
  await moveDownBtn.click();
  await page.waitForTimeout(500);

  // New order: Second, First, Third
  await expect(builder.getSectionHeading(0)).toContainText("Second");
  await expect(builder.getSectionHeading(1)).toContainText("First");
  await expect(builder.getSectionHeading(2)).toContainText("Third");

  // Move "Third" up: should become Third <-> First swap
  const moveUpBtn = builder.getMoveUpButton(2);
  await moveUpBtn.click();
  await page.waitForTimeout(500);

  await builder.screenshot("tc-rpt-008-reordered.png");

  // New order: Second, Third, First
  await expect(builder.getSectionHeading(0)).toContainText("Second");
  await expect(builder.getSectionHeading(1)).toContainText("Third");
  await expect(builder.getSectionHeading(2)).toContainText("First");
});

// ---------------------------------------------------------------------------
// TC-RPT-013 — Report title inline edit
// ---------------------------------------------------------------------------

test("TC-RPT-013: Click title to edit inline, type new title, blur to save", async ({
  page,
  request: apiCtx,
}) => {
  // TC-RPT-013: Create report, click h1 title, edit, blur, verify update
  const report = await createReport(apiCtx, "TC-RPT-013 Original Title");
  const builder = new ReportBuilderPage(page);

  await builder.goto(report.id);
  await builder.waitForLoad();

  // Verify original title
  await expect(builder.titleHeading).toContainText("TC-RPT-013 Original Title");

  // Click title to enter edit mode
  await builder.clickTitle();

  // Title input should appear
  await expect(builder.titleInput).toBeVisible();

  // Type new title
  await builder.titleInput.fill("TC-RPT-013 Updated Title");

  // Blur by pressing Enter
  await builder.titleInput.press("Enter");
  await page.waitForTimeout(500);

  await builder.screenshot("tc-rpt-013-title-edited.png");

  // Title should show the updated text
  await expect(builder.titleHeading).toContainText("TC-RPT-013 Updated Title");
});

// ---------------------------------------------------------------------------
// TC-RPT-016 — Back button in builder navigates back
// ---------------------------------------------------------------------------

test("TC-RPT-016: Back button navigates away from builder", async ({
  page,
  request: apiCtx,
}) => {
  // TC-RPT-016: Navigate to /reports, click card, then back button
  const report = await createReport(apiCtx, "TC-RPT-016 Navigation");
  const builder = new ReportBuilderPage(page);

  // Start on reports index so history has a "back" destination
  await page.goto(`${BACKEND_URL.replace("8001", "3000")}/reports`, {
    waitUntil: "domcontentloaded",
    timeout: TIMEOUTS.navigation,
  });
  await page.waitForTimeout(1000);

  // Navigate to builder
  await builder.goto(report.id);
  await builder.waitForLoad();

  // Click back button
  await builder.backButton.click();
  await page.waitForTimeout(1000);

  await builder.screenshot("tc-rpt-016-back-navigation.png");

  // Should no longer be on /reports/[id]
  const url = page.url();
  expect(url).not.toContain(`/reports/${report.id}`);
});

// ---------------------------------------------------------------------------
// TC-RPT-017 — Delete section from single-section report
// ---------------------------------------------------------------------------

test("TC-RPT-017: Delete only section leaves empty sections area", async ({
  page,
  request: apiCtx,
}) => {
  // TC-RPT-017: Create report with one section, delete it, verify empty state
  const report = await createReport(apiCtx, "TC-RPT-017 Single Section", [
    { id: "only", type: "text", content: "Only section" },
  ]);
  const builder = new ReportBuilderPage(page);

  await builder.goto(report.id);
  await builder.waitForLoad();

  // Verify one section
  expect(await builder.sectionBlocks.count()).toBe(1);

  // Delete it
  const deleteBtn = builder.getDeleteButton(0);
  await deleteBtn.click();
  await page.waitForTimeout(500);

  await builder.screenshot("tc-rpt-017-empty-after-delete.png");

  // No sections remain
  expect(await builder.sectionBlocks.count()).toBe(0);

  // Add buttons still present (no crash)
  await expect(builder.addHeadingButton).toBeVisible();
  await expect(builder.addTextButton).toBeVisible();
});

// ---------------------------------------------------------------------------
// TC-RPT-018 — Move buttons visibility (first/last section)
// ---------------------------------------------------------------------------

test("TC-RPT-018: First section has no Move up; last section has no Move down", async ({
  page,
  request: apiCtx,
}) => {
  // TC-RPT-018: Create report with 3 sections, check move button visibility
  const report = await createReport(apiCtx, "TC-RPT-018 Move Buttons", [
    { id: "s1", type: "heading", content: "First" },
    { id: "s2", type: "heading", content: "Middle" },
    { id: "s3", type: "heading", content: "Last" },
  ]);
  const builder = new ReportBuilderPage(page);

  await builder.goto(report.id);
  await builder.waitForLoad();

  await builder.screenshot("tc-rpt-018-move-buttons.png");

  // First section: no Move up, has Move down
  expect(await builder.getMoveUpButton(0).count()).toBe(0);
  expect(await builder.getMoveDownButton(0).count()).toBe(1);

  // Middle section: has both Move up and Move down
  expect(await builder.getMoveUpButton(1).count()).toBe(1);
  expect(await builder.getMoveDownButton(1).count()).toBe(1);

  // Last section: has Move up, no Move down
  expect(await builder.getMoveUpButton(2).count()).toBe(1);
  expect(await builder.getMoveDownButton(2).count()).toBe(0);
});

// ---------------------------------------------------------------------------
// TC-RPT-019 — Very long section content
// ---------------------------------------------------------------------------

test("TC-RPT-019: Long section content displays without overflow issues", async ({
  page,
  request: apiCtx,
}) => {
  // TC-RPT-019: Create report with very long text, verify it renders
  const longContent =
    "This is a very long paragraph for testing purposes. ".repeat(50);
  const report = await createReport(apiCtx, "TC-RPT-019 Long Content", [
    { id: "long", type: "text", content: longContent },
  ]);
  const builder = new ReportBuilderPage(page);

  await builder.goto(report.id);
  await builder.waitForLoad();

  await builder.screenshot("tc-rpt-019-long-content.png");

  // The section should be visible
  expect(await builder.sectionBlocks.count()).toBe(1);

  // The text should contain some of the long content (at minimum the first part)
  const textEl = builder.getSectionText(0);
  await expect(textEl).toContainText("This is a very long paragraph");

  // Verify no horizontal overflow on the section block
  const hasOverflow = await builder.sectionBlocks.nth(0).evaluate((el) => {
    return el.scrollWidth > el.clientWidth;
  });
  expect(hasOverflow).toBe(false);
});
