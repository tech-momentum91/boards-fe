import { useState } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';
import * as Switch from '@/components/ui/switch';
import { cn } from '@/utils/cn';

function CollapsibleSectionHeader({ title, action, collapsed, onToggle }) {
  return (
    <div className='flex h-3 items-center justify-between px-2'>
      <button type='button' onClick={onToggle} className='flex items-center gap-1 text-left'>
        <span className='text-[11px] font-medium uppercase leading-3 tracking-[0.22px] text-text-soft-400'>
          {title}
        </span>
        <RiArrowDownSLine
          size={16}
          className={cn('text-icon-soft-400 transition-transform', collapsed && '-rotate-90')}
        />
      </button>
      {action}
    </div>
  );
}

function ToggleFieldRow({ field, onToggle }) {
  const Icon = field.icon;

  return (
    <div className='flex items-center gap-2 rounded-lg p-1.5'>
      <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
        <Icon size={18} />
      </span>
      <span className='flex-1 text-sm font-medium leading-5 tracking-[-0.084px] text-text-sub-500'>
        {field.label}
      </span>
      <Switch.Root
        checked={Boolean(field.visible)}
        onCheckedChange={() => onToggle(field.id)}
        className='h-5 w-8'
      />
    </div>
  );
}

export default function FieldsVisibilityPanel({
  fields = [],
  onToggleField,
  onHideAll,
  showHideAll = true,
}) {
  const [shownCollapsed, setShownCollapsed] = useState(false);
  const [hiddenCollapsed, setHiddenCollapsed] = useState(false);

  const shownFields = fields.filter((field) => field.visible);
  const hiddenFields = fields.filter((field) => !field.visible);

  return (
    <div className='flex flex-col gap-5 pt-4'>
      <div className='flex flex-col gap-3 border-b border-stroke-soft-200 px-4 pb-4'>
        <CollapsibleSectionHeader
          title='Shown'
          collapsed={shownCollapsed}
          onToggle={() => setShownCollapsed((value) => !value)}
          action={
            showHideAll && shownFields.length > 0 ? (
              <button
                type='button'
                onClick={onHideAll}
                className='text-xs font-medium leading-4 text-text-sub-500 underline'
              >
                Hide All
              </button>
            ) : null
          }
        />

        {!shownCollapsed ? (
          <div className='flex flex-col gap-1'>
            {shownFields.length === 0 ? (
              <p className='px-2 py-1 text-sm text-text-soft-400'>No fields shown</p>
            ) : (
              shownFields.map((field) => (
                <ToggleFieldRow key={field.id} field={field} onToggle={onToggleField} />
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className='flex flex-col gap-3 px-4 pb-4'>
        <CollapsibleSectionHeader
          title='Hidden'
          collapsed={hiddenCollapsed}
          onToggle={() => setHiddenCollapsed((value) => !value)}
        />

        {!hiddenCollapsed ? (
          <div className='flex flex-col gap-1'>
            {hiddenFields.length === 0 ? (
              <p className='px-2 py-1 text-sm text-text-soft-400'>No hidden fields</p>
            ) : (
              hiddenFields.map((field) => (
                <ToggleFieldRow key={field.id} field={field} onToggle={onToggleField} />
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
