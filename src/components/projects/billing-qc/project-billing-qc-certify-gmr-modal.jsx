import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Modal from '@/components/ui/modal';

const CERTIFY_SECTIONS = [
  { id: 'purchase', label: 'Purchase' },
  { id: 'execution', label: 'Execution' },
  { id: 'vendor', label: 'Vendor' },
];

const DottedDivider = () => (
  <div
    role='presentation'
    aria-hidden
    className='h-px min-w-0 flex-1 self-center'
    style={{
      backgroundImage:
        'repeating-linear-gradient(to right, var(--color-stroke-soft-200) 0, var(--color-stroke-soft-200) 3px, transparent 3px, transparent 6px)',
    }}
  />
);

const emptySectionState = () => ({
  photoUrl: null,
  photoFile: null,
  signatureDataUrl: null,
});

/** Keep site-relative Frappe paths so private files load via same-origin cookies/proxy. */
function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/files/') ||
    trimmed.startsWith('/private/files/')
  ) {
    return trimmed;
  }
  return trimmed;
}

function buildSectionStateFromCertification(certification) {
  return Object.fromEntries(
    CERTIFY_SECTIONS.map((section) => {
      const media = certification?.[section.id] ?? {};
      return [
        section.id,
        {
          photoUrl: resolveMediaUrl(media.photo),
          photoFile: null,
          signatureDataUrl: resolveMediaUrl(media.signature),
        },
      ];
    }),
  );
}

function SectionHeader({ label, expanded, onToggle }) {
  return (
    <div className='flex h-[30px] w-full items-center gap-3'>
      <button
        type='button'
        onClick={onToggle}
        className='inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-primary-lighter p-1.5 text-label-xs font-medium text-primary-base'
      >
        <span className='px-1'>{label}</span>
        {expanded ? (
          <RiArrowDownSLine className='size-5 shrink-0' aria-hidden />
        ) : (
          <RiArrowRightSLine className='size-5 shrink-0' aria-hidden />
        )}
      </button>
      <DottedDivider />
    </div>
  );
}

