"use client";

import dynamic from "next/dynamic";
import type { VizSpec } from "@/types/viz";

const VizChartBlock = dynamic(
  () => import("@/app/components/viz/VizChartBlock").then((m) => ({ default: m.VizChartBlock })),
  { ssr: false },
);

// ── Inline fixtures (same as __tests__/fixtures but inlined to avoid import issues) ──

const groupedMultiSeriesBar: VizSpec = {
  type: "bar",
  title: "Revenue vs Cost by Plan",
  xKey: "plan",
  yKey: "revenue_sgd",
  data: [
    { plan: "Basic 30", revenue_sgd: 42500, cost_sgd: 28300 },
    { plan: "Smart 50", revenue_sgd: 58700, cost_sgd: 35100 },
    { plan: "Premium Plus", revenue_sgd: 61200, cost_sgd: 33800 },
    { plan: "Data Max", revenue_sgd: 47800, cost_sgd: 31200 },
    { plan: "Flexi 100", revenue_sgd: 53400, cost_sgd: 29600 },
  ],
  config: {
    series: [
      { key: "revenue_sgd", label: "Revenue", format: "currency" },
      { key: "cost_sgd", label: "Cost", format: "currency" },
    ],
    formatY: "currency",
    legendPosition: "top",
  },
};

const stackedBarChart: VizSpec = {
  type: "bar",
  title: "Revenue Composition by Segment",
  xKey: "month",
  yKey: "consumer_sgd",
  data: [
    { month: "Jul 2024", consumer_sgd: 18200, business_sgd: 24500, enterprise_sgd: 14800 },
    { month: "Aug 2024", consumer_sgd: 19100, business_sgd: 25300, enterprise_sgd: 15200 },
    { month: "Sep 2024", consumer_sgd: 17800, business_sgd: 26100, enterprise_sgd: 15900 },
    { month: "Oct 2024", consumer_sgd: 20400, business_sgd: 27800, enterprise_sgd: 16300 },
    { month: "Nov 2024", consumer_sgd: 21200, business_sgd: 28400, enterprise_sgd: 16800 },
    { month: "Dec 2024", consumer_sgd: 22800, business_sgd: 29100, enterprise_sgd: 17500 },
  ],
  config: {
    series: [
      { key: "consumer_sgd", label: "Consumer", stackId: "revenue", format: "currency" },
      { key: "business_sgd", label: "Business", stackId: "revenue", format: "currency" },
      { key: "enterprise_sgd", label: "Enterprise", stackId: "revenue", format: "currency" },
    ],
    stacked: true,
    formatY: "currency",
    legendPosition: "bottom",
  },
};

const multiLineTimeSeries: VizSpec = {
  type: "line",
  title: "ARPU, Churn Rate & Retention Rate (2024)",
  xKey: "month",
  yKey: "arpu_sgd",
  data: [
    { month: "Jan", arpu_sgd: 17.2, churn_rate_pct: 1.8, retention_rate_pct: 85.2 },
    { month: "Feb", arpu_sgd: 17.5, churn_rate_pct: 1.7, retention_rate_pct: 85.8 },
    { month: "Mar", arpu_sgd: 18.1, churn_rate_pct: 1.5, retention_rate_pct: 86.5 },
    { month: "Apr", arpu_sgd: 18.4, churn_rate_pct: 1.4, retention_rate_pct: 87.1 },
    { month: "May", arpu_sgd: 19.0, churn_rate_pct: 1.3, retention_rate_pct: 87.9 },
    { month: "Jun", arpu_sgd: 19.3, churn_rate_pct: 1.2, retention_rate_pct: 88.3 },
    { month: "Jul", arpu_sgd: 19.8, churn_rate_pct: 1.1, retention_rate_pct: 88.8 },
    { month: "Aug", arpu_sgd: 20.2, churn_rate_pct: 1.0, retention_rate_pct: 89.4 },
    { month: "Sep", arpu_sgd: 20.5, churn_rate_pct: 0.9, retention_rate_pct: 89.9 },
    { month: "Oct", arpu_sgd: 21.1, churn_rate_pct: 0.8, retention_rate_pct: 90.5 },
    { month: "Nov", arpu_sgd: 21.8, churn_rate_pct: 0.7, retention_rate_pct: 91.2 },
    { month: "Dec", arpu_sgd: 22.3, churn_rate_pct: 0.6, retention_rate_pct: 91.8 },
  ],
  config: {
    series: [
      { key: "arpu_sgd", label: "ARPU (SGD)", format: "currency", yAxisId: "left" },
      { key: "churn_rate_pct", label: "Churn Rate (%)", format: "percentage", yAxisId: "right" },
      { key: "retention_rate_pct", label: "Retention Rate (%)", format: "percentage", yAxisId: "right" },
    ],
    legendPosition: "top",
  },
};

