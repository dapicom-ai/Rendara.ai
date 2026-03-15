import { test } from '@playwright/test';
import * as fs from 'fs';

const BASE = 'http://localhost:9001';
const OUT = 'docs/screenshots';

test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

test.use({ baseURL: 'http://localhost:9001' });

test('01 home screen', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/01-home.png` });
});

test('02 dashboards index', async ({ page }) => {
  await page.goto(`${BASE}/dashboards`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/02-dashboards-index.png` });
});

test('03 dashboard detail', async ({ page }) => {
  await page.goto(`${BASE}/dashboards`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  // Try to find a dashboard card link
  const link = page.locator('a').filter({ hasText: /.+/ }).nth(2);
  const href = await link.getAttribute('href').catch(() => null);
  if (href && href.includes('/dashboards/')) {
    await page.goto(`${BASE}${href}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/03-dashboard-detail.png` });
  } else {
    await page.screenshot({ path: `${OUT}/03-dashboard-empty.png` });
  }
});

test('04 stories index', async ({ page }) => {
  await page.goto(`${BASE}/stories`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/04-stories-index.png` });
});

test('05 story detail', async ({ page }) => {
  await page.goto(`${BASE}/stories`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  const link = page.locator('a').filter({ hasText: /.+/ }).nth(2);
  const href = await link.getAttribute('href').catch(() => null);
  if (href && href.includes('/stories/')) {
    await page.goto(`${BASE}${href}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/05-story-detail.png` });
  } else {
    await page.screenshot({ path: `${OUT}/05-story-empty.png` });
  }
});

test('06 pinned page', async ({ page }) => {
  await page.goto(`${BASE}/pinned`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/06-pinned.png` });
});
