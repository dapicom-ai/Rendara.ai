/**
 * Area chart renderer using Recharts.
 * Solid area fill beneath the line.
 */

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { VizSpec, AreaVizSpec } from '@/types/viz';
import { CHART_COLORS, CHART_THEME } from '@/lib/chart-theme';
import { ChartTooltip } from '../ChartTooltip';

interface AreaChartRendererProps {
  spec: AreaVizSpec;
}

export function AreaChartRenderer({ spec }: AreaChartRendererProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={spec.data} margin={{ top: 8, right: 32, left: 0, bottom: 32 }}>
        <defs>
          <linearGradient id="areaGradient">
            <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Area
          type="monotone"
          dataKey={spec.yKey}
          stroke={CHART_COLORS[0]}
          fill="url(#areaGradient)"
          isAnimationActive={true}
          animationDuration={300}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
