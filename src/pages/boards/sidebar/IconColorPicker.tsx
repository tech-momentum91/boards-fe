import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RiAddLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { computeAnchoredSubmenuPosition } from '../hooks/useAnchoredMenuPosition';
import {
  BOARD_ICON_COLORS,
  colorsMatch,
  getContrastAgainstWhite,
  hexToHsv,
  hsvToHex,
  isValidHexColor,
  normalizeBoardColor,
} from '../components/board-color-utils';

export {
  BOARD_ICON_COLORS,
  normalizeBoardColor,
  colorsMatch,
} from '../components/board-color-utils';

function ColorSwatch({ color, isSelected, onClick, disabled }) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={`Select color ${color}`}
      aria-pressed={isSelected}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className={cn(
        'shrink-0 rounded-full disabled:opacity-60',
        isSelected ? 'border-[1.5px] p-1' : 'border border-stroke-white-0 bg-bg-white-0 p-[3px]',
      )}
      style={isSelected ? { borderColor: color } : undefined}
    >
      <span
        className={cn(
          'block rounded-full shadow-regular-md',
          isSelected ? 'size-[18px]' : 'size-5',
        )}
        style={{ backgroundColor: color }}
      />
    </button>
  );
}

function CustomColorPanel({ initialColor, anchorRect, onSave, onClose }) {
  const panelRef = useRef(null);
  const svRef = useRef(null);
  const hueRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const seed = normalizeBoardColor(initialColor) || BOARD_ICON_COLORS[0];
  const [hsv, setHsv] = useState(() => hexToHsv(seed));
  const [hexInput, setHexInput] = useState(() => seed.toUpperCase());
  const draftHex = hsvToHex(hsv.h, hsv.s, hsv.v);
  const contrast = getContrastAgainstWhite(draftHex);

  useLayoutEffect(() => {
    const updatePosition = () => {
      if (!anchorRect) {
        return;
      }

      const width = panelRef.current?.offsetWidth ?? 260;
      const height = panelRef.current?.offsetHeight ?? 320;
      let left = anchorRect.right + 8;
      let top = anchorRect.top;

      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, anchorRect.left - width - 8);
      }
      if (top + height > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - height - 8);
      }

      setPosition({ top, left });
    };

    updatePosition();
    requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRect]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) {
        return;
      }
      onClose?.();
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [onClose]);

  const applyHex = (raw) => {
    const trimmed = String(raw ?? '');
    setHexInput(trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed}`.toUpperCase());
    const normalized = normalizeBoardColor(trimmed);
    if (!isValidHexColor(normalized)) {
      return;
    }
    setHsv(hexToHsv(normalized));
    setHexInput(normalized.toUpperCase());
  };

  const updateFromSvPointer = (clientX, clientY) => {
    const rect = svRef.current?.getBoundingClientRect();
    if (!rect) return;
    const s = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const v = 1 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    setHsv((previous) => {
      const next = { ...previous, s, v };
      setHexInput(hsvToHex(next.h, next.s, next.v).toUpperCase());
      return next;
    });
  };

  const updateFromHuePointer = (clientX) => {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;
    const h = Math.min(359, Math.max(0, ((clientX - rect.left) / rect.width) * 360));
    setHsv((previous) => {
      const next = { ...previous, h };
      setHexInput(hsvToHex(next.h, next.s, next.v).toUpperCase());
      return next;
    });
  };

  const hueColor = hsvToHex(hsv.h, 1, 1);

  return createPortal(
    <div
      ref={panelRef}
      data-board-color-picker=''
      data-status-color-picker=''
      className='fixed z-[320] w-[260px] rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-3 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      style={{ top: position.top, left: position.left, pointerEvents: 'auto' }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className='mb-3 flex items-center gap-2'>
        <span
          className='size-6 shrink-0 rounded-full shadow-regular-md ring-1 ring-stroke-soft-200'
          style={{ backgroundColor: draftHex }}
        />
        <span className='text-sm font-medium tabular-nums text-text-main-900'>
          {draftHex.toUpperCase()}
        </span>
        <span className='text-xs text-text-soft-400'>· {contrast.label}</span>
      </div>

      <div
        ref={svRef}
        className='relative mb-3 h-[140px] w-full cursor-crosshair overflow-hidden rounded-xl'
        style={{
          backgroundColor: hueColor,
          backgroundImage:
            'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          updateFromSvPointer(event.clientX, event.clientY);
          const onMove = (moveEvent) => updateFromSvPointer(moveEvent.clientX, moveEvent.clientY);
          const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      >
        <span
          className='pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md'
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: draftHex,
          }}
        />
      </div>

      <div
        ref={hueRef}
        className='relative mb-3 h-3 w-full cursor-pointer rounded-full'
        style={{
          background:
            'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          updateFromHuePointer(event.clientX);
          const onMove = (moveEvent) => updateFromHuePointer(moveEvent.clientX);
          const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      >
        <span
          className='pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md'
          style={{
            left: `${(hsv.h / 360) * 100}%`,
            backgroundColor: hueColor,
          }}
        />
      </div>

      <div className='mb-3 flex items-center gap-2'>
        <span className='rounded-md bg-bg-weak-50 px-2 py-1.5 text-xs font-medium text-text-sub-500'>
          HEX
        </span>
        <input
          type='text'
          value={hexInput}
          onChange={(event) => applyHex(event.target.value)}
          onBlur={() => {
            if (isValidHexColor(hexInput)) {
              setHexInput(normalizeBoardColor(hexInput).toUpperCase());
            } else {
              setHexInput(draftHex.toUpperCase());
            }
          }}
          className='h-8 min-w-0 flex-1 rounded-md border border-stroke-soft-200 bg-bg-white-0 px-2 text-sm tabular-nums text-text-main-900 outline-none focus:border-primary-base'
          spellCheck={false}
        />
      </div>

      <Button.Root
        type='button'
        variant='primary'
        mode='filled'
        size='small'
        className='w-full'
        onClick={() => {
          const color = isValidHexColor(hexInput) ? normalizeBoardColor(hexInput) : draftHex;
          onSave?.(color);
        }}
      >
        Save
      </Button.Root>
    </div>,
    document.body,
  );
}

/**
 * Inline ClickUp-style color picker body (preset grid + custom "+").
 * Use inside Popovers or wrap with IconColorPicker for anchored menus.
 */
export function BoardColorPickerContent({
  selectedColor,
  onSelect,
  onClose,
  isSubmitting = false,
  className,
}) {
  const addButtonRef = useRef(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customAnchorRect, setCustomAnchorRect] = useState(null);
  const normalizedSelected = normalizeBoardColor(selectedColor);

  return (
    <>
      <div
        data-board-color-picker=''
        data-status-color-picker=''
        className={cn('w-[200px] p-2.5', className)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className='mb-2 px-0.5 text-[11px] font-medium text-text-soft-400'>Color</div>
        <div className='flex flex-wrap gap-1.5'>
          {BOARD_ICON_COLORS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              isSelected={
                normalizedSelected
                  ? colorsMatch(normalizedSelected, color)
                  : colorsMatch(color, BOARD_ICON_COLORS[0])
              }
              disabled={isSubmitting}
              onClick={() => {
                onSelect?.(color);
                onClose?.();
              }}
            />
          ))}

          <button
            ref={addButtonRef}
            type='button'
            disabled={isSubmitting}
            aria-label='Custom color'
            aria-expanded={customOpen}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const rect = addButtonRef.current?.getBoundingClientRect();
              if (rect) {
                setCustomAnchorRect({
                  top: rect.top,
                  left: rect.left,
                  right: rect.right,
                  bottom: rect.bottom,
                  width: rect.width,
                  height: rect.height,
                });
              }
              setCustomOpen(true);
            }}
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full border border-primary-base bg-bg-white-0 text-primary-base',
              'shadow-regular-xs transition hover:bg-primary-alpha-10 disabled:opacity-60',
              customOpen && 'bg-primary-alpha-10',
            )}
          >
            <RiAddLine size={16} />
          </button>
        </div>
      </div>

      {customOpen ? (
        <CustomColorPanel
          initialColor={normalizedSelected || BOARD_ICON_COLORS[0]}
          anchorRect={customAnchorRect}
          onClose={() => setCustomOpen(false)}
          onSave={(color) => {
            onSelect?.(color);
            setCustomOpen(false);
            onClose?.();
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Shared boards color picker (ClickUp-style):
 * preset swatches + "+" custom HSV/HEX picker with Save.
 */
export default function IconColorPicker({
  anchorRef,
  menuRef,
  panelRef = null,
  panelHoverHandlers = {},
  selectedColor,
  onSelect,
  onClose,
  isSubmitting = false,
}) {
  const pickerRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const updatePosition = () => {
      const anchorRect = anchorRef?.current?.getBoundingClientRect();
      const menuRect = menuRef?.current?.getBoundingClientRect();
      setPosition(computeAnchoredSubmenuPosition(anchorRect, pickerRef.current, menuRect));
    };

    updatePosition();
    requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, menuRef]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        event.target?.closest?.('[data-board-color-picker]') ||
        pickerRef.current?.contains(event.target) ||
        anchorRef?.current?.contains(event.target) ||
        menuRef?.current?.contains(event.target)
      ) {
        return;
      }

      onClose?.();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [anchorRef, menuRef, onClose]);

  return (
    <div
      ref={(node) => {
        pickerRef.current = node;
        if (panelRef) {
          panelRef.current = node;
        }
      }}
      {...panelHoverHandlers}
      data-board-color-picker=''
      data-status-color-picker=''
      className='fixed z-[60] rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      style={{
        top: position.top,
        left: position.left,
        pointerEvents: 'auto',
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <BoardColorPickerContent
        selectedColor={selectedColor}
        onSelect={onSelect}
        onClose={onClose}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
