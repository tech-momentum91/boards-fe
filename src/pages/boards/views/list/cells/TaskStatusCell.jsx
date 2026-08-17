import { cn } from '@/lib/utils';
import BoardTaskStatusDropdown from '../components/BoardTaskStatusDropdown';

export default function TaskStatusCell({
  taskId,
  status = '',
  statusGroups = [],
  allStatusGroups = [],
  isStatusLoading = false,
  onUpdate,
  disabled = false,
  compact = false,
}) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center overflow-visible',
        compact ? 'px-1' : 'min-h-11 px-2',
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <BoardTaskStatusDropdown
        value={status || ''}
        onValueChange={(value) => {
          if (!value || value === status) {
            return;
          }

          onUpdate?.(taskId, value);
        }}
        groups={statusGroups}
        allGroups={allStatusGroups}
        isLoading={isStatusLoading}
        disabled={disabled}
        showLabel={false}
        placeholder={compact ? '' : 'Status'}
        className='w-auto shrink-0'
      />
    </div>
  );
}
