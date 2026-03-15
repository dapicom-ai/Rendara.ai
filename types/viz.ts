// VizSpec — JSON Viz Specification Schema (SDD Appendix A)
// All 7 chart types supported by Rendara.

// --- New multi-series & config types ---

export interface SeriesDef {
  key: string;                    // data key
  label?: string;                 // display name
  chartType?: 'bar' | 'line' | 'area'; // for composed charts
  yAxisId?: 'left' | 'right';
  stackId?: string;               // group for stacking
  format?: 'number' | 'currency' | 'percentage';
  emphasis?: 'normal' | 'highlight' | 'muted';
  color?: string;                 // optional color override
}

export interface ReferenceLine {
  y: number;
  label?: string;
  color?: string;
  strokeDasharray?: string;
}

export interface ChartConfig {
  series?: SeriesDef[];                          // multi-series support
  orientation?: 'vertical' | 'horizontal';
  sort?: 'asc' | 'desc' | 'none';
  topN?: number;                                 // show top N, group rest as "Other"
  showOther?: boolean;                           // when using topN
  highlights?: string[];                         // highlighted category values
  referenceLines?: ReferenceLine[];
  legendPosition?: 'top' | 'bottom' | 'right' | 'none';
  stacked?: boolean;                             // shorthand for stacking all series
  formatY?: 'number' | 'currency' | 'percentage';
}

// --- Base and chart-specific spec types ---

export interface BaseVizSpec {
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  config?: ChartConfig;
}

export interface BarVizSpec extends BaseVizSpec {
  type: "bar";
}

export interface LineVizSpec extends BaseVizSpec {
  type: "line";
}

export interface AreaVizSpec extends BaseVizSpec {
  type: "area";
}

export interface PieVizSpec extends BaseVizSpec {
  type: "pie";
}

export interface ScatterVizSpec extends BaseVizSpec {
  type: "scatter";
}

// Composed adds y2Key for the secondary (line) series (SDD A.6)
export interface ComposedVizSpec extends BaseVizSpec {
  type: "composed";
  y2Key?: string; // optional now — config.series can replace it
}

// KPI items within a kpi chart
export interface KpiItem {
  label: string;
  value: number;
  format: 'currency' | 'number' | 'percentage';
  trend: string;
  trendDirection?: 'up' | 'down';
}

export interface KpiVizSpec {
  type: 'kpi';
  title: string;
  data: KpiItem[];
}

// Discriminated union of all chart types (SDD Section 8.1, Appendix A)
export type VizSpec =
  | BarVizSpec
  | LineVizSpec
  | AreaVizSpec
  | PieVizSpec
  | ScatterVizSpec
  | ComposedVizSpec
  | KpiVizSpec;

export type ChartType = VizSpec["type"];

// --- Helpers ---

/**
 * Derive SeriesDef[] from legacy yKey / y2Key fields when config.series is absent.
 */
export function deriveSeries(spec: Exclude<VizSpec, KpiVizSpec>): SeriesDef[] {
  if (spec.config?.series && spec.config.series.length > 0) {
    return spec.config.series;
  }
  const series: SeriesDef[] = [{ key: spec.yKey }];
  if (spec.type === 'composed' && (spec as ComposedVizSpec).y2Key) {
    series.push({
      key: (spec as ComposedVizSpec).y2Key!,
      chartType: 'line',
      yAxisId: 'right',
    });
  }
  return series;
}

/**
 * Prepare chart data: sorting, topN aggregation.
 */