function SignatureCanvas({ value, onChange }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const hasInkRef = useRef(Boolean(value));
  const [hasInk, setHasInk] = useState(Boolean(value));

  const applyCanvasSize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return null;

    const { width, height } = container.getBoundingClientRect();
    if (width <= 0 || height <= 0) return null;

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return { context, width, height };
  }, []);

  const restoreSignature = useCallback(
    (signatureDataUrl) => {
      const sizing = applyCanvasSize();
      if (!sizing) return;

      const { context, width, height } = sizing;
      context.clearRect(0, 0, width, height);

      if (!signatureDataUrl) return;

      const image = new Image();
      image.addEventListener('load', () => {
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
      });
      image.src = signatureDataUrl;
    },
    [applyCanvasSize],
  );

  useEffect(() => {
    restoreSignature(value);

    const container = containerRef.current;
    if (!container) return undefined;

    const resizeObserver = new ResizeObserver(() => {
      if (isDrawingRef.current) return;
      restoreSignature(value);
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [restoreSignature, value]);

  useEffect(() => {
    const hasSignature = Boolean(value);
    hasInkRef.current = hasSignature;
    setHasInk(hasSignature);
  }, [value]);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const configureStroke = (context) => {
    context.strokeStyle = '#0a0d14';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
  };

  const markHasInk = () => {
    if (hasInkRef.current) return;
    hasInkRef.current = true;
    setHasInk(true);
  };

  const startDrawing = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    isDrawingRef.current = true;
    markHasInk();
    configureStroke(context);
    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const draw = (event) => {
    if (!isDrawingRef.current) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    markHasInk();
    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas || !hasInkRef.current) return;
    onChange?.(canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    const sizing = applyCanvasSize();
    if (!sizing) return;

    const { context, width, height } = sizing;
    context.clearRect(0, 0, width, height);
    hasInkRef.current = false;
    setHasInk(false);
    onChange?.(null);
  };

  return (
    <div ref={containerRef} className='relative min-h-[156px] min-w-0 flex-1 self-stretch'>
      <canvas
        ref={canvasRef}
        className='absolute inset-0 size-full cursor-crosshair touch-none'
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {!hasInk ? (
        <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3'>
          <p className='whitespace-nowrap text-[40px] font-medium leading-[48px] tracking-[-0.4px] text-text-main-900 opacity-10'>
            Sign Here
          </p>
          <div className='h-px w-full max-w-[331px] bg-text-main-900 opacity-10' aria-hidden />
        </div>
      ) : null}

      {hasInk ? (
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='xxsmall'
          className='absolute right-0 top-0 z-10 bg-bg-white-0 shadow-regular-xs'
          onClick={handleClear}
        >
          Clear
        </Button.Root>
      ) : null}
    </div>
  );
}

function CertifySectionPanel({ section, data, onPhotoChange, onSignatureChange }) {
  const fileInputRef = useRef(null);

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      onPhotoChange({
        photoFile: file,
        photoUrl: typeof reader.result === 'string' ? reader.result : null,
      });
    });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRemovePhoto = () => {
    onPhotoChange({ photoFile: null, photoUrl: null });
  };

  return (
    <div className='flex w-full items-start gap-2 overflow-hidden rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-6 shadow-regular-xs'>
      <div className='relative h-[156px] w-[156px] shrink-0 overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-weak-100'>
        {data.photoUrl ? (
          <>
            <img src={data.photoUrl} alt='' className='size-full object-cover' />
            <CompactButton.Root
              type='button'
              variant='stroke'
              size='medium'
              className='absolute right-2 top-2 bg-bg-white-0 shadow-regular-xs'
              aria-label='Remove photo'
              onClick={handleRemovePhoto}
            >
              <CompactButton.Icon as={RiCloseLine} />
            </CompactButton.Root>
          </>
        ) : (
          <button
            type='button'
            className='flex size-full flex-col items-center justify-center gap-2 px-3 text-center'
            onClick={() => fileInputRef.current?.click()}
          >
            <RiUploadCloud2Line className='size-6 text-text-sub-500' aria-hidden />
            <span className='text-label-sm font-medium text-text-main-900'>Upload Photo</span>
            <span className='text-label-sm font-medium text-text-sub-500 underline'>
              Browse File
            </span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          className='hidden'
          onChange={handlePhotoSelect}
        />
      </div>

      <SignatureCanvas value={data.signatureDataUrl} onChange={onSignatureChange} />
    </div>
  );
}

export default function ProjectBillingQcCertifyGmrModal({
  open,
  onOpenChange,
  onCertify,
  certification = null,
}) {
  const [expandedSectionId, setExpandedSectionId] = useState('purchase');
  const [sectionState, setSectionState] = useState(() =>
    Object.fromEntries(CERTIFY_SECTIONS.map((section) => [section.id, emptySectionState()])),
  );

  useEffect(() => {
    if (!open) return;
    setExpandedSectionId('purchase');
    setSectionState(buildSectionStateFromCertification(certification));
  }, [open, certification]);

  const updateSection = useCallback((sectionId, patch) => {
    setSectionState((previous) => ({
      ...previous,
      [sectionId]: { ...previous[sectionId], ...patch },
    }));
  }, []);

  const handleCertify = () => {
    onCertify?.(sectionState);
    onOpenChange?.(false);
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[640px]' showClose>
        <Modal.Header>
          <Modal.Title>Certify GMR</Modal.Title>
        </Modal.Header>

        <Modal.Body className='flex flex-col gap-6 px-6 pb-6 pt-4'>
          {CERTIFY_SECTIONS.map((section) => {
            const isExpanded = expandedSectionId === section.id;
            const data = sectionState[section.id] ?? emptySectionState();

            return (
              <div key={section.id} className='flex flex-col gap-3'>
                <SectionHeader
                  label={section.label}
                  expanded={isExpanded}
                  onToggle={() => setExpandedSectionId(isExpanded ? null : section.id)}
                />

                {isExpanded ? (
                  <CertifySectionPanel
                    section={section.id}
                    data={data}
                    onPhotoChange={(patch) => updateSection(section.id, patch)}
                    onSignatureChange={(signatureDataUrl) =>
                      updateSection(section.id, { signatureDataUrl })
                    }
                  />
                ) : null}
              </div>
            );
          })}
        </Modal.Body>

        <Modal.Footer className='flex justify-end gap-3 border-t border-stroke-soft-200 px-6 py-4'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            onClick={handleCertify}
          >
            Certify GMR
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
