/**
 * Pie chart renderer using Recharts.
 * Uses xKey for slice labels and yKey for values.
 * Applies CHART_COLORS per slice.
 */

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { PieVizSpec } from '@/types/viz';
import { CHART_COLORS, CHART_THEME } from '@/lib/chart-theme';
import { ChartTooltip } from '../ChartTooltip';

interface PieChartRendererProps {
  spec: PieVizSpec;
}

export function PieChartRenderer({ spec }: PieChartRendererProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 8, right: 32, bottom: 8, left: 32 }}>
        <Pie
          data={spec.data}
          dataKey={spec.yKey}
          nameKey={spec.xKey}
          cx="50%"
          cy="50%"
          outerRadius={80}
          isAnimationActive={true}
          animationDuration={300}
        >
          {spec.data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          wrapperStyle={{ color: CHART_THEME.axis.stroke, fontSize: CHART_THEME.axis.fontSize }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
