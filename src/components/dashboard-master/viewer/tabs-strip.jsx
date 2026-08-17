import React, { useCallback, useState } from 'react';
import { RiAddLine } from 'react-icons/ri';

import * as Dropdown from '@/components/ui/dropdown';
import * as Switch from '@/components/ui/switch';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

function AddTabButton({ onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-1.5 text-label-sm font-medium text-text-soft-400 transition duration-200 ease-out hover:bg-bg-weak-100'
    >
      <RiAddLine className='size-5 shrink-0' aria-hidden='true' />
      Add
    </button>
  );
}

export default function TabsStrip({
  tabs,
  activeTabId,
  onSelect,
  onAdd,
  onRename,
  onTogglePin,
  onToggleDefault,
  onDuplicate,
  onDelete,
  manageTabs = true,
}) {
  const [contextMenu, setContextMenu] = useState(null);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleContextMenu = useCallback((event, tab) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, tab });
  }, []);

  const contextTab = contextMenu?.tab;
  const canManageTabs = manageTabs && typeof onAdd === 'function';
  const showStrip = tabs.length > 0 || canManageTabs;

  if (!showStrip) return null;

  return (
    <>
      <div className='shrink-0 border-b border-stroke-soft-200 bg-bg-white-0'>
        <TabMenuHorizontal.Root
          value={activeTabId || ''}
          onValueChange={onSelect}
          className='w-full min-w-0'
        >
          <TabMenuHorizontal.List className='h-12 border-0 px-6' wrapperClassName='border-0'>
            {tabs.map((tab) => (
              <TabMenuHorizontal.Trigger
                key={tab.tab_id}
                value={tab.tab_id}
                onContextMenu={manageTabs ? (event) => handleContextMenu(event, tab) : undefined}
              >
                {tab.display_name}
              </TabMenuHorizontal.Trigger>
            ))}
            {canManageTabs && <AddTabButton onClick={onAdd} />}
          </TabMenuHorizontal.List>
        </TabMenuHorizontal.Root>
      </div>

      {manageTabs && contextTab && (
        <Dropdown.Root
          open={Boolean(contextMenu)}
          onOpenChange={(open) => {
            if (!open) closeContextMenu();
          }}
        >
          <Dropdown.Trigger asChild>
            <span
              className='fixed z-50 block h-px w-px'
              style={{ left: contextMenu.x, top: contextMenu.y }}
              aria-hidden='true'
            />
          </Dropdown.Trigger>
          <Dropdown.Content className='w-[190px] p-2' align='start'>
            <Dropdown.Item
              onSelect={() => {
                onRename(contextTab);
                closeContextMenu();
              }}
            >
              Rename
            </Dropdown.Item>
            <div
              className='flex items-center justify-between gap-2 rounded-lg p-2 text-paragraph-sm text-text-strong-950'
              onPointerDown={(event) => event.preventDefault()}
            >
              <span>Pin View</span>
              <Switch.Root
                checked={Boolean(contextTab.is_pinned)}
                onCheckedChange={(checked) => {
                  onTogglePin(contextTab, checked);
                  closeContextMenu();
                }}
                onPointerDown={(event) => event.stopPropagation()}
              />
            </div>
            <div
              className='flex items-center justify-between gap-2 rounded-lg p-2 text-paragraph-sm text-text-strong-950'
              onPointerDown={(event) => event.preventDefault()}
            >
              <span>Set as Default</span>
              <Switch.Root
                checked={Boolean(contextTab.is_default)}
                onCheckedChange={(checked) => {
                  onToggleDefault(contextTab, checked);
                  closeContextMenu();
                }}
                onPointerDown={(event) => event.stopPropagation()}
              />
            </div>
            <Dropdown.Item
              onSelect={() => {
                onDuplicate(contextTab);
                closeContextMenu();
              }}
            >
              Duplicate
            </Dropdown.Item>
            <Dropdown.Item
              className='text-error-base data-[highlighted]:text-error-base'
              onSelect={() => {
                onDelete(contextTab);
                closeContextMenu();
              }}
            >
              Delete
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      )}
    </>
  );
}
