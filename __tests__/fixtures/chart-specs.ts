import type { VizSpec } from '@/types/viz';

// ---------------------------------------------------------------------------
// 1. Grouped Multi-Series Bar — Revenue vs Cost by plan (5 plans, 2 series)
// ---------------------------------------------------------------------------
export const groupedMultiSeriesBar: VizSpec = {
  type: 'bar',
  title: 'Revenue vs Cost by Plan',
  xKey: 'plan',
  yKey: 'revenue_sgd',
  data: [
    { plan: 'Basic 30',     revenue_sgd: 42500, cost_sgd: 28300 },
    { plan: 'Smart 50',     revenue_sgd: 58700, cost_sgd: 35100 },
    { plan: 'Premium Plus', revenue_sgd: 61200, cost_sgd: 33800 },
    { plan: 'Data Max',     revenue_sgd: 47800, cost_sgd: 31200 },
    { plan: 'Flexi 100',    revenue_sgd: 53400, cost_sgd: 29600 },
  ],
  config: {
    series: [
      { key: 'revenue_sgd', label: 'Revenue', format: 'currency' },
      { key: 'cost_sgd',    label: 'Cost',    format: 'currency' },
    ],
    formatY: 'currency',
    legendPosition: 'top',
  },
};

// ---------------------------------------------------------------------------
// 2. Stacked Bar — Revenue composition by segment across 6 months
// ---------------------------------------------------------------------------
export const stackedBarChart: VizSpec = {
  type: 'bar',
  title: 'Revenue Composition by Segment',
  xKey: 'month',
  yKey: 'consumer_sgd',
  data: [
    { month: 'Jul 2024', consumer_sgd: 18200, business_sgd: 24500, enterprise_sgd: 14800 },
    { month: 'Aug 2024', consumer_sgd: 19100, business_sgd: 25300, enterprise_sgd: 15200 },
    { month: 'Sep 2024', consumer_sgd: 17800, business_sgd: 26100, enterprise_sgd: 15900 },
    { month: 'Oct 2024', consumer_sgd: 20400, business_sgd: 27800, enterprise_sgd: 16300 },
    { month: 'Nov 2024', consumer_sgd: 21200, business_sgd: 28400, enterprise_sgd: 16800 },
    { month: 'Dec 2024', consumer_sgd: 22800, business_sgd: 29100, enterprise_sgd: 17500 },
  ],
  config: {
    series: [
      { key: 'consumer_sgd',   label: 'Consumer',   stackId: 'revenue', format: 'currency' },
      { key: 'business_sgd',   label: 'Business',   stackId: 'revenue', format: 'currency' },
      { key: 'enterprise_sgd', label: 'Enterprise', stackId: 'revenue', format: 'currency' },
    ],
    stacked: true,
    formatY: 'currency',
    legendPosition: 'bottom',
  },
};

// ---------------------------------------------------------------------------
// 3. Multi-Line Time Series — ARPU, Churn Rate, Retention Rate over 12 months
// ---------------------------------------------------------------------------
export const multiLineTimeSeries: VizSpec = {
  type: 'line',
  title: 'ARPU, Churn Rate & Retention Rate (2024)',
  xKey: 'month',
  yKey: 'arpu_sgd',
  data: [
    { month: 'Jan', arpu_sgd: 17.20, churn_rate_pct: 1.8, retention_rate_pct: 85.2 },
    { month: 'Feb', arpu_sgd: 17.50, churn_rate_pct: 1.7, retention_rate_pct: 85.8 },
    { month: 'Mar', arpu_sgd: 18.10, churn_rate_pct: 1.5, retention_rate_pct: 86.5 },
    { month: 'Apr', arpu_sgd: 18.40, churn_rate_pct: 1.4, retention_rate_pct: 87.1 },
    { month: 'May', arpu_sgd: 19.00, churn_rate_pct: 1.3, retention_rate_pct: 87.9 },
    { month: 'Jun', arpu_sgd: 19.30, churn_rate_pct: 1.2, retention_rate_pct: 88.3 },
    { month: 'Jul', arpu_sgd: 19.80, churn_rate_pct: 1.1, retention_rate_pct: 88.8 },
    { month: 'Aug', arpu_sgd: 20.20, churn_rate_pct: 1.0, retention_rate_pct: 89.4 },
    { month: 'Sep', arpu_sgd: 20.50, churn_rate_pct: 0.9, retention_rate_pct: 89.9 },
    { month: 'Oct', arpu_sgd: 21.10, churn_rate_pct: 0.8, retention_rate_pct: 90.5 },
    { month: 'Nov', arpu_sgd: 21.80, churn_rate_pct: 0.7, retention_rate_pct: 91.2 },
    { month: 'Dec', arpu_sgd: 22.30, churn_rate_pct: 0.6, retention_rate_pct: 91.8 },
  ],
  config: {
    series: [
      { key: 'arpu_sgd',          label: 'ARPU (SGD)',        format: 'currency',   yAxisId: 'left' },
      { key: 'churn_rate_pct',    label: 'Churn Rate (%)',    format: 'percentage', yAxisId: 'right' },
      { key: 'retention_rate_pct', label: 'Retention Rate (%)', format: 'percentage', yAxisId: 'right' },
    ],
    legendPosition: 'top',
  },
};

