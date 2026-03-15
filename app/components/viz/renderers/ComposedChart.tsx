/**
 * Composed chart renderer (Bar + Line overlay).
 * Bar series uses yKey, Line series uses y2Key.
 * Dual Y-axes: left for bar, right for line.
 */

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ComposedVizSpec } from '@/types/viz';
import { CHART_COLORS, CHART_THEME } from '@/lib/chart-theme';
import { ChartTooltip } from '../ChartTooltip';

interface ComposedChartRendererProps {
  spec: ComposedVizSpec;
}

export function ComposedChartRenderer({ spec }: ComposedChartRendererProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={spec.data} margin={{ top: 8, right: 32, left: 0, bottom: 32 }}>
        <CartesianGrid stroke={CHART_THEME.grid.stroke} strokeDasharray="3 3" />
        <XAxis
          dataKey={spec.xKey}
          tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.stroke }}
          axisLine={{ stroke: CHART_THEME.axis.stroke }}
        />
        {/* Left Y-axis for bar */}
        <YAxis
          yAxisId="left"
          tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.stroke }}
          axisLine={{ stroke: CHART_THEME.axis.stroke }}
        />
        {/* Right Y-axis for line */}
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.stroke }}
          axisLine={{ stroke: CHART_THEME.axis.stroke }}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend
          wrapperStyle={{ color: CHART_THEME.axis.stroke, fontSize: CHART_THEME.axis.fontSize }}
        />
        <Bar
          yAxisId="left"
          dataKey={spec.yKey}
          fill={CHART_COLORS[0]}
          isAnimationActive={true}
          animationDuration={300}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey={spec.y2Key}
          stroke={CHART_COLORS[1]}
          isAnimationActive={true}
          animationDuration={300}
          strokeWidth={2}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
