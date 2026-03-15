/**
 * Area chart renderer using Recharts.
 * Supports multi-series, stacking, reference lines, and y-axis formatting.
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
  ReferenceLine as RechReferenceLine,
  Legend,
} from 'recharts';
import { AreaVizSpec, deriveSeries } from '@/types/viz';
import {
  CHART_COLORS,
  CHART_THEME,
  MUTED_OPACITY,
  HIGHLIGHT_STROKE_WIDTH,
  REFERENCE_LINE_COLOR,
} from '@/lib/chart-theme';
import { ChartTooltip, formatValue, ValueFormat } from '../ChartTooltip';

interface AreaChartRendererProps {
  spec: AreaVizSpec;
}

export function AreaChartRenderer({ spec }: AreaChartRendererProps) {
  const config = spec.config;
  const series = deriveSeries(spec);

  // Build format map for tooltip
  const formatMap: Record<string, ValueFormat> = {};
  for (const s of series) {
    if (s.format) formatMap[s.key] = s.format;
  }

  const yFormat = config?.formatY;
  const yTickFormatter = yFormat
    ? (value: number) => formatValue(value, yFormat)
    : undefined;

  const showLegend = series.length > 1 && config?.legendPosition !== 'none';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={spec.data} margin={{ top: 8, right: 32, left: 0, bottom: 32 }}>
        <defs>
          {series.map((s, idx) => {
            const color = s.color ?? CHART_COLORS[idx % CHART_COLORS.length];
            return (
              <linearGradient key={`areaGrad-${s.key}`} id={`areaGradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            );
          })}
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
          tickFormatter={yTickFormatter}
        />
        <Tooltip
          content={<ChartTooltip formatMap={formatMap} defaultFormat={yFormat} />}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ color: CHART_THEME.axis.stroke, fontSize: CHART_THEME.axis.fontSize }}
          />
        )}
        {/* Reference lines */}
        {config?.referenceLines?.map((rl, i) => (
          <RechReferenceLine
            key={`ref-${i}`}
            y={rl.y}
            label={rl.label ? { value: rl.label, fill: CHART_THEME.axis.stroke, fontSize: 11 } : undefined}
            stroke={rl.color ?? REFERENCE_LINE_COLOR}
            strokeDasharray={rl.strokeDasharray ?? '5 5'}
          />
        ))}
        {/* Areas */}
        {series.map((s, idx) => {
          const color = s.color ?? CHART_COLORS[idx % CHART_COLORS.length];
          const isMuted = s.emphasis === 'muted';
          const isHighlight = s.emphasis === 'highlight';
          const strokeWidth = isHighlight ? HIGHLIGHT_STROKE_WIDTH : 2;
          const opacity = isMuted ? MUTED_OPACITY : 1;
          const stackId = s.stackId ?? (config?.stacked ? 'stack' : undefined);

          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              fill={`url(#areaGradient-${s.key})`}
              fillOpacity={isMuted ? MUTED_OPACITY : 0.6}
              stackId={stackId}
              isAnimationActive={true}
              animationDuration={300}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
