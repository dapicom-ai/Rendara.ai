/**
 * Suite 7: VizSpec Validation Tests.
 *
 * Tests the VizSpec validation logic against SDD Section 8.1 rules.
 * Uses the actual isValidVizSpec and isValidKpiSpec functions from types/viz.ts.
 *
 * SDD Section 8.1 — JSON Viz Specification Schema
 * SDD Appendix A — JSON Viz Schema Reference
 */

import { describe, it, expect } from 'vitest';
import { isValidVizSpec, isValidKpiSpec } from '@/types/viz';

// ---------------------------------------------------------------------------
// Non-KPI chart validation (isValidVizSpec)
// ---------------------------------------------------------------------------

describe('isValidVizSpec', () => {
  // SDD 8.1: valid chart types pass

  it('valid bar spec passes validation', () => {
    // SDD 8.1 — all 5 required fields present
    const spec = {
      type: 'bar',
      title: 'Revenue by Region',
      data: [{ region: 'AMER', revenue: 1000 }],
      xKey: 'region',
      yKey: 'revenue',
    };
    expect(isValidVizSpec(spec)).toBe(true);
  });

  it('valid line spec passes validation', () => {
    const spec = {
      type: 'line',
      title: 'Monthly Trend',
      data: [{ month: 'Jan', sales: 500 }],
      xKey: 'month',
      yKey: 'sales',
    };
    expect(isValidVizSpec(spec)).toBe(true);
  });

  it('valid area spec passes validation', () => {
    const spec = {
      type: 'area',
      title: 'Growth',
      data: [{ quarter: 'Q1', growth: 10 }],
      xKey: 'quarter',
      yKey: 'growth',
    };
    expect(isValidVizSpec(spec)).toBe(true);
  });

  it('valid pie spec passes validation', () => {
    const spec = {
      type: 'pie',
      title: 'Market Share',
      data: [{ segment: 'Enterprise', pct: 60 }],
      xKey: 'segment',
      yKey: 'pct',
    };
    expect(isValidVizSpec(spec)).toBe(true);
  });

  it('valid scatter spec passes validation', () => {
    const spec = {
      type: 'scatter',
      title: 'Deals vs Revenue',
      data: [{ deals: 10, revenue: 50000 }],
      xKey: 'deals',
      yKey: 'revenue',
    };
    expect(isValidVizSpec(spec)).toBe(true);
  });

  it('valid composed spec passes (requires y2Key)', () => {
    // SDD 8.1: y2Key additionally required for composed type
    const spec = {
      type: 'composed',
      title: 'Revenue and Units',
      data: [{ month: 'Jan', revenue: 1000, units: 50 }],
      xKey: 'month',
      yKey: 'revenue',
      y2Key: 'units',
    };
    expect(isValidVizSpec(spec)).toBe(true);
  });

  it('kpi type is NOT validated by isValidVizSpec (uses isValidKpiSpec)', () => {
    // SDD 8.1: kpi has different validation path
    const spec = {
      type: 'kpi',
      title: 'KPIs',
      data: [{ metric: 'Revenue', value: 1000 }],
      xKey: 'metric',
      yKey: 'value',
    };
    // isValidVizSpec excludes kpi — returns false
    expect(isValidVizSpec(spec)).toBe(false);
  });

  it('missing type field fails validation', () => {
    const spec = {
      title: 'Chart',
      data: [{ x: 1, y: 2 }],
      xKey: 'x',
      yKey: 'y',
    };
    expect(isValidVizSpec(spec)).toBe(false);
  });

  it('invalid type value fails (histogram)', () => {
    // SDD 8.1: type must be one of the seven allowed values
    const spec = {
      type: 'histogram',
      title: 'Distribution',
      data: [{ x: 1, y: 2 }],
      xKey: 'x',
      yKey: 'y',
    };
    expect(isValidVizSpec(spec)).toBe(false);
  });

  it('empty data array fails validation', () => {
    // SDD 8.1 rule 2: data is a non-empty array
    const spec = {
      type: 'bar',
      title: 'Empty',
      data: [],
      xKey: 'x',
      yKey: 'y',
    };
    expect(isValidVizSpec(spec)).toBe(false);
  });

  it('xKey missing from data[0] fails validation', () => {
    // SDD 8.1 rule 3: xKey exists as key in data[0]
    const spec = {
      type: 'bar',
      title: 'Chart',
      data: [{ region: 'AMER', revenue: 1000 }],
      xKey: 'nonexistent',
      yKey: 'revenue',
    };
    expect(isValidVizSpec(spec)).toBe(false);
  });

  it('yKey missing from data[0] fails validation', () => {
    // SDD 8.1 rule 4: yKey exists as key in data[0]
    const spec = {
      type: 'bar',
      title: 'Chart',
      data: [{ region: 'AMER', revenue: 1000 }],
      xKey: 'region',
      yKey: 'nonexistent',
    };
    expect(isValidVizSpec(spec)).toBe(false);
  });

  it('empty title fails validation', () => {
    // SDD 8.1 rule 5: title is a non-empty string
    const spec = {
      type: 'bar',
      title: '',
      data: [{ x: 1, y: 2 }],
      xKey: 'x',
      yKey: 'y',
    };
    expect(isValidVizSpec(spec)).toBe(false);
  });

  it('whitespace-only title fails validation', () => {
    const spec = {
      type: 'bar',
      title: '   ',
      data: [{ x: 1, y: 2 }],
      xKey: 'x',
      yKey: 'y',
    };
    expect(isValidVizSpec(spec)).toBe(false);
  });

  it('composed type without y2Key fails validation', () => {
    // SDD 8.1: composed requires y2Key
    const spec = {
      type: 'composed',
      title: 'Composed',
      data: [{ month: 'Jan', revenue: 1000 }],
      xKey: 'month',
      yKey: 'revenue',
      // y2Key missing
    };
    expect(isValidVizSpec(spec)).toBe(false);
  });

  it('null input fails validation', () => {
    expect(isValidVizSpec(null)).toBe(false);
  });

  it('undefined input fails validation', () => {
    expect(isValidVizSpec(undefined)).toBe(false);
  });

  it('non-object input fails validation', () => {
    expect(isValidVizSpec('string')).toBe(false);
    expect(isValidVizSpec(42)).toBe(false);
    expect(isValidVizSpec([])).toBe(false);
  });
});