// ---------------------------------------------------------------------------
// 4. Composed — Revenue bars + Margin% line + Target line over 6 months
// ---------------------------------------------------------------------------
export const composedBarsAndLines: VizSpec = {
  type: 'composed',
  title: 'Revenue, Margin & Target',
  xKey: 'month',
  yKey: 'revenue_sgd',
  data: [
    { month: 'Jul 2024', revenue_sgd: 48200, margin_pct: 32.1, target_pct: 35.0 },
    { month: 'Aug 2024', revenue_sgd: 51400, margin_pct: 33.8, target_pct: 35.0 },
    { month: 'Sep 2024', revenue_sgd: 49800, margin_pct: 31.5, target_pct: 35.0 },
    { month: 'Oct 2024', revenue_sgd: 54600, margin_pct: 34.2, target_pct: 35.0 },
    { month: 'Nov 2024', revenue_sgd: 57100, margin_pct: 35.7, target_pct: 35.0 },
    { month: 'Dec 2024', revenue_sgd: 59800, margin_pct: 36.4, target_pct: 35.0 },
  ],
  config: {
    series: [
      { key: 'revenue_sgd', label: 'Revenue',   chartType: 'bar',  format: 'currency', yAxisId: 'left' },
      { key: 'margin_pct',  label: 'Margin %',  chartType: 'line', format: 'percentage', yAxisId: 'right' },
      { key: 'target_pct',  label: 'Target %',  chartType: 'line', format: 'percentage', yAxisId: 'right', emphasis: 'muted' },
    ],
    legendPosition: 'top',
  },
};

// ---------------------------------------------------------------------------
// 5. Ranked Horizontal Bar — Top 10 plans by subscribers, highlighted plan
// ---------------------------------------------------------------------------
export const rankedHorizontalBar: VizSpec = {
  type: 'bar',
  title: 'Top 10 Plans by Subscriber Count',
  xKey: 'plan',
  yKey: 'subscriber_count',
  data: [
    { plan: 'Premium Plus',   subscriber_count: 4820 },
    { plan: 'Smart 50',       subscriber_count: 4310 },
    { plan: 'Data Max',       subscriber_count: 3970 },
    { plan: 'Flexi 100',      subscriber_count: 3650 },
    { plan: 'Basic 30',       subscriber_count: 3420 },
    { plan: 'Youth Bundle',   subscriber_count: 2980 },
    { plan: 'Night Owl',      subscriber_count: 2540 },
    { plan: 'Weekend Special', subscriber_count: 2210 },
    { plan: 'Starter 15',     subscriber_count: 1870 },
    { plan: 'Pay-As-You-Go',  subscriber_count: 1450 },
  ],
  config: {
    orientation: 'horizontal',
    sort: 'desc',
    highlights: ['Premium Plus'],
    formatY: 'number',
    legendPosition: 'none',
  },
};

// ---------------------------------------------------------------------------
// 6. Line Chart with Target Reference Line — Monthly churn rate
// ---------------------------------------------------------------------------
export const chartWithReferenceLine: VizSpec = {
  type: 'line',
  title: 'Monthly Churn Rate vs Target',
  xKey: 'month',
  yKey: 'churn_rate_pct',
  data: [
    { month: 'Jan', churn_rate_pct: 2.4 },
    { month: 'Feb', churn_rate_pct: 2.2 },
    { month: 'Mar', churn_rate_pct: 2.5 },
    { month: 'Apr', churn_rate_pct: 2.1 },
    { month: 'May', churn_rate_pct: 1.9 },
    { month: 'Jun', churn_rate_pct: 1.8 },
    { month: 'Jul', churn_rate_pct: 2.0 },
    { month: 'Aug', churn_rate_pct: 1.7 },
    { month: 'Sep', churn_rate_pct: 1.5 },
    { month: 'Oct', churn_rate_pct: 1.6 },
    { month: 'Nov', churn_rate_pct: 1.4 },
    { month: 'Dec', churn_rate_pct: 1.3 },
  ],
  config: {
    referenceLines: [
      { y: 2.0, label: 'Target (2.0%)', color: '#F59E0B', strokeDasharray: '6 3' },
    ],
    formatY: 'percentage',
    legendPosition: 'none',
  },
};

