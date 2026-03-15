/**
 * Chart and Viz Tests — TC-VIZ-001 through TC-VIZ-014
 *
 * These tests verify that all chart types, diagram types, and viz error states
 * render correctly in the Rendara chat interface.
 *
 * Test data seeded in demo.db:
 *   - viz-test-area-001         : area chart (cumulative revenue)
 *   - viz-test-composed-001     : composed chart (bar + line dual-axis)
 *   - viz-test-kpi-001          : KPI scorecard attempt (expected error state)
 *   - viz-test-invalid-mermaid-001 : invalid mermaid syntax (error display)
 *   - viz-test-tool-error-001   : run_sql failure (tool call error)
 *   - mmp0v1s5-jolbij4a         : executive dashboard with line + bar + pie + mermaid
 *
 * Known FAIL conditions (production bugs, not test setup issues):
 *   TC-VIZ-005: Scatter — AI model emits JSON in text body instead of viz_block SSE event
 *   TC-VIZ-007: KPI    — AI generates {metric, value} but validator requires {label, value, format, trend}
 *   TC-VIZ-014: Tool error indicator — tool_call blocks with success:false are silently dropped from render
 *
 * Environment:
 *   Frontend: http://localhost:3000
 *   Backend:  http://localhost:8001
 *
 * NOTE: The dev server runs with HMR/Fast Refresh, which rebuilds every ~100-300ms.
 * This causes page redirects during long waits. Tests use immediate snapshots and
 * browser_evaluate patterns to avoid timing issues with HMR-triggered navigation.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Ensure screenshot directory exists
const screenshotDir = path.join(process.cwd(), 'test-screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// ─── TC-VIZ-001: Bar Chart ────────────────────────────────────────────────────
test('TC-VIZ-001: Bar chart renders with correct axes and bars', async ({ page }) => {
  // Navigate to conversation with bar chart (customer count by region)
  await page.goto('/c/mmp0v1s5-jolbij4a', { waitUntil: 'domcontentloaded' });

  // Wait for chat messages to load
  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // The executive dashboard has a bar chart: "Q4 2024 Revenue by Region"
  // Verify bar chart region labels appear in the DOM
  const chatLog = page.locator('[role="log"]');
  await expect(chatLog).toContainText('North America', { timeout: 10000 });

  // Verify expand button is present for the bar chart
  const expandButtons = page.getByLabel('Expand chart');
  await expect(expandButtons.first()).toBeVisible();

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-001-bar-chart.png') });
});

// ─── TC-VIZ-002: Line Chart ───────────────────────────────────────────────────
test('TC-VIZ-002: Line chart renders with time-series x-axis', async ({ page }) => {
  await page.goto('/c/mmp0v1s5-jolbij4a', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Executive dashboard line chart: "Q4 2024 Monthly Revenue Trend" — Oct/Nov/Dec
  const chatLog = page.locator('[role="log"]');
  await expect(chatLog).toContainText('October', { timeout: 10000 });
  await expect(chatLog).toContainText('November');
  await expect(chatLog).toContainText('December');

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-002-line-chart.png') });
});

// ─── TC-VIZ-003: Area Chart ───────────────────────────────────────────────────
test('TC-VIZ-003: Area chart renders with filled area series', async ({ page }) => {
  await page.goto('/c/viz-test-area-001', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Area chart conversation: monthly cumulative revenue
  const expandButton = page.getByLabel('Expand chart');
  await expect(expandButton).toBeVisible({ timeout: 10000 });

  // Recharts renders area as SVG path elements with fill
  const svgArea = page.locator('.recharts-area-area');
  await expect(svgArea).toBeVisible({ timeout: 10000 });

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-003-area-chart.png') });
});

// ─── TC-VIZ-004: Pie Chart ────────────────────────────────────────────────────
test('TC-VIZ-004: Pie chart renders with legend labels', async ({ page }) => {
  await page.goto('/c/mmp0v1s5-jolbij4a', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Executive dashboard pie: "Q4 2024 Revenue by Product Category"
  // Legend items should be visible
  await expect(page.getByText('Cloud Services')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Enterprise Solutions')).toBeVisible();
  await expect(page.getByText('Hardware')).toBeVisible();
  await expect(page.getByText('Professional Services')).toBeVisible();

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-004-pie-chart.png') });
});

// ─── TC-VIZ-005: Scatter Chart ────────────────────────────────────────────────
// KNOWN FAIL: AI model does not reliably emit a viz_block SSE event for scatter
// charts. Instead it embeds the JSON spec in the text body. The scatter chart
// conversations (viz-test-scatter-001, viz-test-scatter-002) do not contain
// viz_chart content blocks.
test.fail('TC-VIZ-005: Scatter chart renders with scatter points [KNOWN FAIL - AI model behavior]', async ({ page }) => {
  await page.goto('/c/viz-test-scatter-001', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Scatter chart should have an expand button — this FAILS because no viz_block
  // was emitted by the AI for this conversation
  const expandButton = page.getByLabel('Expand chart');
  await expect(expandButton).toBeVisible({ timeout: 10000 });

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-005-scatter-chart.png') });
});

// ─── TC-VIZ-006: Composed Chart ───────────────────────────────────────────────
test('TC-VIZ-006: Composed chart renders bar and line series with dual Y-axes', async ({ page }) => {
  await page.goto('/c/viz-test-composed-001', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Composed chart: Monthly Revenue vs Cumulative Revenue (2024)
  const expandButton = page.getByLabel('Expand chart');
  await expect(expandButton).toBeVisible({ timeout: 10000 });

  // Both series should appear in the Recharts legend
  await expect(page.getByText('monthly_revenue')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('cumulative_revenue')).toBeVisible();

  // Month x-axis labels
  await expect(page.getByText('Jan')).toBeVisible();
  await expect(page.getByText('Dec')).toBeVisible();

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-006-composed-chart.png') });
});

// ─── TC-VIZ-007: KPI Scorecard ────────────────────────────────────────────────
// KNOWN FAIL: AI generates { metric, value } but isValidKpiSpec() requires
// { label, value (number), format, trend }. The KPI block renders VizErrorCard
// ("Invalid KPI data") instead of the scorecard grid.
test.fail('TC-VIZ-007: KPI scorecard renders metric cards with values and trends [KNOWN FAIL - schema mismatch]', async ({ page }) => {
  await page.goto('/c/viz-test-kpi-001', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Should render KPI metric cards — this FAILS because the KPI spec is invalid
  // (AI uses {metric, value} but validator requires {label, value, format, trend})
  await expect(page.getByText('Total Customers')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Total Revenue')).toBeVisible();

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-007-kpi-scorecard.png') });
});

// ─── TC-VIZ-008: Expand Overlay ───────────────────────────────────────────────
test('TC-VIZ-008: Expand overlay opens on button click and closes with ESC', async ({ page }) => {
  await page.goto('/c/viz-test-composed-001', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Click the expand button
  const expandButton = page.getByLabel('Expand chart');
  await expect(expandButton).toBeVisible({ timeout: 10000 });
  await expandButton.click();

  // Overlay should appear — look for close button
  const closeButton = page.getByLabel('Close expanded view');
  await expect(closeButton).toBeVisible({ timeout: 5000 });

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-008-expand-overlay.png') });

  // Close with ESC key
  await page.keyboard.press('Escape');
  await expect(closeButton).not.toBeVisible({ timeout: 5000 });
});

// ─── TC-VIZ-009: Mermaid Diagram ─────────────────────────────────────────────
test('TC-VIZ-009: Mermaid diagram renders as SVG with nodes and edges', async ({ page }) => {
  await page.goto('/c/mmp0v1s5-jolbij4a', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Executive dashboard has mermaid flowchart: sales pipeline
  const expandButton = page.getByLabel('Expand diagram');
  await expect(expandButton).toBeVisible({ timeout: 10000 });

  // Mermaid renders SVG — check SVG is present
  const mermaidSvg = page.locator('.mermaid svg');
  await expect(mermaidSvg).toBeVisible({ timeout: 10000 });

  // Flowchart nodes should be visible
  await expect(page.getByText('Customer Success')).toBeVisible();

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-009-mermaid.png') });
});

// ─── TC-VIZ-010: Mixed Content ────────────────────────────────────────────────
test('TC-VIZ-010: Mixed text + chart response renders in correct order', async ({ page }) => {
  await page.goto('/c/mmp0v1s5-jolbij4a', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Executive dashboard: text → chart → text → chart → ... interleaved
  // Verify both text sections and charts coexist in the response
  const chatLog = page.locator('[role="log"]');

  // Text content
  await expect(chatLog).toContainText('Q4 2024 Executive Dashboard', { timeout: 10000 });
  await expect(chatLog).toContainText('Revenue Performance');
  await expect(chatLog).toContainText('Key Takeaways');

  // Charts present
  const expandButtons = page.getByLabel('Expand chart');
  await expect(expandButtons).toHaveCount(3, { timeout: 10000 }); // line + bar + pie

  // Mermaid present
  const expandDiagram = page.getByLabel('Expand diagram');
  await expect(expandDiagram).toBeVisible();

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-010-mixed-content.png') });
});

// ─── TC-VIZ-011: MultiVizCard / Multiple Charts in One Response ───────────────
test('TC-VIZ-011: Multiple viz blocks in one response each render independently', async ({ page }) => {
  await page.goto('/c/mmp0v1s5-jolbij4a', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Executive dashboard: 3 charts (line, bar, pie) + 1 mermaid in one AI message
  const expandChartButtons = page.getByLabel('Expand chart');
  await expect(expandChartButtons).toHaveCount(3, { timeout: 10000 });

  const expandDiagramButton = page.getByLabel('Expand diagram');
  await expect(expandDiagramButton).toBeVisible();

  // Each chart has its own title visible
  await expect(page.getByText('Q4 2024 Monthly Revenue Trend')).toBeVisible();
  await expect(page.getByText('Q4 2024 Revenue by Region')).toBeVisible();
  await expect(page.getByText('Q4 2024 Revenue by Product Category')).toBeVisible();

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-011-multiviz-grid.png') });
});

// ─── TC-VIZ-012: Chart Tooltip ────────────────────────────────────────────────
test('TC-VIZ-012: Chart tooltip appears on hover with correct data values', async ({ page }) => {
  await page.goto('/c/viz-test-composed-001', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Open expanded overlay for better hover target size
  const expandButton = page.getByLabel('Expand chart');
  await expect(expandButton).toBeVisible({ timeout: 10000 });
  await expandButton.click();

  // Wait for overlay
  const closeButton = page.getByLabel('Close expanded view');
  await expect(closeButton).toBeVisible({ timeout: 5000 });

  // Hover over the Recharts surface to trigger tooltip
  const chartArea = page.locator('.recharts-surface').first();
  await expect(chartArea).toBeVisible({ timeout: 5000 });

  // Hover at a data point (center of the chart area)
  const bbox = await chartArea.boundingBox();
  if (bbox) {
    await page.mouse.move(bbox.x + bbox.width * 0.4, bbox.y + bbox.height * 0.5);
  }

  // Tooltip should appear with data values
  const tooltip = page.locator('.recharts-tooltip-wrapper');
  await expect(tooltip).toBeVisible({ timeout: 3000 });

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-012-chart-tooltip.png') });

  // Close overlay
  await page.keyboard.press('Escape');
});

// ─── TC-VIZ-013: Invalid Mermaid Syntax ─────────────────────────────────────
test('TC-VIZ-013: Invalid mermaid syntax shows parse error without crashing', async ({ page }) => {
  await page.goto('/c/viz-test-invalid-mermaid-001', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Should NOT crash — text content still renders
  await expect(page.getByText('Here is a flowchart showing the customer lifecycle')).toBeVisible({ timeout: 10000 });

  // Error message should be displayed inline (Mermaid error state)
  await expect(page.getByText(/Error: Parse error/)).toBeVisible({ timeout: 10000 });

  // The expand diagram button should still be present
  const expandButton = page.getByLabel('Expand diagram');
  await expect(expandButton).toBeVisible();

  // No page crash — input is still functional
  await expect(page.getByPlaceholder('Ask anything about your data...')).toBeVisible();

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-013-invalid-mermaid.png') });
});

// ─── TC-VIZ-014: Tool Call Error Indicator ───────────────────────────────────
// KNOWN FAIL: The ConversationLoader maps tool_call blocks (success:false) to
// assistant-ui tool-call content, but there is no registered makeAssistantToolUI
// handler for "run_sql". The tool call block is silently not rendered — no visual
// error indicator (red badge, error card) is displayed in the UI.
test.fail('TC-VIZ-014: Tool call error displays visual error indicator [KNOWN FAIL - no tool UI registered for run_sql]', async ({ page }) => {
  await page.goto('/c/viz-test-tool-error-001', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 10000 });

  // Should show a visual error indicator for the failed tool call
  // This FAILS — only the text response is visible, no error badge/card
  const errorIndicator = page.locator('[data-tool-error], .tool-error, [aria-label*="error"], [aria-label*="failed"]');
  await expect(errorIndicator).toBeVisible({ timeout: 10000 });

  await page.screenshot({ path: path.join(screenshotDir, 'TC-VIZ-014-tool-error.png') });
});
