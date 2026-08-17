// AlignUI Textarea v0.0.0

import * as React from 'react';

import { cn } from '@/utils/cn';
import { tv } from '@/utils/tv';

export const textareaVariants = tv({
  slots: {
    textarea: [],
    textareaSimple: [],
    footer: [],
    container: [],
  },

  variants: {
    size: {
      large: {},
      medium: {},
      small: {},
      xsmall: {},
    },
    variant: {
      default: {},
      borderless: {},
      underline: {},
    },
  },

  compoundVariants: [
    {
      size: 'large',
      variant: 'default',
      class: {
        textarea: 'px-3 !text-lg md:!text-2xl',
        textareaSimple: 'px-3 py-2.5 !text-lg md:!text-2xl',
        footer: 'gap-1.5 px-3',
        container: 'pt-2.5 pb-2.5',
      },
    },
    {
      size: 'medium',
      variant: 'default',
      class: {
        textarea: 'px-3',
        textareaSimple: 'px-3 py-2.5',
        footer: 'gap-1.5 px-3',
        container: 'pt-2.5 pb-2.5',
      },
    },
    {
      size: 'small',
      variant: 'default',
      class: {
        textarea: 'px-2.5',
        textareaSimple: 'px-2.5 py-2.5',
        footer: 'gap-1.5 px-2.5',
        container: 'pt-2.5 pb-2.5',
      },
    },
    {
      size: 'xsmall',
      variant: 'default',
      class: {
        textarea: 'px-2',
        textareaSimple: 'px-2 py-2',
        footer: 'gap-1 px-2',
        container: 'pt-2 pb-2',
      },
    },
    {
      size: 'large',
      variant: 'borderless',
      class: {
        textarea: 'px-3 !text-lg md:!text-2xl',
        textareaSimple: 'px-3 py-2.5 !text-lg md:!text-2xl',
        footer: 'gap-1.5 px-3',
        container: 'pt-2.5 pb-2.5',
      },
    },
    {
      size: 'medium',
      variant: 'borderless',
      class: {
        textarea: 'px-3',
        textareaSimple: 'px-3 py-2.5',
        footer: 'gap-1.5 px-3',
        container: 'pt-2.5 pb-2.5',
      },
    },
    {
      size: 'small',
      variant: 'borderless',
      class: {
        textarea: 'px-2.5',
        textareaSimple: 'px-2.5 py-2.5',
        footer: 'gap-1.5 px-2.5',
        container: 'pt-2.5 pb-2.5',
      },
    },
    {
      size: 'xsmall',
      variant: 'borderless',
      class: {
        textarea: 'px-2',
        textareaSimple: 'px-2 py-1.5',
        footer: 'gap-1 px-2',
        container: 'pt-2 pb-2',
      },
    },
    {
      size: 'large',
      variant: 'underline',
      class: {
        textarea: 'px-0 !text-lg md:!text-2xl',
        textareaSimple: 'px-0 py-2.5 !text-lg md:!text-2xl',
        footer: 'gap-1.5 px-0',
        container: 'pt-2.5 pb-2.5',
      },
    },
    {
      size: 'medium',
      variant: 'underline',
      class: {
        textarea: 'px-0',
        textareaSimple: 'px-0 py-2.5',
        footer: 'gap-1.5 px-0',
        container: 'pt-2.5 pb-2.5',
      },
    },
    {
      size: 'small',
      variant: 'underline',
      class: {
        textarea: 'px-0',
        textareaSimple: 'px-0 py-2.5',
        footer: 'gap-1.5 px-0',
        container: 'pt-2.5 pb-2.5',
      },
    },
    {
      size: 'xsmall',
      variant: 'underline',
      class: {
        textarea: 'px-0',
        textareaSimple: 'px-0 py-1.5',
        footer: 'gap-1 px-0',
        container: 'pt-2 pb-2',
      },
    },
  ],

  defaultVariants: {
    variant: 'default',
    size: 'medium',
  },
});

const TextareaContext = React.createContext({
  size: 'medium',
  variant: 'default',
  hasError: false,
});

const useTextareaContext = () => React.useContext(TextareaContext);

const TEXTAREA_ROOT_NAME = 'TextareaRoot';
const TEXTAREA_NAME = 'Textarea';
const TEXTAREA_RESIZE_HANDLE_NAME = 'TextareaResizeHandle';
const TEXTAREA_COUNTER_NAME = 'TextareaCounter';

