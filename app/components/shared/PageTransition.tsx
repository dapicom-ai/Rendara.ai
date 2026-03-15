"use client";

import { motion } from 'framer-motion';
import { pageVariants } from "@/lib/animations";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageTransition wrapper component.
 * Animates page content on mount/unmount with fade + slide.
 * Respects prefers-reduced-motion automatically.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  // When motion is reduced, return static variants
  const variants = prefersReducedMotion
    ? {
        initial: {},
        animate: { transition: {} },
        exit: { transition: {} },
      }
    : pageVariants;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
