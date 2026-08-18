import { RiArrowDownSLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import { GroupLabelBadge } from '../list/components/ListTaskGroupSection';

export default function TableTaskGroupSection({
  group,
  groupColumn,
  columns = [],
  collapsed = false,
  onToggleCollapsed,
  tableGridStyle,
  header = null,
  footer = null,
  children,
}) {
  const titleButton = (
    <button
      type='button'
      onClick={onToggleCollapsed}
      className='flex w-full items-center gap-2 border-b border-stroke-soft-200 bg-bg-white-0 px-3 py-1.5 text-left transition hover:bg-bg-weak-50'
    >
      <RiArrowDownSLine
        size={16}
        className={cn('shrink-0 text-icon-sub-500 transition-transform', collapsed && '-rotate-90')}
      />

      <GroupLabelBadge group={group} groupColumn={groupColumn} />

      <span className='text-xs font-medium text-text-soft-400'>
        {group.totalCount ?? group.tasks.length}
      </span>
    </button>
  );

  if (collapsed) {
    return (
      // min-w-min + the zero-height width-holder keep the collapsed section as
      // wide as expanded ones so the sticky-left title stays pinned.
      <section className='min-w-min border-b border-stroke-soft-200 last:border-b-0'>
        <div className='sticky left-0 w-[100cqw]'>{titleButton}</div>
        <div style={tableGridStyle} className='h-0' aria-hidden />
      </section>
    );
  }

  return (
    // min-w-min stretches the section to the grid's track widths so the
    // sticky-left (100cqw) title/footer bars have a wide containing block to
    // stick within during horizontal scroll.
    <section className='min-w-min border-b border-stroke-soft-200 last:border-b-0'>
      {/* Sticky within the board scrollport; constrained to this section so
          the next group's header naturally replaces it. The title bar is
          additionally pinned horizontally (100cqw = scrollport width). */}
      <div className='sticky top-0 z-20 bg-bg-white-0'>
        <div className='sticky left-0 w-[100cqw]'>{titleButton}</div>
        <div className='bg-bg-white-0' style={tableGridStyle}>
          {header}
        </div>
      </div>

      <div className='bg-bg-white-0' style={tableGridStyle}>
        {children}
      </div>

      {footer ? (
        <div className='border-t border-stroke-soft-200 bg-bg-weak-50' style={tableGridStyle}>
          {footer}
        </div>
      ) : null}
    </section>
  );
}
