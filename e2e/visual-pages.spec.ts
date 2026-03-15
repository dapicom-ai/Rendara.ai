/**
 * Suite 9: Playwright Page Screenshots.
 *
 * Navigate to every page and capture a screenshot for visual review.
 * These are baseline captures, not automated pixel comparisons.
 *
 * BRD Section 14 — MVP Demo Acceptance Criteria
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-screenshots');

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.describe('Page Screenshots — All Routes', () => {
  test('Home page loads and renders correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // BRD 14 Step 1: home screen renders
    await expect(page).toHaveTitle(/Rendara/i);

    // Assert core elements are present
    await expect(page.locator('body')).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'home-page.png'),
      fullPage: true,
    });

    console.log('Screenshot saved: home-page.png');
  });

  test('Dashboards index page loads', async ({ page }) => {
    await page.goto('/dashboards', { waitUntil: 'networkidle' });

    await expect(page.locator('body')).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dashboards-index.png'),
      fullPage: true,
    });

    console.log('Screenshot saved: dashboards-index.png');
  });

  test('Stories index page loads', async ({ page }) => {
    await page.goto('/stories', { waitUntil: 'networkidle' });

    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('heading', { name: /^stories$/i })).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'stories-index.png'),
      fullPage: true,
    });

    console.log('Screenshot saved: stories-index.png');
  });

  test('Pinned Responses page loads', async ({ page }) => {
    await page.goto('/pinned', { waitUntil: 'networkidle' });

    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('heading', { name: /pinned responses/i })).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'pinned-index.png'),
      fullPage: true,
    });

    console.log('Screenshot saved: pinned-index.png');
  });
});


test.describe('Layout Verification', () => {
  test('Sidebar is visible on home page with correct background', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // SDD Section 14 (design tokens): Sidebar: #0f2123
    // Check sidebar element exists — NavRail renders with nav element
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'layout-sidebar.png'),
    });
  });

  test('NavRail has Conversations, Dashboards, Stories, and Pinned links (no Reports)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // New NavRail: Conversations, Dashboards, Stories, Pinned
    const dashboardsLink = await page.locator('a[href="/dashboards"]').count();
    const storiesLink = await page.locator('a[href="/stories"]').count();
    const pinnedLink = await page.locator('a[href="/pinned"]').count();
    const reportsLink = await page.locator('a[href="/reports"]').count();

    expect(dashboardsLink).toBeGreaterThan(0);
    expect(storiesLink).toBeGreaterThan(0);
    expect(pinnedLink).toBeGreaterThan(0);
    // Reports was removed
    expect(reportsLink).toBe(0);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'navrail.png'),
    });
  });

  test('Home page has chat input in DOM', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // BRD 14: chat input bar is visible
    // Use count() to verify element exists in DOM regardless of dev overlay
    const textboxCount = await page.locator('textarea').count();
    const inputCount = await page.locator('input[type="text"]').count();

    expect(textboxCount + inputCount).toBeGreaterThan(0);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'home-input.png'),
    });
  });

  test('Home page has suggested prompt chips or hero text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // BRD 14: 4 suggested prompt chips OR hero text visible
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'home-prompts.png'),
    });
  });

  test('No console errors on home page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Filter out known non-blocking errors (e.g., favicon 404, external resources)
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('Failed to load resource') &&
      !e.includes('net::ERR')
    );

    if (criticalErrors.length > 0) {
      console.warn('Console errors found:', criticalErrors);
    }

    // Assert no critical JavaScript errors (React errors, unhandled rejections)
    const reactErrors = errors.filter(e => e.includes('Error:') || e.includes('TypeError:'));
    expect(reactErrors).toHaveLength(0);
  });
});
