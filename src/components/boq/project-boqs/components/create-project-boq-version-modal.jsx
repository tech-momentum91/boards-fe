import React, { useCallback, useEffect, useState } from 'react';
import { RiCloseLine, RiGitBranchLine } from 'react-icons/ri';

import { getProjectBoqVersionStatusLabel } from '@/components/boq/constants';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';

const EMPTY_COPY_VALUE = '__empty__';

const CreateProjectBoqVersionModal = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  versions = [],
}) => {
  const [copyFromVersion, setCopyFromVersion] = useState(EMPTY_COPY_VALUE);

  useEffect(() => {
    if (!open) {
      setCopyFromVersion(EMPTY_COPY_VALUE);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const copyFromVersionCode = copyFromVersion === EMPTY_COPY_VALUE ? '' : copyFromVersion;
    await onSubmit?.({ copyFromVersionCode });
  }, [copyFromVersion, onSubmit]);

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className='flex max-h-[min(520px,calc(100dvh-32px))] w-full max-w-[487px] flex-col overflow-hidden p-0'
        showClose={false}
      >
        <div className='flex shrink-0 items-center gap-4 border-b border-stroke-soft-200 px-5 py-4'>
          <span className='flex shrink-0 items-center justify-center rounded-full bg-bg-weak-50 p-2.5'>
            <RiGitBranchLine className='size-6 text-text-sub-600' aria-hidden />
          </span>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <Modal.Title>Create new version</Modal.Title>
            <Modal.Description>
              Choose which version to copy items from, or start with an empty BOQ.
            </Modal.Description>
          </div>
          <Modal.Close asChild>
            <CompactButton.Root variant='ghost' size='medium' className='shrink-0'>
              <CompactButton.Icon as={RiCloseLine} />
            </CompactButton.Root>
          </Modal.Close>
        </div>

        <Modal.Body className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5'>
          <div className='flex flex-col gap-1'>
            <Label.Root>Copy items from</Label.Root>
            <Select.Root value={copyFromVersion} onValueChange={setCopyFromVersion}>
              <Select.Trigger className='w-full'>
                <Select.Value placeholder='Select version' />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value={EMPTY_COPY_VALUE}>Start empty (no items)</Select.Item>
                {versions.map((versionOption) => (
                  <Select.Item key={versionOption.id} value={versionOption.id}>
                    {versionOption.label}
                    {versionOption.date ? ` · ${versionOption.date}` : ''}
                    {versionOption.liveBadge ? ` · ${versionOption.liveBadge}` : ''}
                    {' · '}
                    {getProjectBoqVersionStatusLabel(versionOption.status)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        </Modal.Body>

        <Modal.Footer className='flex shrink-0 gap-3 border-t border-stroke-soft-200 px-5 py-4'>
          <Modal.Close asChild>
            <Button.Root
              className='min-w-0 flex-1'
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
            >
              Cancel
            </Button.Root>
          </Modal.Close>
          <Button.Root
            type='button'
            className={cn('min-w-0 flex-1 bg-[#079455] hover:bg-[#067644]')}
            variant='primary'
            mode='filled'
            size='small'
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Creating...' : 'Create version'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CreateProjectBoqVersionModal;
