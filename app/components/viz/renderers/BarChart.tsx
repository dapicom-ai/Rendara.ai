/**
 * Bar chart renderer using Recharts.
 * Supports multi-series (grouped/stacked), horizontal orientation,
 * highlighted categories, reference lines, and y-axis formatting.
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
  ReferenceLine as RechReferenceLine,
  Legend,
  Cell,
} from 'recharts';
import { BarVizSpec, deriveSeries, SeriesDef } from '@/types/viz';
import {
  CHART_COLORS,
  CHART_THEME,
  MUTED_OPACITY,
  HIGHLIGHT_STROKE_WIDTH,
  REFERENCE_LINE_COLOR,
} from '@/lib/chart-theme';
import { ChartTooltip, formatValue, ValueFormat } from '../ChartTooltip';

interface BarChartRendererProps {
  spec: BarVizSpec;
}

export function BarChartRenderer({ spec }: BarChartRendererProps) {
  const config = spec.config;
  const series = deriveSeries(spec);
  const isHorizontal = config?.orientation === 'horizontal';
  const highlights = config?.highlights;
  const hasHighlights = highlights && highlights.length > 0;

  // Build format map for tooltip
  const formatMap: Record<string, ValueFormat> = {};
  for (const s of series) {
    if (s.format) formatMap[s.key] = s.format;
  }

  // Y-axis tick formatter
  const yFormat = config?.formatY;
  const yTickFormatter = yFormat
    ? (value: number) => formatValue(value, yFormat)
    : undefined;

  // Legend visibility
  const showLegend = series.length > 1 && config?.legendPosition !== 'none';

  // Determine stack IDs
  function getStackId(s: SeriesDef, idx: number): string | undefined {
    if (s.stackId) return s.stackId;
    if (config?.stacked) return 'stack';
    return undefined;
  }

  // Get color for a series
  function getSeriesColor(s: SeriesDef, idx: number): string {
    return s.color ?? CHART_COLORS[idx % CHART_COLORS.length];
  }

  // Get opacity for a series based on emphasis
  function getSeriesOpacity(s: SeriesDef): number {
    if (s.emphasis === 'muted') return MUTED_OPACITY;
    return 1;
  }

  // Common axis props
  const categoryAxisProps = {
    dataKey: spec.xKey,
    tick: { fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.stroke },
    axisLine: { stroke: CHART_THEME.axis.stroke },
  };

  const valueAxisProps = {
    tick: { fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.stroke },
    axisLine: { stroke: CHART_THEME.axis.stroke },
    tickFormatter: yTickFormatter,
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={spec.data}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 32, left: 0, bottom: 32 }}
      >
        <CartesianGrid stroke={CHART_THEME.grid.stroke} strokeDasharray="3 3" />
        {isHorizontal ? (
          <>
            <YAxis type="category" {...categoryAxisProps} />
            <XAxis type="number" {...valueAxisProps} />
          </>
        ) : (
          <>
            <XAxis {...categoryAxisProps} />
            <YAxis {...valueAxisProps} />
          </>
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
            y={isHorizontal ? undefined : rl.y}
            x={isHorizontal ? rl.y : undefined}
            label={rl.label ? { value: rl.label, fill: CHART_THEME.axis.stroke, fontSize: 11 } : undefined}
            stroke={rl.color ?? REFERENCE_LINE_COLOR}
            strokeDasharray={rl.strokeDasharray ?? '5 5'}
          />
        ))}
        {/* Bars */}
        {series.map((s, idx) => {
          const color = getSeriesColor(s, idx);
          const opacity = getSeriesOpacity(s);

          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label ?? s.key}
              fill={color}
              fillOpacity={hasHighlights ? undefined : opacity}
              stackId={getStackId(s, idx)}
              isAnimationActive={true}
              animationDuration={300}
            >
              {/* Per-cell highlighting */}
              {hasHighlights &&
                spec.data.map((row, cellIdx) => {
                  const categoryVal = String(row[spec.xKey]);
                  const isHighlighted = highlights!.includes(categoryVal);
                  return (
                    <Cell
                      key={`cell-${cellIdx}`}
                      fill={color}
                      fillOpacity={isHighlighted ? 1 : MUTED_OPACITY}
                    />
                  );
                })}
            </Bar>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
