/**
 * Error fallback card for invalid VizSpecs.
 * Displays a warning icon and helpful message.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VizErrorCardProps {
  message?: string;
  className?: string;
}

export function VizErrorCard({ message, className }: VizErrorCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl bg-surface p-6 text-center',
        className
      )}
    >
      <AlertTriangle className="size-8 text-warning" />
      <div className="text-sm text-muted-foreground">Unable to render visualization</div>
      {message && <div className="text-xs text-muted-foreground">{message}</div>}
    </div>
  );
}
