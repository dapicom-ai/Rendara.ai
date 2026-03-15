import { test } from '@playwright/test';

const BASE = 'http://localhost:9001';
const DASH_ID = '5f652f19-7571-471d-9656-344751799f7f'; 

test.use({ baseURL: BASE });

test('dashboard detail with charts', async ({ page }) => {
  await page.goto(`${BASE}/dashboards/${DASH_ID}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/screenshots/04-dashboard-detail.png' });
});

test('dashboard index real', async ({ page }) => {
  await page.goto(`${BASE}/dashboards`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'docs/screenshots/03-dashboards-index.png' });
});
