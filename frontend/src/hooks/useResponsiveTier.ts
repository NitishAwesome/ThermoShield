import { useState, useEffect } from 'react';
import { ResponsiveTier } from '../utils/navigationConfig';

export function useResponsiveTier(): ResponsiveTier {
  const [tier, setTier] = useState<ResponsiveTier>(() => {
    if (typeof window === 'undefined') return 'STANDARD';
    const width = window.innerWidth;
    if (width >= 1600) return 'WIDE';
    if (width >= 1200) return 'STANDARD';
    return 'COMPACT';
  });

  useEffect(() => {
    const evaluateTier = () => {
      const width = window.innerWidth;
      if (width >= 1600) {
        setTier('WIDE');
      } else if (width >= 1200) {
        setTier('STANDARD');
      } else {
        setTier('COMPACT');
      }
    };

    evaluateTier();
    window.addEventListener('resize', evaluateTier);
    return () => window.removeEventListener('resize', evaluateTier);
  }, []);

  return tier;
}