const composedBarsAndLines: VizSpec = {
  type: "composed",
  title: "Revenue, Margin & Target",
  xKey: "month",
  yKey: "revenue_sgd",
  data: [
    { month: "Jul 2024", revenue_sgd: 48200, margin_pct: 32.1, target_pct: 35.0 },
    { month: "Aug 2024", revenue_sgd: 51400, margin_pct: 33.8, target_pct: 35.0 },
    { month: "Sep 2024", revenue_sgd: 49800, margin_pct: 31.5, target_pct: 35.0 },
    { month: "Oct 2024", revenue_sgd: 54600, margin_pct: 34.2, target_pct: 35.0 },
    { month: "Nov 2024", revenue_sgd: 57100, margin_pct: 35.7, target_pct: 35.0 },
    { month: "Dec 2024", revenue_sgd: 59800, margin_pct: 36.4, target_pct: 35.0 },
  ],
  config: {
    series: [
      { key: "revenue_sgd", label: "Revenue", chartType: "bar", format: "currency", yAxisId: "left" },
      { key: "margin_pct", label: "Margin %", chartType: "line", format: "percentage", yAxisId: "right" },
      { key: "target_pct", label: "Target %", chartType: "line", format: "percentage", yAxisId: "right", emphasis: "muted" },
    ],
    legendPosition: "top",
  },
};

const rankedHorizontalBar: VizSpec = {
  type: "bar",
  title: "Top 10 Plans by Subscriber Count",
  xKey: "plan",
  yKey: "subscriber_count",
  data: [
    { plan: "Premium Plus", subscriber_count: 4820 },
    { plan: "Smart 50", subscriber_count: 4310 },
    { plan: "Data Max", subscriber_count: 3970 },
    { plan: "Flexi 100", subscriber_count: 3650 },
    { plan: "Basic 30", subscriber_count: 3420 },
    { plan: "Youth Bundle", subscriber_count: 2980 },
    { plan: "Night Owl", subscriber_count: 2540 },
    { plan: "Weekend Special", subscriber_count: 2210 },
    { plan: "Starter 15", subscriber_count: 1870 },
    { plan: "Pay-As-You-Go", subscriber_count: 1450 },
  ],
  config: {
    orientation: "horizontal",
    sort: "desc",
    highlights: ["Premium Plus"],
    formatY: "number",
    legendPosition: "none",
  },
};

const chartWithReferenceLine: VizSpec = {
  type: "line",
  title: "Monthly Churn Rate vs Target",
  xKey: "month",
  yKey: "churn_rate_pct",
  data: [
    { month: "Jan", churn_rate_pct: 2.4 },
    { month: "Feb", churn_rate_pct: 2.2 },
    { month: "Mar", churn_rate_pct: 2.5 },
    { month: "Apr", churn_rate_pct: 2.1 },
    { month: "May", churn_rate_pct: 1.9 },
    { month: "Jun", churn_rate_pct: 1.8 },
    { month: "Jul", churn_rate_pct: 2.0 },
    { month: "Aug", churn_rate_pct: 1.7 },
    { month: "Sep", churn_rate_pct: 1.5 },
    { month: "Oct", churn_rate_pct: 1.6 },
    { month: "Nov", churn_rate_pct: 1.4 },
    { month: "Dec", churn_rate_pct: 1.3 },
  ],
  config: {
    referenceLines: [{ y: 2.0, label: "Target (2.0%)", color: "#F59E0B", strokeDasharray: "6 3" }],
    formatY: "percentage",
    legendPosition: "none",
  },
};

const mutedNonFocusCategories: VizSpec = {
  type: "bar",
  title: "Revenue by Region (Central & West Focus)",
  xKey: "region",
  yKey: "revenue_sgd",
  data: [
    { region: "Central", revenue_sgd: 58200 },
    { region: "West", revenue_sgd: 52100 },
    { region: "East", revenue_sgd: 47300 },
    { region: "North", revenue_sgd: 43800 },
    { region: "South", revenue_sgd: 41500 },
    { region: "Coastal", revenue_sgd: 38900 },
    { region: "Highlands", revenue_sgd: 35200 },
    { region: "Metro", revenue_sgd: 49600 },
  ],
  config: {
    highlights: ["Central", "West"],
    formatY: "currency",
    sort: "desc",
    legendPosition: "none",
  },
};

