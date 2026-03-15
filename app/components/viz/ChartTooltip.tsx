/**
 * Custom Recharts tooltip component.
 * Dark theme styling and number formatting via Intl.NumberFormat.
 */

import React from 'react';
import { CHART_THEME } from '@/lib/chart-theme';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    color?: string;
  }>;
  label?: string | number;
}

function formatNumber(value: number | string): string {
  if (typeof value === 'string') return value;
  // Detect currency-scale values (>= 1000) and abbreviate
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
  // For decimals, show up to 2 decimal places
  if (!Number.isInteger(value)) {
    return value.toFixed(2);
  }
  return value.toString();
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
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
        {payload.map((entry, index) => (
          <div key={`${entry.name}-${index}`} className="flex items-center gap-2 text-sm">
            {entry.color && (
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
            )}
            <span style={{ color: CHART_THEME.tooltip.text }}>
              {entry.name}: {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
