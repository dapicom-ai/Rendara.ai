/**
 * Pie chart renderer using Recharts.
 * Uses xKey for slice labels and yKey for values.
 * Supports highlighted slices and auto-limiting to 8 categories.
 */

import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { PieVizSpec } from '@/types/viz';
import { CHART_COLORS, CHART_THEME, MUTED_OPACITY } from '@/lib/chart-theme';
import { ChartTooltip, formatValue, ValueFormat } from '../ChartTooltip';

interface PieChartRendererProps {
  spec: PieVizSpec;
}

const MAX_PIE_SLICES = 8;

export function PieChartRenderer({ spec }: PieChartRendererProps) {
  const config = spec.config;
  const highlights = config?.highlights;
  const hasHighlights = highlights && highlights.length > 0;

  // Auto-limit: if more than MAX_PIE_SLICES, combine smallest into "Other"
  const chartData = useMemo(() => {
    let data = [...spec.data];

    if (data.length > MAX_PIE_SLICES) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[PieChart] ${data.length} slices detected — combining smallest into "Other" (limit: ${MAX_PIE_SLICES}).`,
        );
      }
      // Sort descending by yKey
      data.sort((a, b) => {
        const aVal = typeof a[spec.yKey] === 'number' ? (a[spec.yKey] as number) : 0;
        const bVal = typeof b[spec.yKey] === 'number' ? (b[spec.yKey] as number) : 0;
        return bVal - aVal;
      });

      const top = data.slice(0, MAX_PIE_SLICES - 1);
      const rest = data.slice(MAX_PIE_SLICES - 1);

      const otherValue = rest.reduce((sum, row) => {
        const v = row[spec.yKey];
        return sum + (typeof v === 'number' ? v : 0);
      }, 0);

      const otherRow: Record<string, string | number> = {
        [spec.xKey]: 'Other',
        [spec.yKey]: otherValue,
      };
      top.push(otherRow);
      data = top;
    }

    return data;
  }, [spec.data, spec.xKey, spec.yKey]);

  // Format map
  const yFormat = config?.formatY;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 8, right: 32, bottom: 8, left: 32 }}>
        <Pie
          data={chartData}
          dataKey={spec.yKey}
          nameKey={spec.xKey}
          cx="50%"
          cy="50%"
          outerRadius={80}
          isAnimationActive={true}
          animationDuration={300}
        >
          {chartData.map((row, index) => {
            const color = CHART_COLORS[index % CHART_COLORS.length];
            let opacity = 1;

            if (hasHighlights) {
              const categoryVal = String(row[spec.xKey]);
              opacity = highlights!.includes(categoryVal) ? 1 : MUTED_OPACITY;
            }

            return (
              <Cell
                key={`cell-${index}`}
                fill={color}
                fillOpacity={opacity}
              />
            );
          })}
        </Pie>
        <Tooltip
          content={<ChartTooltip defaultFormat={yFormat} />}
        />
        <Legend
          wrapperStyle={{ color: CHART_THEME.axis.stroke, fontSize: CHART_THEME.axis.fontSize }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
