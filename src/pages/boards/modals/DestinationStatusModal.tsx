import { useEffect, useState, type FormEvent } from 'react';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import BoardTaskStatusDropdown from '@/pages/boards/views/list/components/BoardTaskStatusDropdown';
import { getStatusTemplateForList } from '@/services/status-template-service';
import {
  buildBoardStatusOptionGroups,
  getDefaultBoardStatusValue,
} from '@/pages/boards/utils/task-statuses-utils';

type DestinationList = {
  id: string;
  label?: string;
};

type DestinationStatusModalProps = {
  open: boolean;
  destinationList: DestinationList | null;
  action: 'move' | 'add';
  taskCount?: number;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (status: string) => void | Promise<void>;
};

export default function DestinationStatusModal({
  open,
  destinationList,
  action,
  taskCount = 1,
  isSubmitting = false,
  onOpenChange,
  onConfirm,
}: DestinationStatusModalProps) {
  const [groups, setGroups] = useState<ReturnType<typeof buildBoardStatusOptionGroups>>([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !destinationList?.id) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError('');
    setStatus('');

    void getStatusTemplateForList(destinationList.id).then((result) => {
      if (cancelled) {
        return;
      }

      if (result.error) {
        setGroups([]);
        setError(result.error);
        setIsLoading(false);
        return;
      }

      const nextGroups = buildBoardStatusOptionGroups(result.data);
      setGroups(nextGroups);
      const defaultStatus = getDefaultBoardStatusValue(nextGroups);
      setStatus(defaultStatus);
      if (!defaultStatus) {
        setError('This list has no enabled statuses. Add a status before continuing.');
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [destinationList?.id, open]);

  const actionLabel = action === 'move' ? 'Move' : 'Add';
  const taskLabel = taskCount === 1 ? 'task' : 'tasks';
  const canConfirm = Boolean(status) && !isLoading && !isSubmitting && !error;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canConfirm) {
      return;
    }
    void onConfirm(status);
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content showClose={!isSubmitting} className='max-w-[440px]'>
        <form onSubmit={handleSubmit}>
          <Modal.Header
            title={`Choose a status to ${action}`}
            description={`Select the status for ${taskCount} ${taskLabel} in ${destinationList?.label ?? 'the destination list'}.`}
          />
          <Modal.Body className='space-y-3'>
            <BoardTaskStatusDropdown
              value={status}
              onValueChange={setStatus}
              groups={groups}
              allGroups={groups}
              isLoading={isLoading}
              disabled={isSubmitting || Boolean(error)}
              showLabel
              className='w-full'
            />
            {error ? <p className='text-paragraph-sm text-error-base'>{error}</p> : null}
          </Modal.Body>
          <Modal.Footer className='flex-row justify-end'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button.Root>
            <Button.Root type='submit' size='small' disabled={!canConfirm}>
              {isSubmitting ? `${actionLabel}ing…` : `${actionLabel} ${taskLabel}`}
            </Button.Root>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}
