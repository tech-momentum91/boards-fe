import React from 'react';

import { cn } from '@/utils/cn';

/**
 * Hero background image — fixed layout, no Client(ai) color wash.
 */
export default function ProposalHeroBackground({ wrapClassName, imageClassName, src, alt = '' }) {
  return (
    <div className={cn('proposal-hero-bg-wrap', wrapClassName)}>
      <img className={imageClassName} src={src} alt={alt} draggable={false} />
    </div>
  );
}
