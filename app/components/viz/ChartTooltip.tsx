/**
 * Custom Recharts tooltip component.
 * Dark theme styling with format-aware number display.
 */

import React from 'react';
import { CHART_THEME } from '@/lib/chart-theme';

export type ValueFormat = 'number' | 'currency' | 'percentage';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    color?: string;
    dataKey?: string;
  }>;
  label?: string | number;
  /** Per-series format map: dataKey -> format */
  formatMap?: Record<string, ValueFormat>;
  /** Fallback format for all values */
  defaultFormat?: ValueFormat;
}

export function formatValue(value: number | string, format?: ValueFormat): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      if (Math.abs(value) >= 1_000_000) {
        return '$' + new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
          compactDisplay: 'short',
        }).format(value);
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: value >= 100 ? 0 : 2,
      }).format(value);

    case 'percentage':
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value / 100);

    default:
      // Default number formatting
      if (value >= 1_000_000) {
        return new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
          compactDisplay: 'short',
        }).format(value);
      }
      if (value >= 1_000) {
        return new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
          compactDisplay: 'short',
        }).format(value);
      }
      if (!Number.isInteger(value)) {
        return value.toFixed(2);
      }
      return value.toString();
  }
}

export function ChartTooltip({ active, payload, label, formatMap, defaultFormat }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        backgroundColor: CHART_THEME.tooltip.background,
        borderColor: CHART_THEME.tooltip.border,
      }}
    >
      {label && (
        <div
          className="text-xs font-medium"
          style={{ color: CHART_THEME.tooltip.text }}
        >
          {label}
        </div>
      )}
      <div className="mt-1 space-y-1">
        {payload.map((entry, index) => {
          const key = typeof entry.dataKey === 'string' ? entry.dataKey : entry.name;
          const format = formatMap?.[key] ?? defaultFormat;
          return (
            <div key={`${entry.name}-${index}`} className="flex items-center gap-2 text-sm">
              {entry.color && (
                <div
                  className="size-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
              )}
              <span style={{ color: CHART_THEME.tooltip.text }}>
                {entry.name}: {formatValue(entry.value, format)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
