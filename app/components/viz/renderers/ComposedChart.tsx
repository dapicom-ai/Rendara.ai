/**
 * Composed chart renderer — supports arbitrary series, each with its own
 * chartType (bar/line/area), y-axis assignment, stacking, and reference lines.
 * Backward compatible with legacy y2Key approach.
 */

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine as RechReferenceLine,
} from 'recharts';
import { ComposedVizSpec, deriveSeries, SeriesDef } from '@/types/viz';
import {
  CHART_COLORS,
  CHART_THEME,
  MUTED_OPACITY,
  HIGHLIGHT_STROKE_WIDTH,
  REFERENCE_LINE_COLOR,
} from '@/lib/chart-theme';
import { ChartTooltip, formatValue, ValueFormat } from '../ChartTooltip';

interface ComposedChartRendererProps {
  spec: ComposedVizSpec;
}

export function ComposedChartRenderer({ spec }: ComposedChartRendererProps) {
  const config = spec.config;
  const series = deriveSeries(spec);

  // Determine if we need a right Y-axis
  const hasRightAxis = series.some((s) => s.yAxisId === 'right');

  // Build format map for tooltip
  const formatMap: Record<string, ValueFormat> = {};
  for (const s of series) {
    if (s.format) formatMap[s.key] = s.format;
  }

  const yFormat = config?.formatY;
  const yTickFormatter = yFormat
    ? (value: number) => formatValue(value, yFormat)
    : undefined;

  const showLegend = config?.legendPosition !== 'none';

  function renderSeries(s: SeriesDef, idx: number) {
    const color = s.color ?? CHART_COLORS[idx % CHART_COLORS.length];
    const isMuted = s.emphasis === 'muted';
    const isHighlight = s.emphasis === 'highlight';
    const opacity = isMuted ? MUTED_OPACITY : 1;
    const strokeWidth = isHighlight ? HIGHLIGHT_STROKE_WIDTH : 2;
    const yAxisId = s.yAxisId ?? 'left';
    const stackId = s.stackId ?? (config?.stacked ? 'stack' : undefined);
    const chartType = s.chartType ?? 'bar'; // default to bar for composed

    const commonProps = {
      key: s.key,
      dataKey: s.key,
      name: s.label ?? s.key,
      yAxisId,
      isAnimationActive: true,
      animationDuration: 300,
    };

    switch (chartType) {
      case 'line':
        return (
          <Line
            {...commonProps}
            type="monotone"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            dot={false}
          />
        );
      case 'area':
        return (
          <Area
            {...commonProps}
            type="monotone"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            fill={color}
            fillOpacity={isMuted ? MUTED_OPACITY : 0.2}
            stackId={stackId}
          />
        );
      case 'bar':
      default:
        return (
          <Bar
            {...commonProps}
            fill={color}
            fillOpacity={opacity}
            stackId={stackId}
          />
        );
    }
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={spec.data} margin={{ top: 8, right: 32, left: 0, bottom: 32 }}>
        <CartesianGrid stroke={CHART_THEME.grid.stroke} strokeDasharray="3 3" />
        <XAxis
          dataKey={spec.xKey}
          tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.stroke }}
          axisLine={{ stroke: CHART_THEME.axis.stroke }}
        />
        {/* Left Y-axis (always present) */}
        <YAxis
          yAxisId="left"
          tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.stroke }}
          axisLine={{ stroke: CHART_THEME.axis.stroke }}
          tickFormatter={yTickFormatter}
        />
        {/* Right Y-axis (only if any series uses it) */}
        {hasRightAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.stroke }}
            axisLine={{ stroke: CHART_THEME.axis.stroke }}
            tickFormatter={yTickFormatter}
          />
        )}
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
            yAxisId="left"
            y={rl.y}
            label={rl.label ? { value: rl.label, fill: CHART_THEME.axis.stroke, fontSize: 11 } : undefined}
            stroke={rl.color ?? REFERENCE_LINE_COLOR}
            strokeDasharray={rl.strokeDasharray ?? '5 5'}
          />
        ))}
        {/* Dynamic series */}
        {series.map((s, idx) => renderSeries(s, idx))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