export function prepareChartData(
  data: Record<string, string | number>[],
  config?: ChartConfig,
  primaryKey?: string,
): Record<string, string | number>[] {
  if (!config || data.length === 0) return data;

  let result = [...data];

  // Sort by primary numeric key
  if (config.sort && config.sort !== 'none' && primaryKey) {
    result.sort((a, b) => {
      const aVal = typeof a[primaryKey] === 'number' ? (a[primaryKey] as number) : 0;
      const bVal = typeof b[primaryKey] === 'number' ? (b[primaryKey] as number) : 0;
      return config.sort === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }

  // Top-N with "Other" aggregation
  if (config.topN && config.topN > 0 && result.length > config.topN) {
    const top = result.slice(0, config.topN);
    const rest = result.slice(config.topN);

    if (config.showOther !== false) {
      // Aggregate "Other" row by summing all numeric fields
      const otherRow: Record<string, string | number> = {};
      const numericKeys = Object.keys(result[0]).filter(
        (k) => typeof result[0][k] === 'number',
      );
      // Use the xKey to label the "Other" row — find it from the first row's string keys
      const stringKeys = Object.keys(result[0]).filter(
        (k) => typeof result[0][k] === 'string',
      );
      for (const k of stringKeys) {
        otherRow[k] = 'Other';
      }
      for (const k of numericKeys) {
        otherRow[k] = rest.reduce((sum, row) => {
          const v = row[k];
          return sum + (typeof v === 'number' ? v : 0);
        }, 0);
      }
      top.push(otherRow);
    }

    result = top;
  }

  return result;
}

/**
 * Validation rules (enforced at render time in components).
 *
 * All VizSpecs must satisfy:
 * 1. `type` is one of the seven allowed values
 * 2. `data` is a non-empty array
 * 3. `title` is a non-empty string
 *
 * For non-KPI specs:
 * 4. `xKey` exists as a key in `data[0]`
 * 5. `yKey` exists as a key in `data[0]`
 *
 * For 'composed' type only:
 * 6. `y2Key` is present and valid in `data[0]` (unless config.series is provided)
 *
 * On validation failure, render VizErrorCard fallback (never throw).
 */
export function isValidVizSpec(spec: any): spec is Exclude<VizSpec, KpiVizSpec> {
  if (!spec || typeof spec !== 'object') return false;
  if (!Array.isArray(spec.data) || spec.data.length === 0) return false;
  if (typeof spec.title !== 'string' || !spec.title.trim()) return false;
  if (!['bar', 'line', 'area', 'pie', 'scatter', 'composed'].includes(spec.type)) return false;

  // For all chart types
  if (typeof spec.xKey !== 'string' || !(spec.xKey in spec.data[0])) return false;
  if (typeof spec.yKey !== 'string' || !(spec.yKey in spec.data[0])) return false;

  // For composed type, validate y2Key unless config.series is provided
  if (spec.type === 'composed') {
    const hasConfigSeries = spec.config?.series && Array.isArray(spec.config.series) && spec.config.series.length > 0;
    if (!hasConfigSeries) {
      if (typeof spec.y2Key !== 'string' || !(spec.y2Key in spec.data[0])) return false;
    }
  }

  // Validate config.series keys exist in data (warn + filter, don't reject)
  if (spec.config?.series && Array.isArray(spec.config.series)) {
    const dataKeys = Object.keys(spec.data[0]);
    const validSeries = spec.config.series.filter((s: SeriesDef) => {
      if (!dataKeys.includes(s.key)) {
        console.warn(`[VizSpec] Series key "${s.key}" not found in data, ignoring.`);
        return false;
      }
      return true;
    });
    // Mutate config.series to only include valid series
    spec.config.series = validSeries;

    if (validSeries.length > 10) {
      console.warn(`[VizSpec] ${validSeries.length} series detected — consider reducing for readability.`);
    }
  }

  // Warn if pie has too many categories
  if (spec.type === 'pie' && spec.data.length > 8) {
    console.warn(`[VizSpec] Pie chart has ${spec.data.length} categories — auto-limiting may apply.`);
  }

  // Validate reference lines
  if (spec.config?.referenceLines && Array.isArray(spec.config.referenceLines)) {
    spec.config.referenceLines = spec.config.referenceLines.filter((rl: ReferenceLine) => {
      if (typeof rl.y !== 'number') {
        console.warn(`[VizSpec] Reference line y value must be a number, got "${rl.y}", ignoring.`);
        return false;
      }
      return true;
    });
  }

  return true;
}

export function isValidKpiSpec(spec: any): spec is KpiVizSpec {
  if (!spec || typeof spec !== 'object') return false;
  if (spec.type !== 'kpi') return false;
  if (!Array.isArray(spec.data) || spec.data.length === 0) return false;
  if (typeof spec.title !== 'string' || !spec.title.trim()) return false;
  return spec.data.every((item: any) => {
    const hasLabel = typeof item.label === 'string' || typeof item.metric === 'string';
    // Accept numeric strings like "$42.80" or "3.2%" — coerced in KpiScorecardBlock
    const hasValue = typeof item.value === 'number' || typeof item.value === 'string';
    return hasLabel && hasValue;
  });
}