// ---------------------------------------------------------------------------
// KPI validation (isValidKpiSpec)
// ---------------------------------------------------------------------------

describe('isValidKpiSpec', () => {
  it('valid KPI spec passes validation', () => {
    const spec = {
      type: 'kpi',
      title: 'Key Metrics',
      data: [
        { label: 'Revenue', value: 1842350, format: 'currency', trend: '+12%', trendDirection: 'up' },
        { label: 'Customers', value: 1240, format: 'number', trend: '+5%', trendDirection: 'up' },
      ],
    };
    expect(isValidKpiSpec(spec)).toBe(true);
  });

  it('KPI spec with wrong type fails', () => {
    const spec = {
      type: 'bar',
      title: 'Not KPI',
      data: [{ label: 'Revenue', value: 1000, format: 'currency', trend: '+5%' }],
    };
    expect(isValidKpiSpec(spec)).toBe(false);
  });

  it('KPI spec with empty data fails', () => {
    const spec = {
      type: 'kpi',
      title: 'Empty',
      data: [],
    };
    expect(isValidKpiSpec(spec)).toBe(false);
  });

  it('KPI spec with missing label fails', () => {
    const spec = {
      type: 'kpi',
      title: 'KPIs',
      data: [{ value: 1000, format: 'currency', trend: '+5%' }],
    };
    expect(isValidKpiSpec(spec)).toBe(false);
  });

  it('KPI spec with invalid format fails', () => {
    const spec = {
      type: 'kpi',
      title: 'KPIs',
      data: [{ label: 'Revenue', value: 1000, format: 'invalid_format', trend: '+5%' }],
    };
    expect(isValidKpiSpec(spec)).toBe(false);
  });

  it('KPI format accepts currency, number, percentage', () => {
    const formats = ['currency', 'number', 'percentage'] as const;
    for (const fmt of formats) {
      const spec = {
        type: 'kpi',
        title: 'KPIs',
        data: [{ label: 'Metric', value: 100, format: fmt, trend: '+1%' }],
      };
      expect(isValidKpiSpec(spec)).toBe(true);
    }
  });

  it('null input fails', () => {
    expect(isValidKpiSpec(null)).toBe(false);
  });
});
