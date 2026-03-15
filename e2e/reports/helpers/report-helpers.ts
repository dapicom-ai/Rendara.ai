/**
 * Report test helpers — shared page objects, API helpers, and constants.
 *
 * Used by all report E2E test files under tests/e2e/reports/.
 */

import { Page, APIRequestContext, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001";
export const SCREENSHOT_DIR = path.join(
  process.cwd(),
  "test-screenshots",
  "reports"
);

/** Timeouts used across tests */
export const TIMEOUTS = {
  navigation: 10_000,
  api: 5_000,
  streaming: 30_000,
  load: 3_000,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportSection {
  id: string;
  type: "heading" | "text" | "viz_chart" | "mermaid";
  content: string;
  title?: string;
}

export interface APIReport {
  id: string;
  title: string;
  content: ReportSection[];
  public_uuid: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublishResult {
  public_url: string;
  public_uuid: string;
}

// ---------------------------------------------------------------------------
// Screenshot helper
// ---------------------------------------------------------------------------

export function ensureScreenshotDir(): void {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

export function screenshotPath(name: string): string {
  return path.join(SCREENSHOT_DIR, name);
}

// ---------------------------------------------------------------------------
// API Helpers
// ---------------------------------------------------------------------------

/**
 * Create a report via the backend API. Returns the full report object.
 */
export async function createReport(
  request: APIRequestContext,
  title: string,
  content: ReportSection[] = []
): Promise<APIReport> {
  const res = await request.post(`${BACKEND_URL}/api/reports`, {
    data: { title, content },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

/**
 * Update a report via PUT.
 */
export async function updateReport(
  request: APIRequestContext,
  reportId: string,
  title: string,
  content: ReportSection[]
): Promise<APIReport> {
  const res = await request.put(`${BACKEND_URL}/api/reports/${reportId}`, {
    data: { title, content },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

/**
 * Publish a report via API. Returns { public_url, public_uuid }.
 */
export async function publishReport(
  request: APIRequestContext,
  reportId: string
): Promise<PublishResult> {
  const res = await request.post(
    `${BACKEND_URL}/api/reports/${reportId}/publish`
  );
  expect(res.ok()).toBeTruthy();
  return res.json();
}

/**
 * Fetch a report by ID.
 */
export async function getReport(
  request: APIRequestContext,
  reportId: string
): Promise<APIReport> {
  const res = await request.get(`${BACKEND_URL}/api/reports/${reportId}`);
  expect(res.ok()).toBeTruthy();
  return res.json();
}

/**
 * Create a report with predefined heading + text sections for builder tests.
 */
export async function createReportWithSections(
  request: APIRequestContext,
  title: string = "Test Report"
): Promise<APIReport> {
  return createReport(request, title, [
    { id: "sec-h1", type: "heading", content: "Test Heading" },
    { id: "sec-t1", type: "text", content: "Test paragraph content." },
  ]);
}

/**
 * Create and publish a report. Returns both report data and publish result.
 */
export async function createAndPublishReport(
  request: APIRequestContext,
  title: string = "Published Test Report",
  content: ReportSection[] = [
    { id: "sec-h1", type: "heading", content: "Published Heading" },
    { id: "sec-t1", type: "text", content: "Published paragraph content." },
  ]
): Promise<{ report: APIReport; publish: PublishResult }> {
  const report = await createReport(request, title, content);
  const publish = await publishReport(request, report.id);
  return { report, publish };
}

// ---------------------------------------------------------------------------
// Page Object: Reports Index
// ---------------------------------------------------------------------------

export class ReportsIndexPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${BASE_URL}/reports`, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUTS.navigation,
    });
  }

  get heading() {
    return this.page.getByRole("heading", { name: /^reports$/i });
  }

  get subtitle() {
    return this.page.getByText(/build and publish data stories/i);
  }

  get newReportButton() {
    return this.page.getByRole("button", { name: /new report/i });
  }

  get reportCards() {
    return this.page.locator("button").filter({ has: this.page.locator("h3") });
  }

  get emptyStateTitle() {
    return this.page.getByText("No reports yet");
  }

  get emptyStateCTA() {
    return this.page.getByRole("button", { name: /create report/i });
  }

  async waitForLoad() {
    // Wait for either cards or empty state to appear
    await Promise.race([
      this.page.locator("h3").first().waitFor({ timeout: TIMEOUTS.load }),
      this.emptyStateTitle.waitFor({ timeout: TIMEOUTS.load }),
    ]).catch(() => {
      // loading skeleton may still be showing; that is OK
    });
  }

  async clickNewReport() {
    await this.newReportButton.click();
    await this.page.waitForURL(/\/reports\/[a-z0-9-]+/, {
      timeout: TIMEOUTS.navigation,
    });
  }

  getCardByTitle(title: string) {
    return this.reportCards.filter({
      has: this.page.locator("h3", { hasText: title }),
    });
  }

  async screenshot(name: string) {
    await this.page.screenshot({
      path: screenshotPath(name),
      fullPage: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Page Object: Report Builder
// ---------------------------------------------------------------------------

export class ReportBuilderPage {
  constructor(private page: Page) {}

  async goto(reportId: string) {
    await this.page.goto(`${BASE_URL}/reports/${reportId}`, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUTS.navigation,
    });
  }

  get backButton() {
    return this.page.locator("[aria-label='Go back']");
  }

  get titleHeading() {
    return this.page.locator("h1");
  }

  get titleInput() {
    return this.page.locator(
      "input.bg-transparent.text-3xl"
    );
  }

  get addHeadingButton() {
    return this.page.getByRole("button", { name: /add heading/i });
  }

  get addTextButton() {
    return this.page.getByRole("button", { name: /add text/i });
  }

  get publishButton() {
    return this.page.getByRole("button", { name: /publish/i });
  }

  get publishedButton() {
    return this.page.getByRole("button", { name: /published/i });
  }

  get sectionBlocks() {
    return this.page.locator(".rounded-xl.border.border-border.bg-surface.p-6");
  }

  get deleteButtons() {
    return this.page.locator("[aria-label='Delete section']");
  }

  getMoveUpButton(sectionIndex: number) {
    return this.sectionBlocks
      .nth(sectionIndex)
      .locator("[aria-label='Move up']");
  }

  getMoveDownButton(sectionIndex: number) {
    return this.sectionBlocks
      .nth(sectionIndex)
      .locator("[aria-label='Move down']");
  }

  getDeleteButton(sectionIndex: number) {
    return this.sectionBlocks
      .nth(sectionIndex)
      .locator("[aria-label='Delete section']");
  }

  /**
   * Get section heading text (h2 inside a section block).
   */
  getSectionHeading(sectionIndex: number) {
    return this.sectionBlocks.nth(sectionIndex).locator("h2");
  }

  /**
   * Get section paragraph text (p inside a section block).
   */
  getSectionText(sectionIndex: number) {
    return this.sectionBlocks.nth(sectionIndex).locator("p");
  }

  async waitForLoad() {
    await this.addHeadingButton.waitFor({ timeout: TIMEOUTS.load });
  }

  async clickTitle() {
    await this.titleHeading.click();
  }

  async editTitle(newTitle: string) {
    await this.clickTitle();
    await this.titleInput.waitFor({ timeout: 2000 });
    await this.titleInput.fill(newTitle);
    // Blur by clicking elsewhere
    await this.page.locator("body").click({ position: { x: 0, y: 0 } });
  }

  async addHeading() {
    await this.addHeadingButton.click();
  }

  async addText() {
    await this.addTextButton.click();
  }

  async screenshot(name: string) {
    await this.page.screenshot({
      path: screenshotPath(name),
      fullPage: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Page Object: Public Report Consumer
// ---------------------------------------------------------------------------

export class ReportConsumerPage {
  constructor(private page: Page) {}

  async goto(uuid: string) {
    await this.page.goto(`${BASE_URL}/r/${uuid}`, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUTS.navigation,
    });
  }

  get title() {
    return this.page.locator("main h1");
  }

  get footer() {
    return this.page.locator("footer");
  }

  get poweredByText() {
    return this.page.getByText("Powered by Rendara");
  }

  get publishedDate() {
    return this.page.locator("header").getByText(/published/i);
  }

  get sidebarNav() {
    return this.page.getByRole("complementary");
  }

  get scrollToTopButton() {
    return this.page.locator("[aria-label='Scroll to top']");
  }

  get headingSections() {
    return this.page.locator("main h2");
  }

  get textSections() {
    return this.page.locator(
      "main .text-pretty.text-base.text-primary.leading-relaxed"
    );
  }

  /** Check if any edit controls are present (they should not be) */
  get addHeadingButton() {
    return this.page.getByRole("button", { name: /add heading/i });
  }

  get addTextButton() {
    return this.page.getByRole("button", { name: /add text/i });
  }

  get deleteButtons() {
    return this.page.locator("[aria-label='Delete section']");
  }

  async waitForLoad() {
    await this.title.waitFor({ timeout: TIMEOUTS.load });
  }

  /**
   * Check if page crashed (Next.js error overlay).
   */
  async hasCrashed(): Promise<boolean> {
    const text = (await this.page.locator("body").textContent()) ?? "";
    return (
      text.includes("Application error") ||
      text.includes("client-side exception")
    );
  }

  async screenshot(name: string) {
    await this.page.screenshot({
      path: screenshotPath(name),
      fullPage: true,
    });
  }
}
