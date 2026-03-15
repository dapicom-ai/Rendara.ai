/**
 * Line chart renderer using Recharts.
 * Includes gradient fill beneath the line.
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { LineVizSpec } from '@/types/viz';
import { CHART_COLORS, CHART_THEME } from '@/lib/chart-theme';
import { ChartTooltip } from '../ChartTooltip';

interface LineChartRendererProps {
  spec: LineVizSpec;
}

export function LineChartRenderer({ spec }: LineChartRendererProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={spec.data} margin={{ top: 8, right: 32, left: 0, bottom: 32 }}>
        <defs>
          <linearGradient id="lineGradient">
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
        <Line
          type="monotone"
          dataKey={spec.yKey}
          stroke={CHART_COLORS[0]}
          fill="url(#lineGradient)"
          dot={false}
          isAnimationActive={true}
          animationDuration={300}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
