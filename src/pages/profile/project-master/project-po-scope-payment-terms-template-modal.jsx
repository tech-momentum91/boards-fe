import React, { useCallback, useEffect, useState } from 'react';
import { RiSettings3Line } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import ProjectPoScopePaymentMilestonesEditor, {
  createPaymentMilestone,
  doMilestonesTotalHundred,
  getMilestonePercentageTotal,
} from '@/pages/profile/project-master/project-po-scope-payment-milestones-editor';
import { showErrorToast } from '@/utils/error-utils';

export default function ProjectPoScopePaymentTermsTemplateModal({
  open,
  onOpenChange,
  mode = 'create',
  initialValues,
  onSave,
}) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [milestones, setMilestones] = useState([createPaymentMilestone({ percentage: '100' })]);
  const [editorKey, setEditorKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = mode === 'edit';
  const title = isEditMode ? 'Edit Template' : 'Create Template';
  const subtitle = isEditMode
    ? 'Update the details for this payment terms template.'
    : 'Enter below details to create template for payment terms.';

  useEffect(() => {
    if (!open) return;

    setName(initialValues?.name ?? '');
    setContent(initialValues?.content ?? '');
    setMilestones(
      initialValues?.milestones?.length
        ? initialValues.milestones.map((milestone) => ({ ...milestone }))
        : [createPaymentMilestone({ percentage: '100' })],
    );
    setIsSaving(false);
    setEditorKey((key) => key + 1);
  }, [open, initialValues?.name, initialValues?.content, initialValues?.milestones]);

  const handleClose = useCallback(() => {
    if (isSaving) return;
    onOpenChange(false);
  }, [isSaving, onOpenChange]);

  const handleUpdateMilestone = useCallback((milestoneId, field, value) => {
    setMilestones((previous) =>
      previous.map((milestone) =>
        milestone.id === milestoneId ? { ...milestone, [field]: value } : milestone,
      ),
    );
  }, []);

  const handleAddMilestone = useCallback(() => {
    setMilestones((previous) => [...previous, createPaymentMilestone()]);
  }, []);

  const handleDeleteMilestone = useCallback((milestoneId) => {
    setMilestones((previous) => {
      if (previous.length <= 1) return previous;
      return previous.filter((milestone) => milestone.id !== milestoneId);
    });
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSaving) return;

    if (!doMilestonesTotalHundred(milestones)) {
      const total = getMilestonePercentageTotal(milestones);
      const formatted =
        total === Math.trunc(total)
          ? String(Math.trunc(total))
          : String(Math.round(total * 100) / 100);
      showErrorToast(`Payment milestone percentages must total 100% (currently ${formatted}%)`);
      return;
    }

    setIsSaving(true);
    try {
      await onSave?.({
        name: trimmedName,
        content,
        milestones: milestones.map((milestone) => ({
          ...milestone,
          name: milestone.name.trim(),
          percentage: milestone.percentage.trim(),
          remarks: milestone.remarks.trim(),
        })),
      });
      onOpenChange(false);
    } catch {
      // Parent surfaces the error toast; keep modal open for retry.
    } finally {
      setIsSaving(false);
    }
  }, [content, isSaving, milestones, name, onOpenChange, onSave]);

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
            <Modal.Title className='text-label-lg'>{title}</Modal.Title>
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
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <ProjectPoScopePaymentMilestonesEditor
            milestones={milestones}
            variant='form'
            onUpdateMilestone={handleUpdateMilestone}
            onAddMilestone={handleAddMilestone}
            onDeleteMilestone={handleDeleteMilestone}
          />

          <div className='flex w-full flex-col gap-1'>
            <Label.Root>Description</Label.Root>
            <div className='w-full overflow-hidden rounded-10 border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
              <SimpleEditor
                key={editorKey}
                embed
                value={content}
                onChange={setContent}
                className='h-[260px]'
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
