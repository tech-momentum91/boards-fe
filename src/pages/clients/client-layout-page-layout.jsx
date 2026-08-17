import React from 'react';

import FloorLayoutPageShell from '@/components/layout/floor-layout-page-shell';

/**
 * Full-viewport shell for the client allocate layout viewer (no app sidebar).
 *
 * @param {{
 *   title?: string,
 *   subtitle?: string,
 *   onBack?: () => void,
 *   headerFilters?: React.ReactNode,
 *   headerActions?: React.ReactNode,
 *   children?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export default function ClientLayoutPageLayout({
  title,
  subtitle,
  onBack,
  headerFilters,
  headerActions,
  children,
  className,
}) {
  return (
    <FloorLayoutPageShell
      title={title}
      subtitle={subtitle}
      onBack={onBack}
      backAriaLabel='Go back'
      headerFilters={headerFilters}
      headerActions={headerActions}
      className={className}
    >
      {children}
    </FloorLayoutPageShell>
  );
}
