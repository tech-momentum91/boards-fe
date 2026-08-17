// AlignUI Radio v0.0.0

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import * as Label from '@/components/ui/label';

import { cn } from '@/utils/cn';

const RadioGroup = RadioGroupPrimitive.Root;
RadioGroup.displayName = 'RadioGroup';

const RadioGroupItem = React.forwardRef(({ className, ...rest }, forwardedRef) => {
  const filterId = React.useId();

  return (
    <RadioGroupPrimitive.Item
      ref={forwardedRef}
      className={cn(
        'group/radio relative size-5 shrink-0 outline-none focus:outline-none',
        className,
      )}
      {...rest}
    >
      <svg
        width='20'
        height='20'
        viewBox='0 0 20 20'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
      >
        <circle
          cx='10'
          cy='10'
          r='8'
          className={cn(
            'fill-bg-soft-200 transition duration-200 ease-out',
            'group-hover/radio:fill-bg-sub-300',
            'group-focus/radio:fill-primary-base',
            'group-disabled/radio:fill-bg-soft-200',
            'group-data-[state=checked]/radio:fill-primary-base',
          )}
        />

        <g filter={`url(#${filterId})`}>
          <circle
            cx='10'
            cy='10'
            r='6.5'
            className={cn(
              'fill-bg-white-0',
              'group-disabled/radio:hidden',
              'group-data-[state=checked]/radio:hidden',
            )}
          />
        </g>

        <defs>
          <filter
            id={filterId}
            x='1.5'
            y='3.5'
            width='17'
            height='17'
            filterUnits='userSpaceOnUse'
            colorInterpolationFilters='sRGB'
          >
            <feFlood floodOpacity='0' result='BackgroundImageFix' />
            <feColorMatrix
              in='SourceAlpha'
              type='matrix'
              values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
              result='hardAlpha'
            />
            <feOffset dy='2' />
            <feGaussianBlur stdDeviation='1' />
            <feColorMatrix
              type='matrix'
              values='0 0 0 0 0.105882 0 0 0 0 0.109804 0 0 0 0 0.113725 0 0 0 0.12 0'
            />
            <feBlend mode='normal' in2='BackgroundImageFix' result='effect1_dropShadow_515_4243' />
            <feBlend
              mode='normal'
              in='SourceGraphic'
              in2='effect1_dropShadow_515_4243'
              result='shape'
            />
          </filter>
        </defs>
      </svg>

      <RadioGroupPrimitive.Indicator asChild>
        <svg
          width='20'
          height='20'
          viewBox='0 0 20 20'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
          className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
        >
          {/* White inner dot when selected */}
          <circle
            cx='10'
            cy='10'
            r='3'
            className={cn(
              'fill-bg-white-0 transition duration-200 ease-out',
              'group-disabled/radio:fill-bg-soft-200',
            )}
          />
        </svg>
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});

const RadioLabel = React.forwardRef(({ className, noBg = false, ...rest }, forwardedRef) => {
  // border-radius: 6px;
  // background: linear-gradient(90deg, #F6F8FA 0%, #FFF 100%);
  return (
    <Label.Root
      ref={forwardedRef}
      className={cn(
        'text-label-sm text-text-main-900',
        'flex items-center gap-2',
        'cursor-pointer',
        'px-1.5 py-1',
        noBg ? '' : 'bg-linear-to-r from-[#F6F8FA] to-white/0',
        className,
      )}
      {...rest}
    />
  );
});

RadioLabel.displayName = 'RadioLabel';
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup as Group, RadioGroupItem as Item, RadioLabel as Label };
