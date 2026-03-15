/**
 * VizChartBlock — Unified Recharts wrapper dispatching to six chart renderers.
 * Handles status states, validation, expand/pin buttons, and animations.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  VizSpec,
  ComposedVizSpec,
  isValidVizSpec,
  isValidKpiSpec,
  prepareChartData,
  deriveSeries,
} from '@/types/viz';
import { VizErrorCard } from './VizErrorCard';
import { VizSkeleton } from './VizSkeleton';
import { KpiScorecardBlock } from './KpiScorecardBlock';
import { BarChartRenderer } from './renderers/BarChart';
import { LineChartRenderer } from './renderers/LineChart';
import { AreaChartRenderer } from './renderers/AreaChart';
import { PieChartRenderer } from './renderers/PieChart';
import { ScatterChartRenderer } from './renderers/ScatterChart';
import { ComposedChartRenderer } from './renderers/ComposedChart';
import { blockVariants } from '@/lib/animations';
import { useExpandStore } from '@/stores/expand-store';

interface VizChartBlockProps {
  spec: VizSpec;
  status?: 'running' | 'complete' | 'incomplete';
  blockId?: string;
  inlineHeight?: number; // default 256 (h-64)
  showPinButton?: boolean; // default true
  readOnly?: boolean;
  className?: string;
  compact?: boolean;
  allowExpand?: boolean;
  onPin?: (blockId: string, blockType: string, blockContent: VizSpec) => void;
}

export function VizChartBlock({
  spec,
  status = 'complete',
  blockId,
  inlineHeight = 256,
  showPinButton = true,
  readOnly = false,
  className,
  compact,
  allowExpand,
  onPin,
}: VizChartBlockProps) {
  const expandStore = useExpandStore();
  const prefers_reduced_motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // When status is running, show skeleton
  if (status === 'running') {
    return <VizSkeleton type={spec.type} height={inlineHeight} className={className} />;
  }

  // When status is incomplete, show error
  if (status === 'incomplete') {
    return <VizErrorCard className={className} />;
  }

  // Validate spec
  if (spec.type === 'kpi') {
    if (!isValidKpiSpec(spec)) {
      return <VizErrorCard message="Invalid KPI data" className={className} />;
    }
    // Delegate to KpiScorecardBlock
    return <KpiScorecardBlock spec={spec} className={className} compact={compact} />;
  }

  if (!isValidVizSpec(spec)) {
    return <VizErrorCard message="Invalid chart specification" className={className} />;
  }

  // Prepare data: sorting + topN aggregation
  const series = deriveSeries(spec);
  const primaryKey = series[0]?.key ?? spec.yKey;
  const preparedData = prepareChartData(spec.data, spec.config, primaryKey);

  // Build a spec copy with the prepared data for renderers
  const preparedSpec = { ...spec, data: preparedData };

  // Dispatch to appropriate renderer
  function renderChart() {
    switch (preparedSpec.type) {
      case 'bar':
        return <BarChartRenderer spec={preparedSpec} />;
      case 'line':
        return <LineChartRenderer spec={preparedSpec} />;
      case 'area':
        return <AreaChartRenderer spec={preparedSpec} />;
      case 'pie':
        return <PieChartRenderer spec={preparedSpec} />;
      case 'scatter':
        return <ScatterChartRenderer spec={preparedSpec} />;
      case 'composed':
        return <ComposedChartRenderer spec={preparedSpec as ComposedVizSpec} />;
      default:
        return <VizErrorCard message={`Unsupported chart type: ${(preparedSpec as any).type}`} />;
    }
  }

  function handleExpand() {
    if (blockId) {
      expandStore.open(blockId, 'viz_chart', spec, spec.title);
    }
  }

  function handlePin() {
    if (onPin && blockId) {
      onPin(blockId, 'viz_chart', spec);
    }
  }

  const variants = prefers_reduced_motion
    ? {
        initial: {},
        animate: { transition: {} },
      }
    : blockVariants;

  return (
    <motion.div
      className={cn('flex flex-col gap-2', className)}
      initial="initial"
      animate="animate"
      variants={variants}
    >
      {/* Title */}
      <div className="text-sm font-medium text-muted-foreground mb-2">{spec.title}</div>

      {/* Chart area with buttons */}
      <div className="relative rounded-xl bg-surface p-3 overflow-hidden" style={{ height: `${inlineHeight}px` }}>
        {renderChart()}

        {/* Expand button (top-right) */}
        {(!readOnly || allowExpand) && (
          <button
            onClick={handleExpand}
            aria-label="Expand chart"
            className="absolute top-3 right-12 p-1.5 rounded-lg bg-surface-hover/50 hover:bg-surface-hover text-muted-foreground hover:text-accent transition-colors"
          >
            <ArrowUpRight className="size-4" />
          </button>
        )}

        {/* Pin button (bottom-right) */}
        {!readOnly && showPinButton && (
          <button
            onClick={handlePin}
            aria-label="Pin to dashboard"
            className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-surface-hover/50 hover:bg-surface-hover text-muted-foreground hover:text-accent transition-colors"
          >
            <Bookmark className="size-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