const shareOfTotalPie: VizSpec = {
  type: "pie",
  title: "Revenue Share by Plan Tier",
  xKey: "tier",
  yKey: "revenue_sgd",
  data: [
    { tier: "Premium", revenue_sgd: 61200 },
    { tier: "Standard", revenue_sgd: 53400 },
    { tier: "Basic", revenue_sgd: 42500 },
    { tier: "Enterprise", revenue_sgd: 38700 },
    { tier: "Starter", revenue_sgd: 24800 },
  ],
  config: {
    formatY: "currency",
    legendPosition: "right",
  },
};

const simpleBackwardCompatBar: VizSpec = {
  type: "bar",
  title: "Recharges by Plan (Simple)",
  xKey: "plan",
  yKey: "recharge_count",
  data: [
    { plan: "Basic 30", recharge_count: 1240 },
    { plan: "Smart 50", recharge_count: 1870 },
    { plan: "Premium Plus", recharge_count: 2150 },
    { plan: "Data Max", recharge_count: 1560 },
    { plan: "Flexi 100", recharge_count: 1380 },
  ],
};

const simpleBackwardCompatComposed: VizSpec = {
  type: "composed",
  title: "Revenue & ARPU by Month (Legacy y2Key)",
  xKey: "month",
  yKey: "revenue_sgd",
  y2Key: "arpu_sgd",
  data: [
    { month: "Jul", revenue_sgd: 48200, arpu_sgd: 19.8 },
    { month: "Aug", revenue_sgd: 51400, arpu_sgd: 20.2 },
    { month: "Sep", revenue_sgd: 49800, arpu_sgd: 20.5 },
    { month: "Oct", revenue_sgd: 54600, arpu_sgd: 21.1 },
    { month: "Nov", revenue_sgd: 57100, arpu_sgd: 21.8 },
    { month: "Dec", revenue_sgd: 59800, arpu_sgd: 22.3 },
  ],
};

const kpiScorecard: VizSpec = {
  type: "kpi",
  title: "Key Performance Indicators",
  data: [
    { label: "Monthly Revenue", value: 54500, format: "currency", trend: "+8.3%", trendDirection: "up" },
    { label: "ARPU", value: 19.55, format: "currency", trend: "+0.6%", trendDirection: "up" },
    { label: "Active Customers", value: 2787, format: "number", trend: "-14 MoM", trendDirection: "down" },
    { label: "Churn Rate", value: 0.86, format: "percentage", trend: "+0.36pp", trendDirection: "down" },
  ] as any,
};

const scatterChart: VizSpec = {
  type: "scatter",
  title: "ARPU vs Churn Rate by Segment",
  xKey: "arpu",
  yKey: "churn_rate",
  data: [
    { arpu: 15.2, churn_rate: 2.1, segment: "Budget" },
    { arpu: 19.5, churn_rate: 1.4, segment: "Standard" },
    { arpu: 24.8, churn_rate: 0.8, segment: "Premium" },
    { arpu: 17.1, churn_rate: 1.9, segment: "Youth" },
    { arpu: 22.3, churn_rate: 1.1, segment: "Senior" },
  ],
};

// ═══════════════════════════════════════════════════════════════
// INSIGHT HIGHLIGHTING EXAMPLES — how Rendara marks anomalies
// ═══════════════════════════════════════════════════════════════

// Scenario: Revenue dropped sharply in October — highlight the drop month
const insightRevenueDrop: VizSpec = {
  type: "bar",
  title: "Monthly Revenue — October Drop Highlighted",
  xKey: "month",
  yKey: "revenue_sgd",
  data: [
    { month: "Apr", revenue_sgd: 56900 },
    { month: "May", revenue_sgd: 58200 },
    { month: "Jun", revenue_sgd: 57400 },
    { month: "Jul", revenue_sgd: 59100 },
    { month: "Aug", revenue_sgd: 60500 },
    { month: "Sep", revenue_sgd: 61200 },
    { month: "Oct", revenue_sgd: 48300 },
    { month: "Nov", revenue_sgd: 52100 },
    { month: "Dec", revenue_sgd: 54500 },
  ],
  config: {
    highlights: ["Oct"],
    formatY: "currency",
    referenceLines: [{ y: 55000, label: "Avg baseline ($55K)", strokeDasharray: "6 3" }],
  },
};

