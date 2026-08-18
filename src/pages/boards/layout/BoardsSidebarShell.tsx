import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type BoardsSidebarShellProps = {
  collapsed: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Animates boards sidebar open/close.
 * Uses negative margin (layout) + translate/opacity (paint) so the
 * main pane expands smoothly while the panel slides away.
 */
export default function BoardsSidebarShell({
  collapsed,
  children,
  className,
}: BoardsSidebarShellProps) {
  return (
    <div
      className={cn(
        'h-full w-[15rem] shrink-0 will-change-[margin,transform,opacity]',
        'transition-[margin,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        collapsed
          ? 'pointer-events-none -ml-[15rem] -translate-x-3 opacity-0'
          : 'ml-0 translate-x-0 opacity-100',
        className,
      )}
      aria-hidden={collapsed}
      inert={collapsed ? true : undefined}
    >
      {children}
    </div>
  );
}