// ---------------------------------------------------------------------------
// 7. Muted Non-Focus Categories — 8 regions, only Central and West highlighted
// ---------------------------------------------------------------------------
export const mutedNonFocusCategories: VizSpec = {
  type: 'bar',
  title: 'Revenue by Region (Central & West Focus)',
  xKey: 'region',
  yKey: 'revenue_sgd',
  data: [
    { region: 'Central',   revenue_sgd: 58200 },
    { region: 'West',      revenue_sgd: 52100 },
    { region: 'East',      revenue_sgd: 47300 },
    { region: 'North',     revenue_sgd: 43800 },
    { region: 'South',     revenue_sgd: 41500 },
    { region: 'Coastal',   revenue_sgd: 38900 },
    { region: 'Highlands', revenue_sgd: 35200 },
    { region: 'Metro',     revenue_sgd: 49600 },
  ],
  config: {
    highlights: ['Central', 'West'],
    formatY: 'currency',
    sort: 'desc',
    legendPosition: 'none',
  },
};

// ---------------------------------------------------------------------------
// 8. Share-of-Total Pie — Revenue share by 5 plan tiers
// ---------------------------------------------------------------------------
export const shareOfTotalPie: VizSpec = {
  type: 'pie',
  title: 'Revenue Share by Plan Tier',
  xKey: 'tier',
  yKey: 'revenue_sgd',
  data: [
    { tier: 'Premium',    revenue_sgd: 61200 },
    { tier: 'Standard',   revenue_sgd: 53400 },
    { tier: 'Basic',      revenue_sgd: 42500 },
    { tier: 'Enterprise', revenue_sgd: 38700 },
    { tier: 'Starter',    revenue_sgd: 24800 },
  ],
  config: {
    formatY: 'currency',
    legendPosition: 'right',
  },
};

// ---------------------------------------------------------------------------
// 9. Simple Backward-Compatible Bar — No config, just xKey/yKey
// ---------------------------------------------------------------------------
export const simpleBackwardCompatBar: VizSpec = {
  type: 'bar',
  title: 'Recharges by Plan',
  xKey: 'plan',
  yKey: 'recharge_count',
  data: [
    { plan: 'Basic 30',     recharge_count: 1240 },
    { plan: 'Smart 50',     recharge_count: 1870 },
    { plan: 'Premium Plus', recharge_count: 2150 },
    { plan: 'Data Max',     recharge_count: 1560 },
    { plan: 'Flexi 100',    recharge_count: 1380 },
  ],
};

// ---------------------------------------------------------------------------
// 10. Simple Backward-Compatible Composed — y2Key, no config
// ---------------------------------------------------------------------------
export const simpleBackwardCompatComposed: VizSpec = {
  type: 'composed',
  title: 'Revenue & ARPU by Month',
  xKey: 'month',
  yKey: 'revenue_sgd',
  y2Key: 'arpu_sgd',
  data: [
    { month: 'Jul', revenue_sgd: 48200, arpu_sgd: 19.80 },
    { month: 'Aug', revenue_sgd: 51400, arpu_sgd: 20.20 },
    { month: 'Sep', revenue_sgd: 49800, arpu_sgd: 20.50 },
    { month: 'Oct', revenue_sgd: 54600, arpu_sgd: 21.10 },
    { month: 'Nov', revenue_sgd: 57100, arpu_sgd: 21.80 },
    { month: 'Dec', revenue_sgd: 59800, arpu_sgd: 22.30 },
  ],
};

// ---------------------------------------------------------------------------
// Collection of all fixtures for iteration
// ---------------------------------------------------------------------------
export const allFixtures: { name: string; spec: VizSpec }[] = [
  { name: 'Grouped Multi-Series Bar',            spec: groupedMultiSeriesBar },
  { name: 'Stacked Bar Chart',                   spec: stackedBarChart },
  { name: 'Multi-Line Time Series',              spec: multiLineTimeSeries },
  { name: 'Composed Bars and Lines',             spec: composedBarsAndLines },
  { name: 'Ranked Horizontal Bar',               spec: rankedHorizontalBar },
  { name: 'Chart with Reference Line',           spec: chartWithReferenceLine },
  { name: 'Muted Non-Focus Categories',          spec: mutedNonFocusCategories },
  { name: 'Share of Total Pie',                  spec: shareOfTotalPie },
  { name: 'Simple Backward-Compatible Bar',      spec: simpleBackwardCompatBar },
  { name: 'Simple Backward-Compatible Composed', spec: simpleBackwardCompatComposed },
];
