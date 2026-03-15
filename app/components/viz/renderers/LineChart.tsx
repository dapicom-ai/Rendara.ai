/**
 * Line chart renderer using Recharts.
 * Supports multi-series, emphasis highlighting, reference lines,
 * and y-axis formatting.
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
  ReferenceLine as RechReferenceLine,
  Legend,
} from 'recharts';
import { LineVizSpec, deriveSeries } from '@/types/viz';
import {
  CHART_COLORS,
  CHART_THEME,
  MUTED_OPACITY,
  HIGHLIGHT_STROKE_WIDTH,
  REFERENCE_LINE_COLOR,
} from '@/lib/chart-theme';
import { ChartTooltip, formatValue, ValueFormat } from '../ChartTooltip';

interface LineChartRendererProps {
  spec: LineVizSpec;
}

export function LineChartRenderer({ spec }: LineChartRendererProps) {
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
      <LineChart data={spec.data} margin={{ top: 8, right: 32, left: 0, bottom: 32 }}>
        <defs>
          {series.map((s, idx) => {
            const color = s.color ?? CHART_COLORS[idx % CHART_COLORS.length];
            return (
              <linearGradient key={`lineGrad-${s.key}`} id={`lineGradient-${s.key}`}>
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
        {/* Lines */}
        {series.map((s, idx) => {
          const color = s.color ?? CHART_COLORS[idx % CHART_COLORS.length];
          const isMuted = s.emphasis === 'muted';
          const isHighlight = s.emphasis === 'highlight';
          const strokeWidth = isHighlight ? HIGHLIGHT_STROKE_WIDTH : 2;
          const opacity = isMuted ? MUTED_OPACITY : 1;

          return (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              fill={`url(#lineGradient-${s.key})`}
              dot={false}
              isAnimationActive={true}
              animationDuration={300}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