// Scenario: Churn spiked above target — line chart showing the breach
const insightChurnSpike: VizSpec = {
  type: "line",
  title: "Churn Rate — July Spike Above Target",
  xKey: "month",
  yKey: "churn_rate",
  data: [
    { month: "Jan", churn_rate: 0.65 },
    { month: "Feb", churn_rate: 0.58 },
    { month: "Mar", churn_rate: 0.71 },
    { month: "Apr", churn_rate: 0.62 },
    { month: "May", churn_rate: 0.54 },
    { month: "Jun", churn_rate: 0.49 },
    { month: "Jul", churn_rate: 0.87 },
    { month: "Aug", churn_rate: 0.72 },
    { month: "Sep", churn_rate: 0.39 },
    { month: "Oct", churn_rate: 0.55 },
    { month: "Nov", churn_rate: 0.50 },
    { month: "Dec", churn_rate: 0.86 },
  ],
  config: {
    formatY: "percentage",
    referenceLines: [
      { y: 0.7, label: "Alert threshold (0.7%)", color: "#EF4444", strokeDasharray: "4 4" },
    ],
  },
};

// Scenario: Actual vs Target vs Prior Year — muted prior year, highlighted current
const insightActualVsTarget: VizSpec = {
  type: "composed",
  title: "Revenue: Actual vs Target vs Prior Year",
  xKey: "month",
  yKey: "actual_sgd",
  data: [
    { month: "Jul", actual_sgd: 48200, target_sgd: 52000, prior_year_sgd: 45100 },
    { month: "Aug", actual_sgd: 51400, target_sgd: 52000, prior_year_sgd: 46800 },
    { month: "Sep", actual_sgd: 49800, target_sgd: 52000, prior_year_sgd: 47200 },
    { month: "Oct", actual_sgd: 42300, target_sgd: 52000, prior_year_sgd: 48500 },
    { month: "Nov", actual_sgd: 53100, target_sgd: 52000, prior_year_sgd: 49100 },
    { month: "Dec", actual_sgd: 54500, target_sgd: 52000, prior_year_sgd: 50200 },
  ],
  config: {
    series: [
      { key: "actual_sgd", label: "Actual Revenue", chartType: "bar", format: "currency", emphasis: "highlight" },
      { key: "target_sgd", label: "Target", chartType: "line", format: "currency", emphasis: "muted", yAxisId: "left" },
      { key: "prior_year_sgd", label: "Prior Year", chartType: "line", format: "currency", emphasis: "muted", yAxisId: "left" },
    ],
    formatY: "currency",
    legendPosition: "top",
  },
};

// Scenario: One segment is underperforming — highlight laggard, mute the rest
const insightLaggardSegment: VizSpec = {
  type: "bar",
  title: "ARPU by Segment — Senior Segment Lagging",
  xKey: "segment",
  yKey: "arpu_sgd",
  data: [
    { segment: "Youth", arpu_sgd: 24.80 },
    { segment: "Young Adult", arpu_sgd: 21.30 },
    { segment: "Adult", arpu_sgd: 19.10 },
    { segment: "Senior", arpu_sgd: 12.40 },
  ],
  config: {
    highlights: ["Senior"],
    formatY: "currency",
    sort: "desc",
    referenceLines: [{ y: 18.0, label: "Company avg ($18)", strokeDasharray: "6 3" }],
  },
};

// Scenario: Top plans by revenue with leader highlighted
const insightTopPlanLeader: VizSpec = {
  type: "bar",
  title: "Revenue by Plan — 5G Starter Dominates",
  xKey: "plan",
  yKey: "revenue_sgd",
  data: [
    { plan: "5G Starter", revenue_sgd: 18200 },
    { plan: "SIM Plus", revenue_sgd: 12400 },
    { plan: "SIM Max", revenue_sgd: 10800 },
    { plan: "Combo Plus", revenue_sgd: 7600 },
    { plan: "Youth Unlimited", revenue_sgd: 5500 },
  ],
  config: {
    highlights: ["5G Starter"],
    orientation: "horizontal",
    sort: "desc",
    formatY: "currency",
  },
};

