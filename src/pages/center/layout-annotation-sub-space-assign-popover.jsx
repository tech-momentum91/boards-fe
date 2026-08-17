import React from 'react';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';

/**
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   anchor: { clientX: number, clientY: number },
 *   spaceDisplayLabel: string,
 *   selectedSubSpaceRowId: string,
 *   onSelectedSubSpaceRowIdChange: (value: string) => void,
 *   subSpaceRows: unknown[],
 *   isSavingSubSpaceLayout: boolean,
 *   onSave: () => void,
 * }} props
 */
export default function LayoutAnnotationSubSpaceAssignPopover({
  open,
  onOpenChange,
  anchor,
  spaceDisplayLabel,
  selectedSubSpaceRowId,
  onSelectedSubSpaceRowIdChange,
  subSpaceRows,
  isSavingSubSpaceLayout,
  onSave,
}) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Anchor asChild>
        <div
          className='pointer-events-none fixed z-40 h-px w-px'
          style={{
            left: anchor.clientX,
            top: anchor.clientY,
          }}
          aria-hidden
        />
      </Popover.Anchor>
      <Popover.Content
        className='w-[min(100vw-2rem,380px)] p-4'
        align='start'
        side='bottom'
        sideOffset={8}
        collisionPadding={16}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className='flex flex-col gap-3'>
          <div>
            <p className='text-label-sm font-semibold text-text-strong-950'>Assign sub-space</p>
            <p className='mt-0.5 text-paragraph-xs text-text-sub-600'>
              Pick a space number for this marker. Space is determined by the outline you placed the
              dot inside (must be associated with a space first).
            </p>
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label.Root>Space</Label.Root>
            <Input.Root size='small' readOnly disabled className='opacity-90'>
              <Input.Wrapper>
                <Input.Input value={spaceDisplayLabel} tabIndex={-1} />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label.Root>Sub-space</Label.Root>
            <Select.Root
              value={selectedSubSpaceRowId}
              onValueChange={onSelectedSubSpaceRowIdChange}
            >
              <Select.Trigger className='w-full' disabled={subSpaceRows.length === 0}>
                <Select.Value
                  placeholder={
                    subSpaceRows.length === 0
                      ? 'No seats without a coworker coordinate'
                      : 'Select sub-space'
                  }
                />
              </Select.Trigger>
              <Select.Content>
                {subSpaceRows.map((ss) => {
                  const rowId = String(ss.sub_space_row_id ?? ss.name ?? '').trim();
                  if (!rowId) return null;
                  const sid = String(ss.sub_space_id ?? '').trim();
                  const label =
                    String(ss.sub_space_name ?? '').trim() ||
                    sid ||
                    (ss.seq != null ? `Sub-space #${ss.seq}` : rowId);
                  const locked = Number(ss.locked) === 1;
                  const occ = Number(ss.occupied) === 1;
                  return (
                    <Select.Item key={rowId} value={rowId} disabled={locked}>
                      <span className='flex flex-col gap-0.5 text-left'>
                        <span>
                          {label}
                          {sid && sid !== label ? (
                            <span className='text-paragraph-xs text-text-sub-600'> · {sid}</span>
                          ) : null}
                          {ss.seq != null ? ` · #${ss.seq}` : ''}
                        </span>
                        {(occ || locked) && (
                          <span className='text-paragraph-xs text-text-sub-600'>
                            {locked ? 'Locked' : ''}
                            {locked && occ ? ' · ' : ''}
                            {occ ? 'Occupied' : ''}
                          </span>
                        )}
                      </span>
                    </Select.Item>
                  );
                })}
              </Select.Content>
            </Select.Root>
          </div>

          <div className='flex justify-end gap-2 pt-1'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isSavingSubSpaceLayout}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              disabled={!selectedSubSpaceRowId || isSavingSubSpaceLayout}
              onClick={() => void onSave()}
            >
              {isSavingSubSpaceLayout ? 'Saving…' : 'Save'}
            </Button.Root>
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
