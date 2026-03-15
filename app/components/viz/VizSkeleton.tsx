/**
 * Loading skeleton states for visualizations.
 * Provides type-aware skeleton shapes via animate-pulse.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ChartType } from '@/types/viz';

interface VizSkeletonProps {
  type?: ChartType;
  height?: number; // in pixels
  className?: string;
}

function BarSkeleton() {
  return (
    <div className="flex items-end gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-surface"
          style={{ height: `${40 + i * 20}px` }}
        />
      ))}
    </div>
  );
}

function LineSkeleton() {
  return (
    <svg
      className="w-full animate-pulse"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
    >
      <polyline
        points="0,30 25,15 50,25 75,10 100,20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-surface"
      />
    </svg>
  );
}

function PieSkeleton() {
  return (
    <div className="flex items-center justify-center">
      <div className="size-24 rounded-full bg-surface animate-pulse" />
    </div>
  );
}

function ScatterSkeleton() {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="size-2 rounded-full bg-surface animate-pulse" />
      ))}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="flex gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex-1 h-24 rounded-lg bg-surface animate-pulse" />
      ))}
    </div>
  );
}

export function VizSkeleton({ type, height = 256, className }: VizSkeletonProps) {
  let content;

  switch (type) {
    case 'bar':
      content = <BarSkeleton />;
      break;
    case 'line':
    case 'area':
      content = <LineSkeleton />;
      break;
    case 'pie':
      content = <PieSkeleton />;
      break;
    case 'scatter':
      content = <ScatterSkeleton />;
      break;
    case 'kpi':
      content = <KpiSkeleton />;
      break;
    case 'composed':
      content = <BarSkeleton />;
      break;
    default:
      content = <div className="rounded-lg bg-surface animate-pulse" />;
  }

  return (
    <div
      className={cn('rounded-xl bg-surface p-4', className)}
      style={{ height: `${height}px` }}
    >
      {content}
    </div>
  );
}
