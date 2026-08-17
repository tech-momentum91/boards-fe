import React, { useMemo } from 'react';

import FloorLayoutPageShell from '@/components/layout/floor-layout-page-shell';

/**
 * Full-viewport shell for the layout annotation editor (no app sidebar).
 */
export default function LayoutAnnotationPageLayout({
  centerTitle,
  floorLabel,
  availableSpaceCount,
  onBack,
  headerFilters,
  children,
  className,
}) {
  const subtitle = useMemo(() => {
    const metaParts = [];
    if (floorLabel) metaParts.push(String(floorLabel).trim());
    if (availableSpaceCount != null && !Number.isNaN(Number(availableSpaceCount))) {
      const n = Number(availableSpaceCount);
      metaParts.push(`${n} ${n === 1 ? 'space' : 'spaces'} available`);
    }
    return metaParts.length > 0 ? `• ${metaParts.join(' • ')}` : null;
  }, [floorLabel, availableSpaceCount]);

  return (
    <FloorLayoutPageShell
      title={centerTitle || 'Center'}
      subtitle={subtitle}
      onBack={onBack}
      backAriaLabel='Go back to center layouts'
      headerFilters={headerFilters}
      className={className}
    >
      {children}
    </FloorLayoutPageShell>
  );
}
