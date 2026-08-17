import { Info, Lock, ShieldCheck } from 'lucide-react';
import * as Select from '@/components/ui/select';
import * as Switch from '@/components/ui/switch';
import { cn } from '@/utils/cn';
import { BOARD_PERMISSION_LEVELS } from '../constants/board-share-constants';

export const boardSettingRowClassName =
  'flex items-center gap-2 rounded-[10px] border border-stroke-soft-200 bg-[rgba(246,248,250,0.6)] py-2 pl-3 pr-2 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]';

const permissionSelectTriggerClassName =
  'h-8 w-auto min-w-[104px] shrink-0 gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1.5 text-sm font-normal text-text-sub-600 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] ring-0 hover:bg-bg-white-0 hover:ring-0 focus:shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] focus:ring-1 focus:ring-stroke-soft-200 data-[state=open]:shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] data-[state=open]:before:ring-0 data-[state=open]:ring-1 data-[state=open]:ring-stroke-soft-200';

function SettingRowLabel({ icon: Icon, label }) {
  return (
    <div className='flex min-w-0 flex-1 items-center gap-2'>
      <Icon size={20} className='shrink-0 text-icon-sub-500' strokeWidth={1.75} />
      <div className='flex min-w-0 items-center gap-1'>
        <span className='truncate text-sm font-semibold leading-5 text-text-sub-600'>{label}</span>
        <Info size={16} className='shrink-0 text-icon-soft-400' strokeWidth={1.75} />
      </div>
    </div>
  );
}

export function BoardDefaultPermissionRow({ value, onChange, disabled = false, className }) {
  return (
    <div className={cn(boardSettingRowClassName, className)}>
      <SettingRowLabel icon={ShieldCheck} label='Default Permission' />

      <Select.Root
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        size='xsmall'
        variant='compact'
        matchTriggerWidth={false}
      >
        <Select.Trigger className={permissionSelectTriggerClassName} ringLess>
          <Select.Value placeholder='Full Edit' />
        </Select.Trigger>
        <Select.Content align='end' sideOffset={4} className='z-[100] min-w-[160px]'>
          {BOARD_PERMISSION_LEVELS.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              <span className='whitespace-nowrap'>{option.label}</span>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
}

export function BoardMakePrivateRow({ checked, onCheckedChange, disabled = false, className }) {
  return (
    <div className={cn(boardSettingRowClassName, 'h-12', className)}>
      <SettingRowLabel icon={Lock} label='Make Private' />
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className='shrink-0'
      />
    </div>
  );
}