// Scenario: MoM revenue comparison — current year vs prior year with variance %
const insightMoMComparison: VizSpec = {
  type: "composed",
  title: "Revenue MoM: 2025 vs 2024 with Variance",
  xKey: "month",
  yKey: "current_year_sgd",
  data: [
    { month: "Jan",  current_year_sgd: 56200, prior_year_sgd: 52100, variance_pct: 7.9 },
    { month: "Feb",  current_year_sgd: 55800, prior_year_sgd: 53400, variance_pct: 4.5 },
    { month: "Mar",  current_year_sgd: 57900, prior_year_sgd: 54200, variance_pct: 6.8 },
    { month: "Apr",  current_year_sgd: 56900, prior_year_sgd: 55800, variance_pct: 2.0 },
    { month: "May",  current_year_sgd: 58200, prior_year_sgd: 56100, variance_pct: 3.7 },
    { month: "Jun",  current_year_sgd: 57400, prior_year_sgd: 57300, variance_pct: 0.2 },
    { month: "Jul",  current_year_sgd: 59100, prior_year_sgd: 58500, variance_pct: 1.0 },
    { month: "Aug",  current_year_sgd: 60500, prior_year_sgd: 59200, variance_pct: 2.2 },
    { month: "Sep",  current_year_sgd: 61200, prior_year_sgd: 60100, variance_pct: 1.8 },
    { month: "Oct",  current_year_sgd: 48300, prior_year_sgd: 58800, variance_pct: -17.9 },
    { month: "Nov",  current_year_sgd: 52100, prior_year_sgd: 57600, variance_pct: -9.6 },
    { month: "Dec",  current_year_sgd: 54500, prior_year_sgd: 56900, variance_pct: -4.2 },
  ],
  config: {
    series: [
      { key: "current_year_sgd", label: "2025 Revenue", chartType: "bar", format: "currency", yAxisId: "left", emphasis: "highlight" },
      { key: "prior_year_sgd", label: "2024 Revenue", chartType: "bar", format: "currency", yAxisId: "left", emphasis: "muted" },
      { key: "variance_pct", label: "YoY Variance %", chartType: "line", format: "percentage", yAxisId: "right" },
    ],
    formatY: "currency",
    legendPosition: "top",
    referenceLines: [{ y: 0, label: "Break-even", strokeDasharray: "4 4" }],
  },
};

// Scenario: MoM ARPU trend with variance bars showing direction
const insightArpuMoMVariance: VizSpec = {
  type: "composed",
  title: "ARPU MoM Change — Growth vs Decline",
  xKey: "month",
  yKey: "arpu_sgd",
  data: [
    { month: "Jan", arpu_sgd: 17.20, mom_change_pct: 0 },
    { month: "Feb", arpu_sgd: 17.50, mom_change_pct: 1.7 },
    { month: "Mar", arpu_sgd: 18.10, mom_change_pct: 3.4 },
    { month: "Apr", arpu_sgd: 18.40, mom_change_pct: 1.7 },
    { month: "May", arpu_sgd: 19.00, mom_change_pct: 3.3 },
    { month: "Jun", arpu_sgd: 19.30, mom_change_pct: 1.6 },
    { month: "Jul", arpu_sgd: 19.80, mom_change_pct: 2.6 },
    { month: "Aug", arpu_sgd: 20.20, mom_change_pct: 2.0 },
    { month: "Sep", arpu_sgd: 20.50, mom_change_pct: 1.5 },
    { month: "Oct", arpu_sgd: 19.10, mom_change_pct: -6.8 },
    { month: "Nov", arpu_sgd: 19.40, mom_change_pct: 1.6 },
    { month: "Dec", arpu_sgd: 19.55, mom_change_pct: 0.8 },
  ],
  config: {
    series: [
      { key: "arpu_sgd", label: "ARPU (SGD)", chartType: "line", format: "currency", yAxisId: "left", emphasis: "highlight" },
      { key: "mom_change_pct", label: "MoM Change %", chartType: "bar", format: "percentage", yAxisId: "right" },
    ],
    formatY: "currency",
    legendPosition: "top",
    referenceLines: [{ y: 0, label: "", strokeDasharray: "3 3" }],
  },
};

// ── All fixtures in display order ──

