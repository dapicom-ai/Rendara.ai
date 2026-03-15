/**
 * Pin From Message E2E Tests — PIN-MSG-1 through PIN-MSG-5
 *
 * Tests:
 *   - Hover on assistant message → action bar appears
 *   - Pin button click → "Save Response" modal opens
 *   - Modal has auto-filled title from message content
 *   - Edit title + description → Save → "Saved" confirmation → modal closes
 *   - Pinned card appears in /pinned after saving
 *   - Delete pinned card removes it
 *
 * Frontend: http://localhost:3000
 * Backend:  http://localhost:8001
 */

import { test, expect } from "@playwright/test";
import {
  BASE_URL,
  BACKEND_URL,
  TIMEOUT,
  createTestPinned,
  deleteResource,
  waitForStreamingComplete,
  waitForStreamingStart,
  HomePage,
  Sidebar,
  PinnedPage,
} from "./helpers/page-objects";

test.describe("Pin From Message", () => {
  // ---------------------------------------------------------------------------
  // PIN-MSG-1: Hover reveals action bar with pin button
  // ---------------------------------------------------------------------------

  test("PIN-MSG-1: Hovering assistant message reveals action bar with Save response button", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    // Send a message to get an assistant response
    const textarea = HomePage.textarea(page);
    await expect(textarea).toBeVisible({ timeout: TIMEOUT.navigation });
    await textarea.fill("Tell me a short fact about numbers.");
    await page.keyboard.press("Enter");

    await waitForStreamingStart(page, 15_000);
    await waitForStreamingComplete(page, TIMEOUT.chatStream);

    // Find the last assistant message container and hover
    // assistant-ui renders messages as group/message containers
    const messageLog = page.locator('[role="log"]');
    await expect(messageLog).toBeVisible();

    // The action bar is hidden by default (opacity-0, group-hover/message:opacity-100)
    const pinButton = page.locator('[aria-label="Save response"]');
    const copyButton = page.locator('[aria-label="Copy message"]');
    const regenButton = page.locator('[aria-label="Regenerate response"]');

    // Before hover, buttons may not be visible
    // Force hover on the message area
    await messageLog.hover();
    await page.waitForTimeout(300);

    // At least one pin button should be visible
    // (may need to hover on a specific message element)
    const pinVisible = await pinButton.first().isVisible().catch(() => false);
    if (!pinVisible) {
      // Try hovering on a more specific element
      const lastMessage = page.locator('[role="log"] > div').last();
      await lastMessage.hover();
      await page.waitForTimeout(500);
    }

    // Pin button should become visible
    await expect(pinButton.first()).toBeVisible({ timeout: TIMEOUT.modal });

    // Copy and regenerate should also be visible
    await expect(copyButton.first()).toBeVisible({ timeout: TIMEOUT.modal });
    await expect(regenButton.first()).toBeVisible({ timeout: TIMEOUT.modal });

    await page.screenshot({
      path: "test-screenshots/pin-msg-1-hover.png",
    });
  });

  // ---------------------------------------------------------------------------
  // PIN-MSG-2: Pin button opens "Save Response" modal with auto-filled title
  // ---------------------------------------------------------------------------

  test("PIN-MSG-2: Pin button opens Save Response modal with auto-filled title", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    const textarea = HomePage.textarea(page);
    await expect(textarea).toBeVisible({ timeout: TIMEOUT.navigation });
    await textarea.fill("What is the meaning of the number 42?");
    await page.keyboard.press("Enter");

    await waitForStreamingStart(page, 15_000);
    await waitForStreamingComplete(page, TIMEOUT.chatStream);

    // Hover to reveal action bar
    const lastMessage = page.locator('[role="log"] > div').last();
    await lastMessage.hover();
    await page.waitForTimeout(500);

    // Click pin button
    const pinButton = page.locator('[aria-label="Save response"]');
    await expect(pinButton.first()).toBeVisible({ timeout: TIMEOUT.modal });
    await pinButton.first().click();

    // Modal should open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: TIMEOUT.modal });

    // Dialog title = "Save Response"
    await expect(dialog.getByText("Save Response")).toBeVisible();

    // Title input should be auto-filled (not empty)
    const titleInput = dialog.locator('input').first();
    await expect(titleInput).toBeVisible();
    const titleValue = await titleInput.inputValue();
    expect(titleValue.length).toBeGreaterThan(0);

    // Description input should be empty by default
    const descInput = dialog.locator('input[placeholder="Add a description..."]');
    if (await descInput.isVisible()) {
      const descValue = await descInput.inputValue();
      expect(descValue).toBe("");
    }

    // Cancel and Save buttons visible
    await expect(dialog.locator("button").filter({ hasText: /cancel/i })).toBeVisible();
    await expect(dialog.locator("button").filter({ hasText: /^save$/i })).toBeVisible();

    await page.screenshot({
      path: "test-screenshots/pin-msg-2-modal.png",
    });

    // Close modal
    await dialog.locator("button").filter({ hasText: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: TIMEOUT.modal });
  });

  // ---------------------------------------------------------------------------
  // PIN-MSG-3: Edit title and description → Save → confirmation → modal closes
  // ---------------------------------------------------------------------------

  test("PIN-MSG-3: Edit fields → Save → Saved confirmation → modal auto-closes", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    const textarea = HomePage.textarea(page);
    await expect(textarea).toBeVisible({ timeout: TIMEOUT.navigation });
    await textarea.fill("Give me a brief summary of machine learning.");
    await page.keyboard.press("Enter");

    await waitForStreamingStart(page, 15_000);
    await waitForStreamingComplete(page, TIMEOUT.chatStream);

    // Hover + click pin
    const lastMessage = page.locator('[role="log"] > div').last();
    await lastMessage.hover();
    await page.waitForTimeout(500);

    const pinButton = page.locator('[aria-label="Save response"]');
    await expect(pinButton.first()).toBeVisible({ timeout: TIMEOUT.modal });
    await pinButton.first().click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: TIMEOUT.modal });

    // Edit title
    const titleInput = dialog.locator('input').first();
    await titleInput.fill("ML Summary - E2E Test");

    // Edit description
    const descInput = dialog.locator('input[placeholder="Add a description..."]');
    if (await descInput.isVisible()) {
      await descInput.fill("Automated E2E test pin");
    }

    // Click Save
    const saveButton = dialog.locator("button").filter({ hasText: /^save$/i });
    await saveButton.click();

    // "Saved" confirmation text
    await expect(dialog.getByText(/saved/i)).toBeVisible({ timeout: TIMEOUT.modal });

    // Modal should auto-close after ~1.2s
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    await page.screenshot({
      path: "test-screenshots/pin-msg-3-saved.png",
    });
  });

  // ---------------------------------------------------------------------------
  // PIN-MSG-4: Verify pinned card appears in /pinned page
  // ---------------------------------------------------------------------------

  test("PIN-MSG-4: Pinned response card appears in /pinned after saving", async ({
    page,
    request,
  }) => {
    test.setTimeout(30_000);

    // Seed a pinned response directly via API
    const pinned = await createTestPinned(request, {
      title: "E2E Seeded Pin",
      description: "Seeded via API for testing",
    });

    try {
      await page.goto(`${BASE_URL}/pinned`, { waitUntil: "domcontentloaded" });

      await expect(
        page.getByRole("heading", { name: /pinned responses/i })
      ).toBeVisible({ timeout: TIMEOUT.navigation });

      // Card with our title should be visible
      await expect(
        page.locator("h3").filter({ hasText: "E2E Seeded Pin" })
      ).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

      // Description visible
      await expect(
        page.getByText("Seeded via API for testing")
      ).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

      await page.screenshot({
        path: "test-screenshots/pin-msg-4-card.png",
      });
    } finally {
      await deleteResource(request, `/api/pinned/${pinned.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // PIN-MSG-5: Delete pinned card removes it
  // ---------------------------------------------------------------------------

  test("PIN-MSG-5: Delete button removes pinned card", async ({
    page,
    request,
  }) => {
    test.setTimeout(30_000);

    const pinned = await createTestPinned(request, {
      title: "Delete Me Pin",
      description: "This should be deleted",
    });

    try {
      await page.goto(`${BASE_URL}/pinned`, { waitUntil: "domcontentloaded" });

      await expect(
        page.getByRole("heading", { name: /pinned responses/i })
      ).toBeVisible({ timeout: TIMEOUT.navigation });

      // Card should exist
      const card = page.locator("h3").filter({ hasText: "Delete Me Pin" });
      await expect(card).toBeVisible({ timeout: TIMEOUT.apiPageLoad });

      // Hover over the card to reveal delete button
      const cardContainer = card.locator("xpath=ancestor::div[contains(@class, 'group')]").first();
      await cardContainer.hover();

      // Click delete button
      const deleteBtn = PinnedPage.deleteButton(page);
      await expect(deleteBtn.first()).toBeVisible({ timeout: TIMEOUT.modal });
      await deleteBtn.first().click();

      // Card should disappear
      await expect(card).not.toBeVisible({ timeout: TIMEOUT.apiPageLoad });

      await page.screenshot({
        path: "test-screenshots/pin-msg-5-deleted.png",
      });
    } finally {
      // Best-effort cleanup in case test failed before delete
      await deleteResource(request, `/api/pinned/${pinned.id}`);
    }
  });
});
