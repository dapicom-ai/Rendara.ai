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

// ── All fixtures in display order ──

const allFixtures: { name: string; spec: VizSpec; height?: number }[] = [
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

export default function VizTestPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Visualization Test Page</h1>
        <p className="text-sm text-muted-foreground">
          All chart variations rendered with mock data. Check for rendering issues, console errors, and visual quality.
        </p>
      </div>

      {allFixtures.map(({ name, spec, height }) => (
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
