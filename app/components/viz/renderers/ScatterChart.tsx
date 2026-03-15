/**
 * Scatter chart renderer using Recharts.
 * Both X and Y axes use type="number" for numeric data.
 */

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ScatterVizSpec } from '@/types/viz';
import { CHART_COLORS, CHART_THEME } from '@/lib/chart-theme';
import { ChartTooltip } from '../ChartTooltip';

interface ScatterChartRendererProps {
  spec: ScatterVizSpec;
}

export function ScatterChartRenderer({ spec }: ScatterChartRendererProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 32, left: 0, bottom: 32 }}>
        <CartesianGrid stroke={CHART_THEME.grid.stroke} strokeDasharray="3 3" />
        <XAxis
          dataKey={spec.xKey}
          type="number"
          tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.stroke }}
          axisLine={{ stroke: CHART_THEME.axis.stroke }}
        />
        <YAxis
          dataKey={spec.yKey}
          type="number"
          tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.stroke }}
          axisLine={{ stroke: CHART_THEME.axis.stroke }}
        />
        <Tooltip content={<ChartTooltip />} />
        <Scatter
          name={spec.yKey}
          data={spec.data}
          fill={CHART_COLORS[0]}
          isAnimationActive={true}
          animationDuration={300}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
