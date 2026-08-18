// AlignUI Input (JSX version)

import {
  useId,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import type { VariantProps } from 'tailwind-variants';
import { Slot } from '@radix-ui/react-slot';

import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv } from '@/utils/tv';
import { cn } from '@/utils/cn';

const INPUT_ROOT_NAME = 'InputRoot';
const INPUT_WRAPPER_NAME = 'InputWrapper';
const INPUT_EL_NAME = 'InputEl';
const INPUT_ICON_NAME = 'InputIcon';
const INPUT_AFFIX_NAME = 'InputAffixButton';
const INPUT_INLINE_AFFIX_NAME = 'InputInlineAffixButton';

export const inputVariants = tv({
  slots: {
    root: [
      'group relative flex w-full overflow-hidden bg-bg-white-0 text-text-strong-950 shadow-regular-xs',
      'transition duration-200 ease-out',
      'divide-x divide-stroke-soft-200',
      'before:absolute before:inset-0 before:ring-1 before:ring-inset before:ring-stroke-soft-200',
      'before:pointer-events-none before:rounded-[inherit]',
      'before:transition before:duration-200 before:ease-out',
      'hover:shadow-none',
      'has-[input:focus]:before:ring-primary-base has-[input:focus]:!shadow-button-important-focus',
      'has-[input:disabled]:shadow-none has-[input:disabled]:before:ring-transparent',
    ],
    wrapper: [
      'group/input-wrapper flex w-full cursor-text items-center bg-bg-white-0',
      'transition duration-200 ease-out',
      'hover:[&:not(&:has(input:focus))]:bg-bg-weak-50',
      'has-[input:disabled]:pointer-events-none has-[input:disabled]:bg-bg-weak-50',
    ],
    input: [
      'w-full bg-transparent bg-none text-paragraph-sm text-text-strong-950 outline-none',
      'transition duration-200 ease-out',
      'placeholder:select-none placeholder:text-text-soft-400 placeholder:transition placeholder:duration-200 placeholder:ease-out',
      'group-hover/input-wrapper:placeholder:text-[var(--color-text-soft-400)]',
      'focus:outline-none',
      // 'group-has-[input:focus]:placeholder:text-text-sub-600',
      'disabled:text-text-disabled-300 disabled:placeholder:text-text-disabled-300',
    ],
    icon: [
      'flex size-5 shrink-0 select-none items-center justify-center',
      'transition duration-200 ease-out',
      'group-has-[:placeholder-shown]:text-text-soft-400',
      'text-text-sub-600',
      'group-has-[:placeholder-shown]:group-hover/input-wrapper:text-text-sub-600',
      'group-has-[:placeholder-shown]:group-has-[input:focus]/input-wrapper:text-text-sub-600',
      'group-has-[input:disabled]/input-wrapper:text-text-disabled-300',
    ],
    affix: [
      'shrink-0 bg-bg-white-0 text-paragraph-sm text-text-sub-600',
      'flex items-center justify-center truncate',
      'transition duration-200 ease-out',
      'group-has-[:placeholder-shown]:text-text-soft-400',
      'group-has-[:placeholder-shown]:group-has-[input:focus]:text-text-sub-600',
    ],
    inlineAffix: [
      'text-paragraph-sm text-text-sub-600',
      'group-has-[:placeholder-shown]:text-text-soft-400',
      'group-has-[:placeholder-shown]:group-has-[input:focus]:text-text-sub-600',
    ],
  },
  variants: {
    variant: {
      default: {},
      borderless: {
        root: ['before:ring-transparent', 'shadow-none!'],
      },
      underline: {
        root: [
          'shadow-none bg-transparent rounded-none',
          // Base root uses overflow-hidden for the default ring; that clips the bottom
          // ::after line on some WebKit builds when inputMode='numeric' shifts metrics.
          'overflow-visible',

          'before:!content-none',
          'before:!ring-0',
          'before:!shadow-none',

          'has-[input:focus]:before:!ring-0',
          'has-[input:focus]:!shadow-none',

          'after:pointer-events-none after:z-[1]',
          'after:absolute after:left-0 after:bottom-0 after:w-full',
          'after:h-px after:min-h-px after:bg-stroke-soft-200',
          'after:transition-all after:duration-200',

          // hover
          'hover:after:bg-text-sub-600',

          // focus → single line behavior
          'has-[input:focus]:after:h-[2px]',
          'has-[input:focus]:after:bg-primary-base',

          // disabled
          'has-[input:disabled]:after:bg-stroke-soft-100',
        ],

        wrapper: ['bg-transparent hover:bg-transparent px-0!'],

        input: [
          'h-10 px-0 placeholder:opacity-70',
          // Avoid WebKit telephone/numeric UA chrome fighting underline layout
          'appearance-none',
        ],
      },
    },
    size: {
      large: {
        root: 'rounded-10',
        wrapper: 'gap-2 px-3',
        input: 'h-8 md:h-14 text-md md:text-2xl',
      },
      medium: {
        root: 'rounded-10',
        wrapper: 'gap-2 px-3',
        input: 'h-10',
      },
      small: {
        root: 'rounded-lg',
        wrapper: 'gap-2 px-2.5',
        input: 'h-9',
      },
      xsmall: {
        root: 'rounded-lg',
        wrapper: 'gap-1.5 px-2',
        input: 'h-8',
      },
    },
    hasError: {
      true: {
        root: [
          'before:ring-error-base',
          'hover:before:ring-error-base hover:[&:not(&:has(input:focus)):has(>:only-child)]:before:ring-error-base',
          'has-[input:focus]:shadow-button-error-focus has-[input:focus]:before:ring-error-base',
        ],
      },
      false: {
        root: ['hover:[&:not(:has(input:focus)):has(>:only-child)]:before:ring-transparent'],
      },
    },
  },
  compoundVariants: [
    {
      size: 'medium',
      class: { affix: 'px-3' },
    },
    {
      size: ['small', 'xsmall'],
      class: { affix: 'px-2.5' },
    },
  ],
  defaultVariants: {
    variant: 'default',
    size: 'medium',
  },
});

