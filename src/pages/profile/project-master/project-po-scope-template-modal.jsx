import React, { useCallback, useEffect, useState } from 'react';
import { RiSettings3Line } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';

export default function ProjectPoScopeTemplateModal({
  open,
  onOpenChange,
  categoryLabel = '',
  onSave,
}) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const subtitle = categoryLabel
    ? `Enter below details to create template for ${categoryLabel.toLowerCase()}.`
    : 'Enter below details to create a template.';

  useEffect(() => {
    if (!open) return;

    setName('');
    setContent('');
    setIsSaving(false);
    setEditorKey((key) => key + 1);
  }, [open]);

  const handleClose = useCallback(() => {
    if (isSaving) return;
    onOpenChange(false);
  }, [isSaving, onOpenChange]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSaving) return;

    setIsSaving(true);
    try {
      await onSave?.({ name: trimmedName, content });
      onOpenChange(false);
    } catch {
      // Parent surfaces the error toast; keep modal open for retry.
    } finally {
      setIsSaving(false);
    }
  }, [content, isSaving, name, onOpenChange, onSave]);

  return (
    <Modal.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isSaving) return;
        onOpenChange(nextOpen);
      }}
    >
      <Modal.Content className='flex max-h-[calc(100vh-4rem)] w-full max-w-[670px] flex-col overflow-hidden'>
        <Modal.Header className='shrink-0 gap-4 py-5 pl-8 pr-14'>
          <span className='flex size-11 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-500'>
            <RiSettings3Line className='size-6' />
          </span>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <Modal.Title className='text-label-lg'>Create Template</Modal.Title>
            <Modal.Description className='text-paragraph-sm text-text-sub-500'>
              {subtitle}
            </Modal.Description>
          </div>
        </Modal.Header>

        <Modal.Body className='flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5'>
          <div className='flex w-full flex-col gap-1'>
            <Label.Root>Name</Label.Root>
            <Input.Root size='medium'>
              <Input.Wrapper>
                <Input.Input
                  value={name}
                  placeholder='Enter template name'
                  onChange={(event) => setName(event.target.value)}
                  disabled={isSaving}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='flex w-full flex-col gap-1'>
            <Label.Root>Description</Label.Root>
            <div className='w-full overflow-hidden rounded-10 border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
              <SimpleEditor
                key={editorKey}
                embed
                value={content}
                onChange={setContent}
                className='h-[340px]'
              />
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className='shrink-0 gap-3 px-8 py-6'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='min-w-0 flex-1'
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            size='small'
            className='min-w-0 flex-1'
            disabled={!name.trim() || isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