const Textarea = React.forwardRef(
  ({ className, hasError, simple, disabled, variant = 'default', size, ...rest }, forwardedRef) => {
    const context = useTextareaContext();
    const { size: sizeFromContext = 'medium' } = context;
    const finalSize = size ?? sizeFromContext;
    const isBorderless = variant === 'borderless';
    const isUnderline = variant === 'underline';
    const finalVariant = variant === 'default' ? context.variant || 'default' : variant;
    const { textarea: textareaSlot, textareaSimple: textareaSimpleSlot } = textareaVariants({
      size: finalSize,
      variant: finalVariant,
    });

    return (
      <textarea
        className={cn(
          [
            // base
            'block w-full resize-none text-paragraph-sm text-text-strong-950 outline-none',
            !simple && [
              //   'pointer-events-auto h-full min-h-[82px] bg-transparent pl-3 pr-2.5 pt-2.5'
              'pointer-events-auto h-full bg-transparent',
              textareaSlot(),
            ],
            simple && [
              //   'min-h-28 rounded-xl bg-bg-white-0 px-3 py-2.5 shadow-regular-xs',
              'rounded-xl bg-bg-white-0 shadow-regular-xs',
              textareaSimpleSlot(),
              'ring-1 ring-inset ring-stroke-soft-200',
              'transition duration-200 ease-out',
              isBorderless && ['ring-transparent shadow-none!'],
              isUnderline && ['rounded-none bg-transparent shadow-none ring-transparent px-0!'],
              // hover
              'hover:not-focus:bg-bg-weak-50',
              isUnderline && ['hover:not-focus:bg-transparent'],
              !hasError && [
                // hover
                'hover:not-focus:ring-transparent',
                // focus
                'focus:shadow-button-important-focus focus:ring-primary-base',
              ],
              hasError && [
                // base
                'ring-error-base',
                // focus
                'focus:shadow-button-error-focus focus:ring-error-base',
              ],
              disabled && ['bg-bg-weak-50 ring-transparent'],
            ],
            !disabled && [
              // placeholder
              'placeholder:select-none placeholder:text-text-soft-400 placeholder:transition placeholder:duration-200 placeholder:ease-out placeholder:opacity-70 placeholder:font-medium',
              // hover placeholder
              'group-hover/textarea:placeholder:text-text-sub-600',
              // focus
              'focus:outline-none',
              // focus placeholder
              'focus:placeholder:text-text-sub-600',
            ],
            disabled && [
              // disabled
              'text-text-disabled-300 placeholder:text-text-disabled-300',
            ],
          ],
          className,
        )}
        ref={forwardedRef}
        disabled={disabled}
        {...rest}
      />
    );
  },
);
Textarea.displayName = TEXTAREA_NAME;

function ResizeHandle() {
  return (
    <div className='pointer-events-none size-3 cursor-s-resize'>
      <svg
        width='12'
        height='12'
        viewBox='0 0 12 12'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path d='M9.11111 2L2 9.11111M10 6.44444L6.44444 10' className='stroke-text-soft-400' />
      </svg>
    </div>
  );
}
ResizeHandle.displayName = TEXTAREA_RESIZE_HANDLE_NAME;

const TextareaRoot = React.forwardRef(
  (
    {
      containerClassName,
      children,
      hasError,
      simple,
      variant = 'default',
      size = 'medium',
      ...rest
    },
    forwardedRef,
  ) => {
    const isBorderless = variant === 'borderless';
    const isUnderline = variant === 'underline';
    const { footer: footerSlot } = textareaVariants({ size, variant });

    if (simple) {
      return (
        <TextareaContext.Provider value={{ size, variant, hasError }}>
          <Textarea ref={forwardedRef} simple hasError={hasError} variant={variant} {...rest} />
        </TextareaContext.Provider>
      );
    }

    const { container: containerSlot } = textareaVariants({ size, variant });

    return (
      <TextareaContext.Provider value={{ size, variant, hasError }}>
        <div
          className={cn(
            [
              // base
              'group/textarea relative flex w-full flex-col rounded-xl bg-bg-white-0 shadow-regular-xs',
              'ring-1 ring-inset ring-stroke-soft-200',
              'transition duration-200 ease-out',
              containerSlot(),
              isBorderless && ['ring-transparent shadow-none!'],
              isUnderline && [
                'rounded-none bg-transparent shadow-none ring-transparent',
                'after:absolute after:left-0 after:bottom-0 after:w-full',
                'after:h-px after:bg-stroke-soft-200 after:transition-all after:duration-200',
              ],
              // hover
              'hover:not-focus-within:bg-bg-weak-50',
              isUnderline && ['hover:not-focus-within:bg-transparent'],
              isUnderline && ['hover:after:bg-text-sub-600'],
              // disabled
              'has-[[disabled]]:pointer-events-none has-[[disabled]]:bg-bg-weak-50 has-[[disabled]]:ring-transparent',
              isUnderline && [
                'has-[[disabled]]:bg-transparent has-[[disabled]]:after:bg-stroke-soft-100',
              ],
            ],
            !hasError && [
              // hover
              'hover:not-focus-within:ring-transparent',
              // focus
              'focus-within:shadow-button-important-focus focus-within:ring-primary-base',
              isUnderline && ['focus-within:shadow-none focus-within:ring-transparent'],
              isUnderline && ['focus-within:after:h-[2px] focus-within:after:bg-primary-base'],
            ],
            hasError && [
              // base
              'ring-error-base',
              // focus
              'focus-within:shadow-button-error-focus focus-within:ring-error-base',
              isUnderline && [
                'ring-transparent focus-within:shadow-none focus-within:ring-transparent',
              ],
              isUnderline && [
                'after:bg-error-base focus-within:after:h-[2px] focus-within:after:bg-error-base',
              ],
            ],
            containerClassName,
          )}
        >
          <div className='grid'>
            <div className='pointer-events-none relative z-10 flex flex-col gap-2 [grid-area:1/1]'>
              <Textarea ref={forwardedRef} hasError={hasError} variant={variant} {...rest} />
              <div
                className={cn('pointer-events-none flex items-center justify-end', footerSlot())}
              >
                {children}
                <ResizeHandle />
              </div>
            </div>
            <div className='min-h-full resize-y overflow-hidden opacity-0 [grid-area:1/1]' />
          </div>
        </div>
      </TextareaContext.Provider>
    );
  },
);
TextareaRoot.displayName = TEXTAREA_ROOT_NAME;

function CharCounter({ current, max, className }) {
  if (current === undefined || max === undefined) return null;

  const isError = current > max;

  return (
    <span
      className={cn(
        'text-subheading-2xs text-text-soft-400',
        // disabled
        'group-has-[[disabled]]/textarea:text-text-disabled-300',
        {
          'text-error-base': isError,
        },
        className,
      )}
    >
      {current}/{max}
    </span>
  );
}
CharCounter.displayName = TEXTAREA_COUNTER_NAME;

export { TextareaRoot as Root, CharCounter };
