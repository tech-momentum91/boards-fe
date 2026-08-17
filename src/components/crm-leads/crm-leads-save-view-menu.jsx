import { useEffect } from 'react';
import {
  RiArrowDownSLine,
  RiArrowGoBackLine,
  RiGroupLine,
  RiResetLeftLine,
  RiSaveLine,
  RiUserLine,
} from 'react-icons/ri';
import * as Dropdown from '@/components/ui/dropdown';
import { cn } from '@/utils/cn';

function ShortcutHint({ children }) {
  return <span className='ml-auto shrink-0 text-paragraph-xs text-text-soft-400'>{children}</span>;
}

function isEditableKeyboardTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="dialog"], [data-state="open"][data-radix-dialog-content], [data-vaul-drawer]',
    ),
  );
}

function DefaultViewMenuItems({ canSaveViewForAll = false, isSaving = false, onResetToDefault }) {
  if (canSaveViewForAll) {
    return (
      <Dropdown.MenuSub>
        <Dropdown.MenuSubTrigger disabled={isSaving}>
          <Dropdown.ItemIcon as={RiResetLeftLine} />
          Default view
        </Dropdown.MenuSubTrigger>
        <Dropdown.MenuSubContent className='w-[200px]'>
          <Dropdown.Item
            onSelect={(event) => {
              event.preventDefault();
              onResetToDefault?.({ scope: 'me' });
            }}
            disabled={isSaving}
          >
            <Dropdown.ItemIcon as={RiUserLine} />
            For me
          </Dropdown.Item>
          <Dropdown.Item
            onSelect={(event) => {
              event.preventDefault();
              onResetToDefault?.({ scope: 'all' });
            }}
            disabled={isSaving}
          >
            <Dropdown.ItemIcon as={RiGroupLine} />
            For all
          </Dropdown.Item>
        </Dropdown.MenuSubContent>
      </Dropdown.MenuSub>
    );
  }

  return (
    <Dropdown.Item
      onSelect={(event) => {
        event.preventDefault();
        onResetToDefault?.({ scope: 'me' });
      }}
      disabled={isSaving}
    >
      <Dropdown.ItemIcon as={RiResetLeftLine} />
      Default view
    </Dropdown.Item>
  );
}

/**
 * CRM Leads Save View menu.
 *
 * Visible when there is something to do:
 * - dirty → Save for me (+ Save for all for admins) / Autosave / Revert
 * - autosave on → Disable Autosave (even when clean — all users including admins)
 * - personal view → Default view (For me / For all for admins)
 *
 * After Save for all, personal overlays are cleared and the view is clean,
 * so the menu hides unless autosave is still enabled.
 */
export default function CrmLeadsSaveViewMenu({
  isDirty = false,
  hasPersonalView = false,
  canSaveViewForAll = false,
  isAutosaveEnabled = false,
  isSaving = false,
  onSaveForMe,
  onSaveForAll,
  onResetToDefault,
  onToggleAutosave,
  onRevertChanges,
}) {
  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      const isSaveShortcut =
        (event.metaKey || event.ctrlKey) && event.key === 'Enter' && !event.shiftKey;
      if (!isSaveShortcut) {
        return;
      }
      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      event.preventDefault();
      onSaveForMe?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDirty, onSaveForMe]);

  if (!isDirty && !hasPersonalView && !isAutosaveEnabled) {
    return null;
  }

  const primaryLabel = isDirty
    ? isSaving
      ? 'Saving...'
      : 'Save for me'
    : hasPersonalView
      ? isSaving
        ? 'Resetting...'
        : 'Default view'
      : isSaving
        ? 'Updating...'
        : 'Disable Autosave';

  const handlePrimaryClick = () => {
    if (isDirty) {
      onSaveForMe?.();
      return;
    }
    if (hasPersonalView) {
      onResetToDefault?.({ scope: 'me' });
      return;
    }
    onToggleAutosave?.();
  };

  const showAutosaveToggle = isDirty || isAutosaveEnabled;
  const showDefaultView = hasPersonalView;
  const dirtyBlockShown = isDirty;

  return (
    <Dropdown.Root>
      <div className='flex overflow-hidden rounded-lg border border-warning-base bg-warning-lighter shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'>
        <button
          type='button'
          disabled={isSaving}
          onClick={handlePrimaryClick}
          className='flex h-9 items-center gap-1.5 border-r border-warning-base/30 px-3 text-sm font-medium leading-5 tracking-[-0.084px] text-warning-darker transition hover:bg-warning-light disabled:opacity-60'
        >
          {primaryLabel}
        </button>

        <Dropdown.Trigger asChild>
          <button
            type='button'
            disabled={isSaving}
            aria-label='Save view options'
            className='flex h-9 items-center justify-center px-1.5 text-warning-darker transition hover:bg-warning-light disabled:opacity-60'
          >
            <RiArrowDownSLine size={18} />
          </button>
        </Dropdown.Trigger>
      </div>

      <Dropdown.Content align='end' className='w-[240px]'>
        {isDirty ? (
          <>
            <Dropdown.Item
              onSelect={(event) => {
                event.preventDefault();
                onSaveForMe?.();
              }}
              disabled={isSaving}
              className='justify-between'
            >
              <span className='flex items-center gap-2'>
                <Dropdown.ItemIcon as={RiUserLine} />
                Save for me
              </span>
              <ShortcutHint>⌘ ↵</ShortcutHint>
            </Dropdown.Item>

            {canSaveViewForAll ? (
              <Dropdown.Item
                onSelect={(event) => {
                  event.preventDefault();
                  onSaveForAll?.();
                }}
                disabled={isSaving}
              >
                <Dropdown.ItemIcon as={RiGroupLine} />
                Save for all
              </Dropdown.Item>
            ) : null}
          </>
        ) : null}

        {showAutosaveToggle ? (
          <Dropdown.Item
            onSelect={(event) => {
              event.preventDefault();
              onToggleAutosave?.();
            }}
            disabled={isSaving}
            className={cn(isAutosaveEnabled && 'bg-bg-weak-50')}
          >
            <Dropdown.ItemIcon as={RiSaveLine} />
            {isAutosaveEnabled ? 'Disable Autosave' : 'Enable Autosave'}
          </Dropdown.Item>
        ) : null}

        {isDirty ? (
          <>
            <Dropdown.Separator />

            <Dropdown.Item
              onSelect={(event) => {
                event.preventDefault();
                onRevertChanges?.();
              }}
              disabled={isSaving}
            >
              <Dropdown.ItemIcon as={RiArrowGoBackLine} />
              Revert changes
            </Dropdown.Item>
          </>
        ) : null}

        {showDefaultView ? (
          <>
            {dirtyBlockShown || showAutosaveToggle ? <Dropdown.Separator /> : null}
            <DefaultViewMenuItems
              canSaveViewForAll={canSaveViewForAll}
              isSaving={isSaving}
              onResetToDefault={onResetToDefault}
            />
          </>
        ) : null}
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