type InputSharedProps = VariantProps<typeof inputVariants>;

type InputRootProps = HTMLAttributes<HTMLDivElement> &
  InputSharedProps & {
    asChild?: boolean;
    noRing?: boolean;
    children?: ReactNode;
  };

function InputRoot({ className, children, variant, size, hasError, noRing, asChild, ...rest }: InputRootProps) {
  const uniqueId = useId();
  const Component = asChild ? Slot : 'div';

  const { root } = inputVariants({ variant, size, hasError });

  const sharedProps = { variant, size, hasError };

  const extendedChildren = recursiveCloneChildren(
    children,
    sharedProps,
    [INPUT_WRAPPER_NAME, INPUT_EL_NAME, INPUT_ICON_NAME, INPUT_AFFIX_NAME, INPUT_INLINE_AFFIX_NAME],
    uniqueId,
    asChild,
  );

  return (
    <Component
      className={cn(root({ class: className }), noRing && 'before:ring-transparent!')}
      {...rest}
    >
      {extendedChildren}
    </Component>
  );
}
InputRoot.displayName = INPUT_ROOT_NAME;

type InputWrapperProps = HTMLAttributes<HTMLLabelElement> &
  InputSharedProps & {
    asChild?: boolean;
    children?: ReactNode;
  };

function InputWrapper({ className, children, variant, size, hasError, asChild, ...rest }: InputWrapperProps) {
  const Component = asChild ? Slot : 'label';
  const { wrapper } = inputVariants({ variant, size, hasError });

  return (
    <Component className={wrapper({ class: className })} {...rest}>
      {children}
    </Component>
  );
}
InputWrapper.displayName = INPUT_WRAPPER_NAME;

type InputElProps = ComponentPropsWithoutRef<'input'> &
  InputSharedProps & {
    asChild?: boolean;
  };

const Input = forwardRef<HTMLInputElement, InputElProps>(
  ({ className, type = 'text', variant, size, hasError, asChild, ...rest }, forwardedRef) => {
    const Component = asChild ? Slot : 'input';
    const { input } = inputVariants({ variant, size, hasError });

    return (
      <Component type={type} className={input({ class: className })} ref={forwardedRef} {...rest} />
    );
  },
);
Input.displayName = INPUT_EL_NAME;

type InputIconProps = InputSharedProps &
  HTMLAttributes<HTMLElement> & {
    as?: ElementType;
  };

function InputIcon({ variant, size, hasError, as, className, ...rest }: InputIconProps) {
  const Component = as || 'div';
  const { icon } = inputVariants({ variant, size, hasError });

  return <Component className={icon({ class: className })} {...rest} />;
}
InputIcon.displayName = INPUT_ICON_NAME;

type InputAffixProps = HTMLAttributes<HTMLDivElement> & InputSharedProps;

function InputAffix({ className, children, variant, size, hasError, ...rest }: InputAffixProps) {
  const { affix } = inputVariants({ variant, size, hasError });

  return (
    <div className={affix({ class: className })} {...rest}>
      {children}
    </div>
  );
}
InputAffix.displayName = INPUT_AFFIX_NAME;

type InputInlineAffixProps = HTMLAttributes<HTMLSpanElement> & InputSharedProps;

function InputInlineAffix({ className, children, variant, size, hasError, ...rest }: InputInlineAffixProps) {
  const { inlineAffix } = inputVariants({ variant, size, hasError });

  return (
    <span className={inlineAffix({ class: className })} {...rest}>
      {children}
    </span>
  );
}
InputInlineAffix.displayName = INPUT_INLINE_AFFIX_NAME;

export {
  InputRoot as Root,
  InputWrapper as Wrapper,
  Input,
  InputIcon as Icon,
  InputAffix as Affix,
  InputInlineAffix as InlineAffix,
};
