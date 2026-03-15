/**
 * Page Object helpers for Rendara v2 E2E tests.
 *
 * Encapsulates selectors and common interactions for the redesigned app.
 * Updated for: Pinned Responses, Free-Canvas Dashboards, Stories, and
 * the new sidebar navigation (Conversations, Dashboards, Stories, Pinned).
 */

import { type Page, type APIRequestContext, expect } from "@playwright/test";

export const BASE_URL = "http://localhost:3000";
export const BACKEND_URL = "http://localhost:8001";

// ---------------------------------------------------------------------------
// Timeout constants (explicit per the test strategy)
// ---------------------------------------------------------------------------
export const TIMEOUT = {
  navigation: 10_000,
  apiPageLoad: 15_000,
  chatStream: 60_000,
  toolCall: 45_000,
  modal: 5_000,
  animation: 3_000,
  presentation: 5_000,
};

// ---------------------------------------------------------------------------
// Sidebar selectors
// ---------------------------------------------------------------------------
export const Sidebar = {
  /** The <aside> sidebar element */
  root: (page: Page) => page.locator("aside"),

  /** NavRail nav links */
  conversationsLink: (page: Page) => page.locator('a[href="/"]'),
  dashboardsLink: (page: Page) => page.locator('a[href="/dashboards"]'),
  storiesLink: (page: Page) => page.locator('a[href="/stories"]'),
  pinnedLink: (page: Page) => page.locator('a[href="/pinned"]'),

  /** Should NOT exist */
  reportsLink: (page: Page) => page.locator('a[href="/reports"]'),

  /** New Conversation button */
  newConvButton: (page: Page) =>
    page.getByRole("link", { name: /new conversation/i }),
};

// ---------------------------------------------------------------------------
// Home page selectors
// ---------------------------------------------------------------------------
export const HomePage = {
  heroTitle: (page: Page) =>
    page.locator("h1").filter({ hasText: /Rendara/i }),
  textarea: (page: Page) =>
    page.locator('textarea[placeholder*="Ask anything"]'),
  sendButton: (page: Page) =>
    page.locator('[aria-label="Send message"]'),
  stopButton: (page: Page) =>
    page.locator('[aria-label="Stop generation"]'),
};

// ---------------------------------------------------------------------------
// Pinned Responses page selectors
// ---------------------------------------------------------------------------
export const PinnedPage = {
  heading: (page: Page) =>
    page.getByRole("heading", { name: /pinned responses/i }),
  emptyStateTitle: (page: Page) =>
    page.getByText("No pinned responses yet"),
  emptyStateSubtitle: (page: Page) =>
    page.getByText("Pin a response from chat to save it here."),
  /** Grid of pinned item cards */
  cardGrid: (page: Page) => page.locator(".grid"),
  /** Individual card by title text */
  cardByTitle: (page: Page, title: string) =>
    page.locator("h3").filter({ hasText: title }),
  /** Delete button on a card (visible on hover) */
  deleteButton: (page: Page) =>
    page.locator('[aria-label="Delete pinned response"]'),
};

// ---------------------------------------------------------------------------
// Pin Modal selectors (current impl: "Pin to Dashboard")
// Note: The design spec calls this "Save Response" posting to /api/pinned,
// but the current implementation posts to /api/dashboards/{id}/pins.
// Tests reflect the CURRENT implementation.
// ---------------------------------------------------------------------------
export const PinModal = {
  dialog: (page: Page) => page.locator('[role="dialog"]'),
  titleInput: (page: Page) =>
    page.locator('[role="dialog"] input').first(),
  /** "Pin to Dashboard" button (current impl) */
  submitButton: (page: Page) =>
    page.locator('[role="dialog"] button').filter({ hasText: /pin to dashboard/i }),
  cancelButton: (page: Page) =>
    page.locator('[role="dialog"] button').filter({ hasText: /cancel/i }),
};

// ---------------------------------------------------------------------------
// Dashboards page selectors
// ---------------------------------------------------------------------------
export const DashboardsPage = {
  heading: (page: Page) =>
    page.getByRole("heading", { name: /dashboards/i }),
  subtitle: (page: Page) =>
    page.getByText(/dashboards are created by the agent/i),
  emptyStateTitle: (page: Page) => page.getByText("No dashboards yet"),
  emptyStateSubtitle: (page: Page) =>
    page.getByText(/ask in chat to create one/i),
  /** All dashboard cards */
  cards: (page: Page) => page.locator("button.rounded-xl, button[class*='rounded-xl']"),
  /** Dashboard card by title */
  cardByTitle: (page: Page, title: string) =>
    page.locator("h3").filter({ hasText: title }),
};

// ---------------------------------------------------------------------------
// Dashboard Detail page selectors
// ---------------------------------------------------------------------------
export const DashboardDetailPage = {
  backButton: (page: Page) =>
    page.locator('[aria-label="Go back"]'),
  title: (page: Page) => page.locator("h1"),
  titleInput: (page: Page) =>
    page.locator('input[class*="text-2xl"]'),
  agentPanelCollapsed: (page: Page) =>
    page.locator('[aria-label="Expand chat panel"]'),
  agentPanelExpanded: (page: Page) =>
    page.locator('[aria-label="Collapse chat panel"]'),
  emptyCanvas: (page: Page) =>
    page.getByText("This dashboard has no tiles yet."),
  canvas: (page: Page) => page.locator(".relative.w-full"),
};

