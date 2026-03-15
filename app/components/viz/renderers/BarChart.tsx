/**
 * Bar chart renderer using Recharts.
 * Supports vertical bar layout with configurable color.
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarVizSpec } from '@/types/viz';
import { CHART_COLORS, CHART_THEME } from '@/lib/chart-theme';
import { ChartTooltip } from '../ChartTooltip';

interface BarChartRendererProps {
  spec: BarVizSpec;
}

export function BarChartRenderer({ spec }: BarChartRendererProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={spec.data} margin={{ top: 8, right: 32, left: 0, bottom: 32 }}>
        <CartesianGrid stroke={CHART_THEME.grid.stroke} strokeDasharray="3 3" />
        <XAxis
          dataKey={spec.xKey}
          tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.stroke }}
          axisLine={{ stroke: CHART_THEME.axis.stroke }}
        />
        <YAxis
          tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.stroke }}
          axisLine={{ stroke: CHART_THEME.axis.stroke }}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar
          dataKey={spec.yKey}
          fill={CHART_COLORS[0]}
          isAnimationActive={true}
          animationDuration={300}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
