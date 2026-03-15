/**
 * MultiVizCard — grid layout for multiple charts.
 * Handles responsive column spans: 1 chart = full width, 2 = two columns,
 * 3 = two columns with third spanning both, 4+ = two columns.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { blockVariants } from '@/lib/animations';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface MultiVizCardProps {
  children: React.ReactNode;
  count: number; // total number of children
  className?: string;
}

export function MultiVizCard({ children, count, className }: MultiVizCardProps) {
  const prefersReducedMotion = useReducedMotion();
  let gridClass: string;

  if (count === 1) {
    gridClass = 'grid-cols-1';
  } else if (count === 2) {
    gridClass = 'grid-cols-2';
  } else if (count === 3) {
    gridClass = 'grid-cols-2';
  } else {
    gridClass = 'grid-cols-2'; // 4+
  }

  const variants = prefersReducedMotion
    ? {
        initial: {},
        animate: { transition: {} },
      }
    : blockVariants;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      className={cn(
        `grid ${gridClass} gap-3 p-3 bg-surface rounded-xl`,
        className
      )}
    >
      {React.Children.map(children, (child, index) => {
        // For 3 charts, span both columns on the third child
        const isThirdOfThree = count === 3 && index === 2;
        return (
          <div className={isThirdOfThree ? 'col-span-2' : ''}>
            {child}
          </div>
        );
      })}
    </motion.div>
  );
}