const chartVariations: { name: string; spec: VizSpec; height?: number }[] = [
  { name: "1. Grouped Multi-Series Bar", spec: groupedMultiSeriesBar },
  { name: "2. Stacked Bar Chart", spec: stackedBarChart },
  { name: "3. Multi-Line Time Series (3 series, dual axis)", spec: multiLineTimeSeries },
  { name: "4. Composed: Bars + 2 Lines (dual axis)", spec: composedBarsAndLines },
  { name: "5. Ranked Horizontal Bar (highlighted)", spec: rankedHorizontalBar, height: 360 },
  { name: "6. Line with Reference Line", spec: chartWithReferenceLine },
  { name: "7. Muted Non-Focus Categories", spec: mutedNonFocusCategories },
  { name: "8. Share of Total Pie", spec: shareOfTotalPie },
  { name: "9. Backward-Compat: Simple Bar", spec: simpleBackwardCompatBar },
  { name: "10. Backward-Compat: Composed (y2Key)", spec: simpleBackwardCompatComposed },
  { name: "11. KPI Scorecard", spec: kpiScorecard },
  { name: "12. Scatter Chart", spec: scatterChart },
];

const insightExamples: { name: string; description: string; spec: VizSpec; height?: number }[] = [
  {
    name: "Revenue Drop Detection",
    description: "October revenue dropped sharply below baseline. The drop month is highlighted in full color while other months are muted. A dashed reference line shows the average baseline for context.",
    spec: insightRevenueDrop,
  },
  {
    name: "Churn Spike Above Threshold",
    description: "July churn spiked above the 0.7% alert threshold. A red dashed reference line marks the threshold so the spike is immediately visible.",
    spec: insightChurnSpike,
  },
  {
    name: "Actual vs Target vs Prior Year",
    description: "Current revenue (bright bars) compared against target and prior year (both muted lines). October miss is immediately visible. This composed chart uses emphasis levels to focus attention on what matters.",
    spec: insightActualVsTarget,
  },
  {
    name: "Underperforming Segment",
    description: "Senior segment ARPU lags all others and falls below the company average (dashed reference line). The laggard is highlighted while performing segments are muted.",
    spec: insightLaggardSegment,
  },
  {
    name: "Market Leader Dominance",
    description: "5G Starter generates 33% of total plan revenue. Highlighted in full color with a horizontal layout for readability. Other plans shown muted for context.",
    spec: insightTopPlanLeader, height: 240,
  },
  {
    name: "Revenue YoY: Current vs Prior with Variance",
    description: "Grouped bars compare 2025 (bright) against 2024 (muted) month by month. A variance % line on the right axis instantly shows where performance flipped negative — Oct-Dec fell below prior year. The zero reference line marks the break-even point.",
    spec: insightMoMComparison,
  },
  {
    name: "ARPU MoM Change — Growth vs Decline",
    description: "ARPU trend line (left axis) with MoM change % bars (right axis). Positive bars show growth months, negative bars flag decline. October's -6.8% drop is immediately visible against the zero reference line.",
    spec: insightArpuMoMVariance,
  },
];

export default function VizTestPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10 h-full overflow-y-auto pb-20">
      {/* ── INSIGHT HIGHLIGHTING ── */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Insight Highlighting</h1>
        <p className="text-sm text-muted-foreground">
          How Rendara marks anomalies, drops, spikes, laggards, and leaders inside chat responses,
          dashboards, and stories. The AI agent uses these techniques automatically when it detects insights in the data.
        </p>
      </div>

      {insightExamples.map(({ name, description, spec, height }) => (
        <section key={name} className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-accent">{name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="border border-border rounded-2xl p-4 bg-surface/30">
            <VizChartBlock
              spec={spec}
              status="complete"
              blockId={`insight-${name}`}
              inlineHeight={height ?? 280}
              showPinButton={false}
              readOnly
              allowExpand={false}
            />
          </div>
        </section>
      ))}

      {/* ── CHART VARIATIONS ── */}
      <div className="pt-8 border-t border-border">
        <h1 className="text-2xl font-bold text-white mb-1">Chart Type Variations</h1>
        <p className="text-sm text-muted-foreground">
          All supported chart types rendered with mock data. Includes multi-series, stacking,
          horizontal orientation, reference lines, and backward-compatible simple specs.
        </p>
      </div>

      {chartVariations.map(({ name, spec, height }) => (
        <section key={name} className="space-y-2">
          <h2 className="text-base font-semibold text-accent">{name}</h2>
          <div className="border border-border rounded-2xl p-4 bg-surface/30">
            <VizChartBlock
              spec={spec}
              status="complete"
              blockId={`test-${name}`}
              inlineHeight={height ?? 280}
              showPinButton={false}
              readOnly
              allowExpand={false}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
