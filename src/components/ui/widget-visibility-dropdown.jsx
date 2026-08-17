import React from 'react';
import { RiLayout4Line } from 'react-icons/ri';
import * as Dropdown from '@/components/ui/dropdown';
import * as Button from '@/components/ui/button';
import * as Switch from '@/components/ui/switch';
import * as Tooltip from '@/components/ui/tooltip';
import * as LinkButton from '@/components/ui/link-button';

const WIDGET_LABELS = {
  stats: 'Stats',
};

const WidgetVisibilityDropdown = ({
  open,
  onOpenChange,
  widgetVisibility,
  onToggleWidget,
  onHideAll,
  tooltipContent,
  size = 'small',
}) => {
  const visibleWidgets = Object.entries(widgetVisibility).filter(([_, visible]) => visible);
  const hasVisibleWidgets = visibleWidgets.length > 0;

  const trigger = (
    <Button.Root
      variant='neutral'
      mode='stroke'
      size={size}
      className='gap-1'
      aria-label='Widget visibility settings'
    >
      <Button.Icon>
        <RiLayout4Line size={20} />
      </Button.Icon>
    </Button.Root>
  );

  return (
    <Dropdown.Root open={open} onOpenChange={onOpenChange}>
      {tooltipContent ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content>{tooltipContent}</Tooltip.Content>
        </Tooltip.Root>
      ) : (
        <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      )}

      <Dropdown.Content
        align='end'
        collisionPadding={8}
        avoidCollisions={true}
        className='w-[218px] p-0 gap-0'
      >
        {/* Header */}
        <div className='flex items-center justify-between px-4 pt-3 pb-1'>
          <p className='text-subheading-2xs text-text-soft-400 uppercase tracking-[0.22px]'>
            Shown Widgets
          </p>
          {hasVisibleWidgets && (
            <LinkButton.Root
              type='button'
              variant='primary'
              size='small'
              onClick={onHideAll}
              className='text-label-xs text-right'
            >
              Hide All
            </LinkButton.Root>
          )}
        </div>

        {/* Widget List */}
        <div className='flex flex-col pb-2 pt-0 px-2'>
          {Object.entries(widgetVisibility).map(([widgetKey, isVisible]) => (
            <Dropdown.Item
              key={widgetKey}
              onClick={(e) => e.preventDefault()}
              onSelect={(e) => e.preventDefault()}
            >
              <div className='flex items-center gap-2 w-full'>
                <div className='flex-1'>
                  <span className='text-paragraph-sm text-text-main-900'>
                    {WIDGET_LABELS[widgetKey] || widgetKey}
                  </span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch.Root
                    checked={isVisible}
                    onCheckedChange={() => onToggleWidget(widgetKey)}
                    className='h-5 w-8 shrink-0'
                  />
                </div>
              </div>
            </Dropdown.Item>
          ))}
        </div>
      </Dropdown.Content>
    </Dropdown.Root>
  );
};

export default WidgetVisibilityDropdown;
