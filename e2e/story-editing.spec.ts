/**
 * Story Editing E2E Tests — STORY-EDIT-1 through STORY-EDIT-8
 *
 * Tests:
 *   - Slide navigation (Next/Previous buttons)
 *   - Slide navigation (ArrowLeft/ArrowRight keyboard)
 *   - Slide counter updates correctly
 *   - Previous disabled on first slide
 *   - Presentation mode enter/exit
 *   - Escape key exits presentation mode
 *   - AgentChatPanel expand/collapse on story detail
 *   - Slide content renders (title + content text)
 *
 * Frontend: http://localhost:3000
 * Backend:  http://localhost:8001
 */

import { test, expect } from "@playwright/test";
import {
  BASE_URL,
  TIMEOUT,
  createTestStory,
  deleteResource,
  StoryDetailPage,
} from "./helpers/page-objects";

const THREE_SLIDES = [
  { id: "s1", title: "Introduction", content: "Welcome content." },
  { id: "s2", title: "Middle Section", content: "Analysis content." },
  { id: "s3", title: "Conclusion", content: "Wrap up content." },
];

test.describe("Story Editing", () => {
  // ---------------------------------------------------------------------------
  // STORY-EDIT-1: Slide navigation with Next/Previous buttons
  // ---------------------------------------------------------------------------

  test("STORY-EDIT-1: Navigate slides with Next and Previous buttons", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const story = await createTestStory(request, {
      title: "Nav Button Story",
      slides_json: THREE_SLIDES,
    });

    try {
      await page.goto(`${BASE_URL}/stories/${story.id}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page.locator("h1").filter({ hasText: "Nav Button Story" })).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      const counter = StoryDetailPage.slideCounter(page);
      const nextBtn = StoryDetailPage.nextButton(page);
      const prevBtn = StoryDetailPage.prevButton(page);

      // Start on slide 1 / 3
      await expect(counter.first()).toHaveText(/1\s*\/\s*3/, {
        timeout: TIMEOUT.animation,
      });

      // Previous should be disabled on first slide
      await expect(prevBtn).toBeDisabled();

      // Click Next → slide 2
      await nextBtn.click();
      await expect(counter.first()).toHaveText(/2\s*\/\s*3/, {
        timeout: TIMEOUT.animation,
      });

      // Previous should now be enabled
      await expect(prevBtn).toBeEnabled();

      // Click Next → slide 3
      await nextBtn.click();
      await expect(counter.first()).toHaveText(/3\s*\/\s*3/, {
        timeout: TIMEOUT.animation,
      });

      // Next should be disabled on last slide
      await expect(nextBtn).toBeDisabled();

      // Click Previous → back to slide 2
      await prevBtn.click();
      await expect(counter.first()).toHaveText(/2\s*\/\s*3/, {
        timeout: TIMEOUT.animation,
      });

      await page.screenshot({
        path: "test-screenshots/story-edit-1-buttons.png",
      });
    } finally {
      await deleteResource(request, `/api/stories/${story.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STORY-EDIT-2: Slide navigation with ArrowLeft/ArrowRight keyboard
  // ---------------------------------------------------------------------------

  test("STORY-EDIT-2: Navigate slides with keyboard arrows", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const story = await createTestStory(request, {
      title: "Keyboard Nav Story",
      slides_json: THREE_SLIDES,
    });

    try {
      await page.goto(`${BASE_URL}/stories/${story.id}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page.locator("h1").filter({ hasText: "Keyboard Nav Story" })).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      const counter = StoryDetailPage.slideCounter(page);
      await expect(counter.first()).toHaveText(/1\s*\/\s*3/, {
        timeout: TIMEOUT.animation,
      });

      // ArrowRight → slide 2
      await page.keyboard.press("ArrowRight");
      await expect(counter.first()).toHaveText(/2\s*\/\s*3/, {
        timeout: TIMEOUT.animation,
      });

      // ArrowRight → slide 3
      await page.keyboard.press("ArrowRight");
      await expect(counter.first()).toHaveText(/3\s*\/\s*3/, {
        timeout: TIMEOUT.animation,
      });

      // ArrowRight on last slide → stays on 3
      await page.keyboard.press("ArrowRight");
      await expect(counter.first()).toHaveText(/3\s*\/\s*3/, {
        timeout: TIMEOUT.animation,
      });

      // ArrowLeft → back to 2
      await page.keyboard.press("ArrowLeft");
      await expect(counter.first()).toHaveText(/2\s*\/\s*3/, {
        timeout: TIMEOUT.animation,
      });

      // ArrowLeft → back to 1
      await page.keyboard.press("ArrowLeft");
      await expect(counter.first()).toHaveText(/1\s*\/\s*3/, {
        timeout: TIMEOUT.animation,
      });

      await page.screenshot({
        path: "test-screenshots/story-edit-2-keyboard.png",
      });
    } finally {
      await deleteResource(request, `/api/stories/${story.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STORY-EDIT-3: Presentation mode — enter via button, exit via Escape
  // ---------------------------------------------------------------------------

  test("STORY-EDIT-3: Enter presentation mode and exit with Escape", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const story = await createTestStory(request, {
      title: "Presentation Story",
      slides_json: THREE_SLIDES,
    });

    try {
      await page.goto(`${BASE_URL}/stories/${story.id}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page.locator("h1").filter({ hasText: "Presentation Story" })).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      // Present button should be visible
      const presentBtn = StoryDetailPage.presentButton(page);
      await expect(presentBtn).toBeVisible({ timeout: TIMEOUT.animation });

      // Click Present → enters fullscreen presentation mode
      await presentBtn.click();

      // Presentation overlay should appear (fixed inset-0 z-50)
      const overlay = StoryDetailPage.presentationOverlay(page);
      await expect(overlay).toBeVisible({ timeout: TIMEOUT.presentation });

      // The h1 (page title) should be obscured by the overlay
      // Slide content should still be visible in the overlay
      await page.screenshot({
        path: "test-screenshots/story-edit-3-presentation.png",
      });

      // Press Escape → exits presentation mode
      await page.keyboard.press("Escape");

      // Overlay should disappear
      await expect(overlay).not.toBeVisible({ timeout: TIMEOUT.presentation });

      // Normal UI restored — title visible again
      await expect(page.locator("h1").filter({ hasText: "Presentation Story" })).toBeVisible({
        timeout: TIMEOUT.animation,
      });

      await page.screenshot({
        path: "test-screenshots/story-edit-3-normal.png",
      });
    } finally {
      await deleteResource(request, `/api/stories/${story.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STORY-EDIT-4: Presentation mode — navigate slides inside presentation
  // ---------------------------------------------------------------------------

  test("STORY-EDIT-4: Navigate slides inside presentation mode", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const story = await createTestStory(request, {
      title: "Pres Nav Story",
      slides_json: THREE_SLIDES,
    });

    try {
      await page.goto(`${BASE_URL}/stories/${story.id}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page.locator("h1").filter({ hasText: "Pres Nav Story" })).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      // Enter presentation mode
      await StoryDetailPage.presentButton(page).click();
      const overlay = StoryDetailPage.presentationOverlay(page);
      await expect(overlay).toBeVisible({ timeout: TIMEOUT.presentation });

      // Use ArrowRight to navigate forward inside presentation
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(500); // animation settle

      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(500);

      // ArrowLeft to go back
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(500);

      // Exit
      await page.keyboard.press("Escape");
      await expect(overlay).not.toBeVisible({ timeout: TIMEOUT.presentation });

      await page.screenshot({
        path: "test-screenshots/story-edit-4-pres-nav.png",
      });
    } finally {
      await deleteResource(request, `/api/stories/${story.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STORY-EDIT-5: AgentChatPanel expand/collapse on story detail
  // ---------------------------------------------------------------------------

  test("STORY-EDIT-5: AgentChatPanel toggle on story detail", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const story = await createTestStory(request, {
      title: "Panel Story",
      slides_json: THREE_SLIDES,
    });

    try {
      await page.goto(`${BASE_URL}/stories/${story.id}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page.locator("h1").filter({ hasText: "Panel Story" })).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      // Panel starts collapsed
      const expandBtn = StoryDetailPage.agentPanelCollapsed(page);
      await expect(expandBtn).toBeVisible({ timeout: TIMEOUT.animation });

      // "Agent Chat" should not be visible
      await expect(page.getByText("Agent Chat")).not.toBeVisible();

      // Expand
      await expandBtn.click();
      await expect(page.getByText("Agent Chat")).toBeVisible({
        timeout: TIMEOUT.animation,
      });

      // Content placeholder
      await expect(
        page.getByText("Chat with the agent to modify this content.")
      ).toBeVisible({ timeout: TIMEOUT.animation });

      // Collapse
      const collapseBtn = StoryDetailPage.agentPanelExpanded(page);
      await collapseBtn.click();
      await expect(page.getByText("Agent Chat")).not.toBeVisible({
        timeout: TIMEOUT.animation,
      });

      await page.screenshot({
        path: "test-screenshots/story-edit-5-panel.png",
      });
    } finally {
      await deleteResource(request, `/api/stories/${story.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STORY-EDIT-6: Slide content renders title and body text
  // ---------------------------------------------------------------------------

  test("STORY-EDIT-6: Slide renders title and content text", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const story = await createTestStory(request, {
      title: "Content Render Story",
      slides_json: [
        { id: "s1", title: "My Slide Title", content: "Detailed slide body text here." },
      ],
    });

    try {
      await page.goto(`${BASE_URL}/stories/${story.id}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page.locator("h1").filter({ hasText: "Content Render Story" })).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      // Slide title (rendered in h2 inside StorySlide)
      await expect(page.locator("h2").filter({ hasText: "My Slide Title" })).toBeVisible({
        timeout: TIMEOUT.animation,
      });

      // Slide body content
      await expect(
        page.getByText("Detailed slide body text here.")
      ).toBeVisible({ timeout: TIMEOUT.animation });

      // Counter shows 1 / 1
      const counter = StoryDetailPage.slideCounter(page);
      await expect(counter.first()).toHaveText(/1\s*\/\s*1/, {
        timeout: TIMEOUT.animation,
      });

      await page.screenshot({
        path: "test-screenshots/story-edit-6-content.png",
      });
    } finally {
      await deleteResource(request, `/api/stories/${story.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STORY-EDIT-7: Slide count badge visible in header
  // ---------------------------------------------------------------------------

  test("STORY-EDIT-7: Slide count badge visible in story header", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const story = await createTestStory(request, {
      title: "Badge Story",
      slides_json: THREE_SLIDES,
    });

    try {
      await page.goto(`${BASE_URL}/stories/${story.id}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page.locator("h1").filter({ hasText: "Badge Story" })).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      // Slide count badge
      await expect(
        page.getByText(/3 slide/i)
      ).toBeVisible({ timeout: TIMEOUT.animation });

      await page.screenshot({
        path: "test-screenshots/story-edit-7-badge.png",
      });
    } finally {
      await deleteResource(request, `/api/stories/${story.id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STORY-EDIT-8: Back button navigates away from story detail
  // ---------------------------------------------------------------------------

  test("STORY-EDIT-8: Back button navigates from story detail", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const story = await createTestStory(request, {
      title: "Back Nav Story",
      slides_json: THREE_SLIDES,
    });

    try {
      // Navigate to stories index first, then to detail
      await page.goto(`${BASE_URL}/stories`, {
        waitUntil: "domcontentloaded",
      });
      await page.goto(`${BASE_URL}/stories/${story.id}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page.locator("h1").filter({ hasText: "Back Nav Story" })).toBeVisible({
        timeout: TIMEOUT.apiPageLoad,
      });

      // Click back button
      const backBtn = StoryDetailPage.backButton(page);
      await backBtn.click();

      // Should navigate away (back to stories index or browser back)
      await page.waitForTimeout(1_000);
      // URL should no longer contain the story ID
      expect(page.url()).not.toContain(story.id);

      await page.screenshot({
        path: "test-screenshots/story-edit-8-back.png",
      });
    } finally {
      await deleteResource(request, `/api/stories/${story.id}`);
    }
  });
});
