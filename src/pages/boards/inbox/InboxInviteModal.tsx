import * as Modal from '@/components/ui/modal';
import { cn } from '@/utils/cn';

type InboxInviteModalProps = {
  open: boolean;
  title?: string | null;
  actorName?: string | null;
  resourceType?: string | null;
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
};

export default function InboxInviteModal({
  open,
  title,
  actorName,
  resourceType,
  busy = false,
  onAccept,
  onDecline,
  onClose,
}: InboxInviteModalProps) {
  const resourceLabel = resourceType || 'board';
  const inviter = actorName || 'Someone';

  return (
    <Modal.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <Modal.Content showClose={!busy} className='max-w-[440px]'>
        <Modal.Header
          title='Invitation'
          description={`${inviter} invited you to ${resourceLabel}${
            title ? ` “${title}”` : ''
          }. Accept to get access, or decline to dismiss.`}
        />
        <Modal.Footer className='flex-row justify-end gap-2'>
          <button
            type='button'
            disabled={busy}
            onClick={onDecline}
            className={cn(
              'rounded-lg px-3 py-2 text-sm text-text-sub-500 transition hover:bg-bg-weak-50',
              busy && 'opacity-60',
            )}
          >
            Decline
          </button>
          <button
            type='button'
            disabled={busy}
            onClick={onAccept}
            className={cn(
              'rounded-lg bg-primary-base px-3 py-2 text-sm text-static-white transition hover:opacity-90',
              busy && 'opacity-60',
            )}
          >
            Accept
          </button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