// ---------------------------------------------------------------------------
// Stories index page selectors
// ---------------------------------------------------------------------------
export const StoriesPage = {
  heading: (page: Page) =>
    page.getByRole("heading", { name: /^stories$/i }),
  emptyStateText: (page: Page) =>
    page.getByText("Ask the agent in chat to create a story."),
  /** Story cards */
  cards: (page: Page) =>
    page.locator('a[href^="/stories/"]'),
  cardByTitle: (page: Page, title: string) =>
    page.locator("h3").filter({ hasText: title }),
  deleteButton: (page: Page) => page.locator('[aria-label="Delete story"]'),
};

// ---------------------------------------------------------------------------
// Story Detail page selectors
// ---------------------------------------------------------------------------
export const StoryDetailPage = {
  backButton: (page: Page) =>
    page.locator('[aria-label="Go back"]'),
  title: (page: Page) => page.locator("h1"),
  slideCounter: (page: Page) => page.locator("span").filter({ hasText: /\d+ \/ \d+/ }),
  prevButton: (page: Page) =>
    page.locator('[aria-label="Previous slide"]'),
  nextButton: (page: Page) =>
    page.locator('[aria-label="Next slide"]'),
  presentButton: (page: Page) =>
    page.locator('[aria-label="Enter presentation mode"]'),
  exitPresentButton: (page: Page) =>
    page.locator("button").filter({ has: page.locator(".lucide-minimize-2") }),
  /** Fullscreen presentation overlay (fixed inset-0 z-50) */
  presentationOverlay: (page: Page) =>
    page.locator(".fixed.inset-0.z-50"),
  agentPanelCollapsed: (page: Page) =>
    page.locator('[aria-label="Expand chat panel"]'),
  agentPanelExpanded: (page: Page) =>
    page.locator('[aria-label="Collapse chat panel"]'),
};

// ---------------------------------------------------------------------------
// API helpers for seeding test data
// ---------------------------------------------------------------------------

export async function createTestDashboard(
  request: APIRequestContext,
  overrides: Partial<{ title: string; layout_json: unknown[] }> = {}
) {
  const payload = {
    title: overrides.title ?? "E2E Test Dashboard",
    layout_json: overrides.layout_json ?? [
      {
        id: "tile-1",
        type: "text",
        content: "Test tile content",
        x: 5,
        y: 5,
        w: 40,
        h: 45,
      },
    ],
  };
  const response = await request.post(`${BACKEND_URL}/api/dashboards`, {
    data: payload,
  });
  if (!response.ok()) {
    throw new Error(
      `Failed to create test dashboard: ${response.status()} ${await response.text()}`
    );
  }
  return response.json();
}

export async function createTestStory(
  request: APIRequestContext,
  overrides: Partial<{ title: string; slides_json: unknown[] }> = {}
) {
  const payload = {
    title: overrides.title ?? "E2E Test Story",
    slides_json: overrides.slides_json ?? [
      { id: "s1", title: "Slide One", content: "Content for slide one." },
      { id: "s2", title: "Slide Two", content: "Content for slide two." },
      { id: "s3", title: "Slide Three", content: "Content for slide three." },
    ],
  };
  const response = await request.post(`${BACKEND_URL}/api/stories`, {
    data: payload,
  });
  if (!response.ok()) {
    throw new Error(
      `Failed to create test story: ${response.status()} ${await response.text()}`
    );
  }
  return response.json();
}

export async function createTestPinned(
  request: APIRequestContext,
  overrides: Partial<{ title: string; description: string; content_json: unknown }> = {}
) {
  const payload = {
    title: overrides.title ?? "E2E Test Pinned Response",
    description: overrides.description ?? "Created for E2E testing.",
    content_json: overrides.content_json ?? [{ type: "viz_chart", data: {} }],
  };
  const response = await request.post(`${BACKEND_URL}/api/pinned`, {
    data: payload,
  });
  if (!response.ok()) {
    throw new Error(
      `Failed to create test pinned: ${response.status()} ${await response.text()}`
    );
  }
  return response.json();
}

export async function deleteResource(
  request: APIRequestContext,
  path: string
) {
  try {
    await request.delete(`${BACKEND_URL}${path}`);
  } catch {
    // best-effort cleanup
  }
}

// ---------------------------------------------------------------------------
// Streaming helpers
// ---------------------------------------------------------------------------

export async function waitForStreamingComplete(
  page: Page,
  timeoutMs = TIMEOUT.chatStream
) {
  await page.waitForFunction(
    () => {
      const stopBtn = document.querySelector(
        '[aria-label="Stop generation"]'
      );
      return stopBtn === null || (stopBtn as HTMLElement).offsetParent === null;
    },
    { timeout: timeoutMs }
  );
  await page.waitForTimeout(200);
}

export async function waitForStreamingStart(
  page: Page,
  timeoutMs = 15_000
) {
  await page.waitForFunction(
    () => {
      const stopBtn = document.querySelector('[aria-label="Stop generation"]');
      if (stopBtn !== null) return true;
      const sendBtn = document.querySelector('[aria-label="Send message"]');
      const messageLog = document.querySelector('[role="log"]');
      if (
        sendBtn !== null &&
        messageLog &&
        (messageLog.textContent ?? "").length > 10
      )
        return true;
      return false;
    },
    { timeout: timeoutMs }
  );
}
