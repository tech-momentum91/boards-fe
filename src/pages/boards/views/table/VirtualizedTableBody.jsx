import { useVirtualizer } from '@tanstack/react-virtual';

const DEFAULT_ROW_HEIGHT = 32;

export default function VirtualizedTableBody({
  tasks = [],
  scrollElementRef,
  renderRow,
  gridTemplateColumns = '',
}) {
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => scrollElementRef?.current ?? null,
    estimateSize: () => DEFAULT_ROW_HEIGHT,
    overscan: 12,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
        gridColumn: '1 / -1',
      }}
    >
      {virtualItems.map((virtualRow) => {
        const task = tasks[virtualRow.index];

        if (!task) {
          return null;
        }

        return (
          <div
            key={task.id}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
              display: 'grid',
              gridTemplateColumns,
            }}
          >
            {renderRow(task, virtualRow.index + 1)}
          </div>
        );
      })}
    </div>
  );
}
