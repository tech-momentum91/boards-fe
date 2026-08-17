import React from 'react';
import { useSelector } from 'react-redux';
import { RiEyeOffLine, RiPriceTag3Line, RiSettings3Line } from 'react-icons/ri';
import ActionPopover from '@/components/ui/action-popover';
import StatusConfigurationEditor from '@/components/customize-status/status-configuration-editor';
import { cn } from '@/utils/cn';
import { isSuperAdminRole } from '@/utils/user-role-utils';

export { StatusFieldEditor } from '@/components/customize-status/status-configuration-editor';

export function StatusColumnPopover({
  columnId = 'status',
  columnConfigHook,
  onOpenStatuses,
  enableCalculate = false,
  onCalculate,
  className,
}) {
  const [open, setOpen] = React.useState(false);
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canManageStatuses = isSuperAdminRole(userSideBarPerm);

  // Status gear (Set Statuses / column actions) is Super Admin only.
  if (!canManageStatuses) return null;

  const items = [
    {
      key: 'set-statuses',
      label: 'Set Statuses',
      icon: RiPriceTag3Line,
      onSelect: () => onOpenStatuses?.(),
    },
    {
      key: 'hide-col',
      label: 'Hide Column',
      icon: RiEyeOffLine,
      onSelect: () => columnConfigHook?.toggleColumnVisibility?.(columnId),
    },
    ...(enableCalculate
      ? [
          {
            key: 'calculate',
            label: 'Calculate',
            icon: RiSettings3Line,
            onSelect: () => onCalculate?.(),
          },
        ]
      : []),
  ];

  return (
    <span
      className={cn(
        'inline-flex shrink-0 opacity-0 transition-opacity',
        // Table.Head uses group/status-col — show gear when hovering the header cell.
        'group-hover/status-col:opacity-100 focus-within:opacity-100',
        open && 'opacity-100',
        className,
      )}
    >
      <ActionPopover
        triggerIcon={RiSettings3Line}
        ariaLabel='Status column actions'
        onOpenChange={setOpen}
        items={items}
      />
    </span>
  );
}

export default function SetStatusesModal({
  open,
  onOpenChange,
  doctype = 'Space',
  field = 'status',
  context,
  fieldLabel,
  showImport = true,
  lockDefaultLifecycle,
  onSaved,
}) {
  const { userSideBarPerm } = useSelector((state) => state.auth);
  if (!isSuperAdminRole(userSideBarPerm)) return null;

  return (
    <StatusConfigurationEditor
      mode='modal'
      open={open}
      onOpenChange={onOpenChange}
      doctype={doctype}
      field={field}
      context={context}
      fieldLabel={fieldLabel}
      showImport={showImport}
      lockDefaultLifecycle={lockDefaultLifecycle}
      onSaved={onSaved}
    />
  );
}
