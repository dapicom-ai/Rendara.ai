// VizSpec — JSON Viz Specification Schema (SDD Appendix A)
// All 7 chart types supported by Rendara.

export interface BaseVizSpec {
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
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
  y2Key: string;
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
 * 6. `y2Key` is present and valid in `data[0]`
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

  // For composed type, validate y2Key
  if (spec.type === 'composed') {
    if (typeof spec.y2Key !== 'string' || !(spec.y2Key in spec.data[0])) return false;
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
