import React, { useEffect, useState } from 'react';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import { toast } from '@/components/ui/toast';

import { saveTab } from '@/services/dashboard-master-service';

export default function TabFormModal({ open, onOpenChange, dashboardId, initialValue, onSaved }) {
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initialValue?.tab_id);

  useEffect(() => {
    if (!open) return;
    setDisplayName(initialValue?.display_name || '');
  }, [open, initialValue]);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await saveTab({
        tabId: initialValue?.tab_id ?? null,
        dashboard: dashboardId,
        displayName: displayName.trim(),
        tabName: displayName.trim(),
        sortOrder: initialValue?.sort_order ?? 0,
        ...(isEdit
          ? {
              daysFilter: initialValue?.days_filter ?? {},
              centersFilter: initialValue?.centers_filter ?? {},
              clientFilter: initialValue?.client_filter ?? {},
              extraFilter: initialValue?.extra_filter ?? {},
            }
          : {}),
      });
      toast.success(isEdit ? 'Tab updated' : 'Tab created');
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error?.message || 'Could not save tab');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[420px]'>
        <Modal.Header title={isEdit ? 'Rename Tab' : 'Add Tab'} />
        <Modal.Body className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1'>
            <Label.Root>
              Tab Name
              <Label.Asterisk />
            </Label.Root>
            <Input.Root size='medium'>
              <Input.Wrapper>
                <Input.Input
                  placeholder='e.g. Overview, Financial Performance'
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='medium'
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button.Root>
          <Button.Root size='medium' onClick={handleSave} disabled={saving || !displayName.trim()}>
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Add Tab'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
