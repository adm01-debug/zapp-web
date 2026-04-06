import { useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import type { Variants, Transition } from 'framer-motion';

/**
 * Returns animation variants that respect `prefers-reduced-motion`.
 * When reduced motion is preferred, animations resolve instantly.
 */
export function useAccessibleVariants(variants: Variants): Variants {
  const prefersReduced = useReducedMotion();

  return useMemo(() => {
    if (!prefersReduced) return variants;

    const safe: Variants = {};
    for (const key in variants) {
      const v = variants[key];
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        // Strip animation properties, keep final visual state
        const { transition, ...rest } = v as Record<string, unknown>;
        safe[key] = {
          ...rest,
          transition: { duration: 0 } as Transition,
        };
      } else {
        safe[key] = v;
      }
    }
    return safe;
  }, [prefersReduced, variants]);
}

/** Standard fade variant — motion-safe */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Standard slide-up variant — motion-safe */
export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as unknown as [number, number, number, number] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/** Stagger container variant */
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

/** Stagger child variant */
export const staggerChildVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as unknown as [number, number, number, number] },
  },
};

/** Scale-in variant for modals/popups */
export const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as unknown as [number, number, number, number] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};
