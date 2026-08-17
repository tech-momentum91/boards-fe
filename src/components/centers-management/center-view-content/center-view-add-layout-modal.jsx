import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiBox2Fill, RiUploadCloud2Line } from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT_ATTR = '.pdf,.png,.jpg,.jpeg,.webp';
const ACCEPT_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function normalizeFloorOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((opt) => {
    if (typeof opt !== 'object' || opt === null || !('value' in opt)) {
      const s = String(opt);
      return { value: s, label: s };
    }
    const value = String(opt.value ?? '');
    return { value, label: String(opt.label ?? value) };
  });
}

function isRasterLayoutFile(f) {
  if (!f) return false;
  const type = (f.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp)$/i.test(f.name || '');
}

const CenterViewAddLayoutModal = ({
  open,
  onOpenChange,
  floorOptions = [],
  isFloorsLoading = false,
  isSaving = false,
  /** Called when user saves a layout file. */
  onSave,
}) => {
  const [floor, setFloor] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const floorItems = useMemo(() => normalizeFloorOptions(floorOptions), [floorOptions]);

  useEffect(() => {
    if (!open) {
      setFloor('');
      setFile(null);
      setDragActive(false);
    }
  }, [open]);

  const setFileFromList = useCallback((fileList) => {
    const next = fileList?.[0];
    if (!next || next.size > MAX_BYTES) return;

    const type = (next.type || '').toLowerCase();
    const mimeOk = type === '' || ACCEPT_MIME.includes(type);
    const extOk = /\.(jpe?g|png|webp|pdf)$/i.test(next.name || '');
    if (!mimeOk && !extOk) return;

    setFile(next);
  }, []);

  const canSave = Boolean(floor && file);

  const handleSave = useCallback(() => {
    if (!canSave || isSaving) return;
    onSave?.({ floor, file, annotations: [] });
  }, [canSave, file, floor, isSaving, onSave]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (!nextOpen && isSaving) return;
      onOpenChange(nextOpen);
    },
    [isSaving, onOpenChange],
  );

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[480px]'>
        <Modal.Header
          title='Add Layout'
          description='Choose a floor and upload the floor layout file.'
          icon={RiBox2Fill}
        />
        <Modal.Body className='flex flex-col gap-5 pt-2'>
          <div className='flex flex-col gap-1.5'>
            <Label.Root>
              Floor
              <Label.Asterisk className='text-red-500' />
            </Label.Root>
            <Select.Root
              value={floor}
              onValueChange={setFloor}
              disabled={isFloorsLoading || isSaving || floorItems.length === 0}
            >
              <Select.Trigger className='w-full'>
                <Select.Value placeholder={isFloorsLoading ? 'Loading floors…' : 'Select'} />
              </Select.Trigger>
              <Select.Content>
                {floorItems.map((item) => (
                  <Select.Item key={item.value} value={item.value}>
                    {item.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label.Root>
              Layout
              <Label.Asterisk className='text-red-500' />
            </Label.Root>
            <input
              ref={fileInputRef}
              type='file'
              accept={ACCEPT_ATTR}
              className='hidden'
              onChange={(e) => setFileFromList(e.target.files)}
            />
            <div
              className={cn(
                'rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-5 py-8 transition-colors',
                dragActive && 'border-primary-base/50 bg-bg-weak-50',
              )}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
                setFileFromList(e.dataTransfer.files);
              }}
            >
              <div className='flex flex-col items-center gap-3 text-center'>
                <RiUploadCloud2Line className='size-8 shrink-0 text-text-sub-500' aria-hidden />
                <div className='flex flex-col gap-1'>
                  <p className='text-paragraph-sm text-text-strong-950'>
                    Choose a file or drag & drop it here.
                  </p>
                  <p className='text-paragraph-xs text-text-sub-600'>
                    JPEG, PNG, PDF formats, up to 50 MB.
                  </p>
                </div>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                >
                  Browse File
                </Button.Root>
                {file ? (
                  <p className='text-label-sm text-text-sub-600'>
                    Selected: <span className='text-text-strong-950'>{file.name}</span>
                  </p>
                ) : null}
              </div>
            </div>
            {file && !isRasterLayoutFile(file) ? (
              <p className='text-paragraph-xs text-text-sub-600'>PDF uploads are supported.</p>
            ) : null}
          </div>
        </Modal.Body>
        <Modal.Footer className='justify-end gap-2 sm:justify-between'>
          <Modal.Close asChild>
            <Button.Root
              className='w-full'
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isSaving}
            >
              Cancel
            </Button.Root>
          </Modal.Close>
          <Button.Root
            type='button'
            className='w-full'
            variant='primary'
            mode='filled'
            size='small'
            disabled={!canSave || isSaving}
            onClick={handleSave}
          >
            {isSaving ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                Adding...
              </span>
            ) : (
              'Add'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CenterViewAddLayoutModal;
