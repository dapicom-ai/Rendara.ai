/**
 * KPI Scorecard Block — renders a grid of metric cards with values, formats, and trends.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { blockVariants } from '@/lib/animations';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { VizSpec } from '@/types/viz';

interface KpiScorecardBlockProps {
  spec: VizSpec; // spec.type === 'kpi'
  className?: string;
  compact?: boolean;
}

function formatValue(
  value: number,
  format: 'currency' | 'number' | 'percentage'
): string {
  if (format === 'currency') {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value);
    return formatted;
  }

  if (format === 'percentage') {
    return `${value.toFixed(1)}%`;
  }

  // format === 'number'
  return new Intl.NumberFormat('en-US').format(value);
}

export function KpiScorecardBlock({ spec, className, compact }: KpiScorecardBlockProps) {
  const prefersReducedMotion = useReducedMotion();
  // Normalize data items — accept both {label, ...} and AI-generated {metric, ...} shapes
  const data = ((spec.data as Array<Record<string, unknown>>) ?? []).map((item) => {
    // Coerce string values — LLM may produce "$42.80" or "3.2%" instead of a number
    const rawValue = item.value;
    const numericValue = typeof rawValue === 'number'
      ? rawValue
      : parseFloat(String(rawValue).replace(/[^0-9.-]/g, '')) || 0;
    return {
      label: (item.label as string) || (item.metric as string) || 'Metric',
      value: numericValue,
      format: (item.format as 'currency' | 'number' | 'percentage') || 'number',
      trend: (item.trend as string) || '',
      trendDirection: item.trendDirection as 'up' | 'down' | undefined,
    };
  });

  const variants = prefersReducedMotion
    ? {
        initial: {},
        animate: { transition: {} },
      }
    : blockVariants;

  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={variants}
    >
      {/* Title */}
      <div className={`text-sm font-medium text-muted-foreground ${compact ? 'mb-2' : 'mb-3'}`}>{spec.title}</div>

      {/* Card grid */}
      <div className={compact ? 'grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2' : 'grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3'}>
        {data.map((item, index) => (
          <div
            key={index}
            className={`rounded-xl bg-surface ${compact ? 'p-2' : 'p-4'}`}
          >
            {/* Label */}
            <div className="text-xs uppercase tracking-wide text-muted-foreground truncate">
              {item.label}
            </div>

            {/* Value */}
            <div className={`${compact ? 'text-xl font-bold text-primary mt-0.5 tabular-nums truncate' : 'text-2xl font-bold text-primary mt-1 tabular-nums truncate'}`}>
              {formatValue(item.value, item.format)}
            </div>

            {/* Trend */}
            {item.trendDirection && (
              <div
                className={`flex items-center gap-1 text-sm mt-2 ${
                  item.trendDirection === 'up' ? 'text-success' : 'text-error'
                }`}
              >
                {item.trendDirection === 'up' ? (
                  <TrendingUp className="size-4" />
                ) : (
                  <TrendingDown className="size-4" />
                )}
                <span>{item.trend}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
