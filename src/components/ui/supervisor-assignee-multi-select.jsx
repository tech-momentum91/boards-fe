import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { RiSearchLine, RiCheckLine, RiCloseLine } from 'react-icons/ri';
import * as Dropdown from '@/components/ui/dropdown';
import * as Input from '@/components/ui/input';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';

function normalizeAssigneeId(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const raw = value.value ?? value.email ?? value.name ?? value.user;
    return raw != null ? String(raw).trim() : '';
  }
  return String(value).trim();
}

function assigneeIdListsEqual(a, b) {
  const norm = (arr) =>
    [...(Array.isArray(arr) ? arr : [])].map(normalizeAssigneeId).filter(Boolean).sort();
  const aa = norm(a);
  const bb = norm(b);
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}

function assigneeSelectionContains(selection, optionValue) {
  const key = normalizeAssigneeId(optionValue);
  if (!key) return false;
  return (selection ?? []).some((v) => normalizeAssigneeId(v) === key);
}

/**
 * Ticket-style assignee dropdown (search + Assignees / People) for a static list — e.g. center supervisors.
 * Mirrors `AssigneeMultiSelect` UI without user search / Redux.
 */
const SupervisorAssigneeMultiSelect = ({
  options = [],
  value = [],
  onChange,
  onBlur,
  disabled = false,
  readonly = false,
  placeholder = 'Select assignees',
  maxVisibleAvatars = 4,
  size = 'medium',
  hasError = false,
  variant = 'borderless',
  /** Shown as subtitle under each row (e.g. "Supervisor"). */
  roleLabel = 'Supervisor',
  triggerClassName,
  /**
   * When false, `onChange` runs only when the dropdown closes (after local multi-select).
   * Use with `onBlur` for save-on-close; avoids updating parent state on every chip toggle.
   */
  syncParentOnEachSelection = true,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef(null);
  const valueWhenOpenedRef = useRef([]);
  const [draftSelection, setDraftSelection] = useState([]);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const valueIds = useMemo(() => {
    if (!value) return [];
    const array = Array.isArray(value) ? value : [value].filter(Boolean);
    return array.map(normalizeAssigneeId).filter(Boolean);
  }, [value]);

  const optionById = useMemo(() => {
    const m = new Map();
    options.forEach((o) => {
      if (o?.value == null) return;
      const primary = String(o.value);
      m.set(primary, o);
      const email = o.email != null ? String(o.email) : '';
      if (email && email !== primary) m.set(email, o);
      const user = o.user != null ? String(o.user) : '';
      if (user && user !== primary && user !== email) m.set(user, o);
      const name = o.name != null ? String(o.name) : '';
      if (name && name !== primary && name !== email && name !== user) m.set(name, o);
    });
    return m;
  }, [options]);

  const buildOptionsForIds = useCallback(
    (ids) =>
      (ids ?? []).map((id) => {
        const found = optionById.get(String(id));
        if (found) {
          return {
            ...found,
            user_role: found.user_role ?? roleLabel,
          };
        }
        return {
          value: id,
          label: id,
          name: id,
          user_role: roleLabel,
        };
      }),
    [optionById, roleLabel],
  );

  const avatarIds = !syncParentOnEachSelection && open ? draftSelection : valueIds;
  const avatarOptions = useMemo(
    () => buildOptionsForIds(avatarIds),
    [buildOptionsForIds, avatarIds],
  );

  const currentSelection = open ? draftSelection : valueIds;

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [open]);

  const allAssignees = useMemo(() => {
    if (debouncedSearchQuery.trim().length > 0) return [];
    const selectedIds = open ? draftSelection : valueIds;
    return selectedIds.map((id) => optionById.get(String(id))).filter(Boolean);
  }, [debouncedSearchQuery, open, draftSelection, valueIds, optionById]);

  const peopleOptions = useMemo(() => {
    if (debouncedSearchQuery.trim().length > 0) return [];
    const selectedIds = open ? draftSelection : valueIds;
    const set = new Set(selectedIds.map(normalizeAssigneeId).filter(Boolean));
    return options.filter((o) => !set.has(normalizeAssigneeId(o.value)));
  }, [options, debouncedSearchQuery, open, draftSelection, valueIds]);

  const searchFiltered = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return options.filter(
      (o) =>
        String(o.label ?? '')
          .toLowerCase()
          .includes(q) ||
        String(o.value ?? '')
          .toLowerCase()
          .includes(q),
    );
  }, [options, debouncedSearchQuery]);

  const handleOpen = useCallback(() => {
    if (disabled || readonly) return;
    const snapshot = [...valueIds];
    valueWhenOpenedRef.current = snapshot;
    setDraftSelection(snapshot);
    setOpen(true);
  }, [valueIds, disabled, readonly]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSearchQuery('');

    const hasChanged = !assigneeIdListsEqual(valueWhenOpenedRef.current, draftSelection);

    if (hasChanged) {
      if (!syncParentOnEachSelection) {
        onChange?.(draftSelection);
      }
      onBlur?.(draftSelection);
    }
    setDraftSelection([]);
  }, [draftSelection, onBlur, onChange, syncParentOnEachSelection]);

  const handleToggle = useCallback(
    (optionValue) => {
      if (disabled || readonly) return;
      const key = normalizeAssigneeId(optionValue);
      const isSelected = draftSelection.some((v) => normalizeAssigneeId(v) === key);
      const newSelection = isSelected
        ? draftSelection.filter((v) => normalizeAssigneeId(v) !== key)
        : [...draftSelection, key];
      setDraftSelection(newSelection);
      if (syncParentOnEachSelection) {
        onChange?.(newSelection);
      }
    },
    [draftSelection, onChange, disabled, readonly, syncParentOnEachSelection],
  );

  const handleRemoveAssignee = useCallback(
    (optionValue, e) => {
      if (disabled || readonly) return;
      e.preventDefault();
      e.stopPropagation();
      if (syncParentOnEachSelection) {
        const key = normalizeAssigneeId(optionValue);
        const newSelection = valueIds.filter((v) => normalizeAssigneeId(v) !== key);
        onChange?.(newSelection);
        onBlur?.(newSelection);
        return;
      }
      const key = normalizeAssigneeId(optionValue);
      const baseIds = open ? draftSelection : valueIds;
      const newSelection = baseIds.filter((v) => normalizeAssigneeId(v) !== key);
      if (open) {
        setDraftSelection(newSelection);
      } else {
        onChange?.(newSelection);
        onBlur?.(newSelection);
      }
    },
    [
      valueIds,
      draftSelection,
      open,
      onChange,
      onBlur,
      disabled,
      readonly,
      syncParentOnEachSelection,
    ],
  );

  const handleRemoveMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleRemoveKeyDown = useCallback(
    (e, optValue) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleRemoveAssignee(optValue, e);
      }
    },
    [handleRemoveAssignee],
  );

  const displayOptions = avatarOptions.filter((opt) =>
    assigneeSelectionContains(avatarIds, opt.value),
  );

  const subtitleForOption = useCallback(
    (option) => {
      const r = String(option?.user_role ?? option?.role ?? '').trim();
      return r || roleLabel;
    },
    [roleLabel],
  );

  return (
    <div onClick={(e) => e.stopPropagation()} className='min-w-0'>
      <Dropdown.Root open={open} onOpenChange={(isOpen) => (isOpen ? handleOpen() : handleClose())}>
        <Dropdown.Trigger asChild>
          <Button.Root
            {...(variant === 'borderless'
              ? {
                  variant: 'neutral',
                  mode: 'ghost',
                }
              : {
                  variant: 'neutral',
                  mode: 'stroke',
                })}
            type='button'
            disabled={disabled}
            className={cn(
              'max-w-full text-left justify-start',
              disabled && 'cursor-not-allowed opacity-50',
              readonly && 'cursor-not-allowed hover:bg-transparent',
              hasError && 'ring-error-base',
              triggerClassName ?? 'w-auto',
            )}
            size={size}
            {...(readonly && {
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
              },
            })}
          >
            {displayOptions.length === 0 ? (
              <span className='text-paragraph-sm text-text-soft-400'>{placeholder}</span>
            ) : (
              <div className='flex items-center'>
                {displayOptions.slice(0, maxVisibleAvatars).map((opt, index) => {
                  const name = opt.label || opt.name || opt.email || opt.value || 'User';
                  return (
                    <Tooltip.Root size='xsmall' key={opt.value || index}>
                      <Tooltip.Trigger asChild>
                        <span
                          className='relative inline-block rounded-full ring-2 ring-white group/avatar'
                          style={{ marginLeft: index === 0 ? 0 : -8, zIndex: index }}
                        >
                          <CrmAccountAvatar
                            name={name}
                            index={index}
                            size={24}
                            showNativeTitle={false}
                          />
                          {!disabled && !readonly && (
                            <span
                              role='button'
                              tabIndex={0}
                              onClick={(e) => handleRemoveAssignee(opt.value, e)}
                              onMouseDown={handleRemoveMouseDown}
                              onPointerDown={handleRemoveMouseDown}
                              onKeyDown={(e) => handleRemoveKeyDown(e, opt.value)}
                              className={cn(
                                'absolute -top-1 -right-1 flex size-4 cursor-pointer items-center justify-center',
                                'rounded-full bg-error-base text-white opacity-0 transition-opacity',
                                'hover:bg-error-600 group-hover/avatar:opacity-100',
                                'focus:outline-none focus:ring-2 focus:ring-error-base focus:ring-offset-1',
                                'z-10',
                              )}
                              aria-label={`Remove ${name}`}
                            >
                              <RiCloseLine className='size-2.5' />
                            </span>
                          )}
                        </span>
                      </Tooltip.Trigger>
                      {name && (
                        <Tooltip.Content size='xsmall' side='bottom'>
                          {name}
                        </Tooltip.Content>
                      )}
                    </Tooltip.Root>
                  );
                })}
                {displayOptions.length > maxVisibleAvatars && (
                  <Tooltip.Root size='xsmall'>
                    <Tooltip.Trigger asChild>
                      <span
                        className='inline-block cursor-default rounded-full ring-2 ring-white'
                        style={{ marginLeft: -8, zIndex: maxVisibleAvatars }}
                      >
                        <CrmAccountAvatar
                          name={`+${displayOptions.length - maxVisibleAvatars}`}
                          initials={`+${displayOptions.length - maxVisibleAvatars}`}
                          variant='weak'
                          size={24}
                          showNativeTitle={false}
                        />
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content side='bottom' className='max-w-[220px]'>
                      {displayOptions
                        .slice(maxVisibleAvatars)
                        .map((o) => o.label || o.name || o.email || o.value)
                        .join(', ')}
                    </Tooltip.Content>
                  </Tooltip.Root>
                )}
              </div>
            )}
          </Button.Root>
        </Dropdown.Trigger>
        <Dropdown.Content
          className='flex max-h-[300px] min-h-[200px] w-[320px] flex-col gap-0 overflow-y-auto p-0'
          align='start'
        >
          <div className='border-b border-stroke-soft-200 p-2'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  ref={inputRef}
                  placeholder='Search users...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  autoComplete='off'
                  autoCorrect='off'
                  autoCapitalize='off'
                  spellCheck='false'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='flex max-h-[300px] flex-1 flex-col overflow-y-auto'>
            {debouncedSearchQuery.trim().length > 0 ? (
              <div className='px-2 pt-2'>
                {searchFiltered.length === 0 ? (
                  <div className='flex grow items-center justify-center px-4 py-8 text-center'>
                    <p className='text-paragraph-sm text-text-soft-400'>No supervisors found</p>
                  </div>
                ) : (
                  <div className='space-y-1'>
                    {searchFiltered.map((option) => {
                      const isSelected = assigneeSelectionContains(currentSelection, option.value);
                      const name =
                        option.label || option.name || option.email || option.value || 'User';
                      return (
                        <div
                          key={option.value}
                          role='button'
                          tabIndex={0}
                          className={cn(
                            'group/item relative flex cursor-pointer select-none items-center gap-2 rounded-lg p-2',
                            'text-paragraph-sm text-text-strong-950 outline-none transition duration-200 ease-out',
                            'focus:outline-none',
                            isSelected && 'bg-bg-weak-50',
                          )}
                          onClick={() => handleToggle(option.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleToggle(option.value);
                            }
                          }}
                        >
                          <CrmAccountAvatar
                            name={name}
                            index={searchFiltered.indexOf(option)}
                            size={32}
                          />
                          <div className='flex min-w-0 flex-1 flex-col'>
                            <span className='text-paragraph-sm text-text-main-900'>{name}</span>
                            <span className='text-label-xs text-text-soft-400'>
                              {subtitleForOption(option)}
                            </span>
                          </div>
                          {isSelected && (
                            <RiCheckLine className='size-4 shrink-0 text-text-main-900' />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                {allAssignees.length > 0 && (
                  <div className='px-2 pt-2'>
                    <Dropdown.Label className='px-2 py-1.5'>Assignees</Dropdown.Label>
                    <div className='space-y-1'>
                      {allAssignees.map((option) => {
                        const isSelected = assigneeSelectionContains(
                          currentSelection,
                          option.value,
                        );
                        const name =
                          option.label || option.name || option.email || option.value || 'User';
                        return (
                          <div
                            key={option.value}
                            role='button'
                            tabIndex={0}
                            className={cn(
                              'group/item relative flex cursor-pointer select-none items-center gap-2 rounded-lg p-2',
                              'text-paragraph-sm text-text-strong-950 outline-none transition duration-200 ease-out',
                              'focus:outline-none',
                              isSelected && 'bg-bg-weak-50',
                            )}
                            onClick={() => handleToggle(option.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleToggle(option.value);
                              }
                            }}
                          >
                            <CrmAccountAvatar
                              name={name}
                              index={allAssignees.indexOf(option)}
                              size={32}
                            />
                            <div className='flex min-w-0 flex-1 flex-col'>
                              <span className='text-paragraph-sm text-text-main-900'>{name}</span>
                              <span className='text-label-xs text-text-soft-400'>
                                {subtitleForOption(option)}
                              </span>
                            </div>
                            {isSelected && (
                              <RiCheckLine className='size-4 shrink-0 text-text-main-900' />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className={cn('flex grow flex-col px-2', allAssignees.length > 0 && 'pt-2')}>
                  {peopleOptions.length > 0 && allAssignees.length > 0 && (
                    <Dropdown.Label className='px-2 py-1.5'>People</Dropdown.Label>
                  )}
                  {peopleOptions.length === 0 && allAssignees.length === 0 ? (
                    <div className='flex grow items-center justify-center px-4 py-8 text-center'>
                      <p className='text-paragraph-sm text-text-soft-400'>
                        No supervisors for this center
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-1 pb-2'>
                      {peopleOptions.map((option) => {
                        const isSelected = assigneeSelectionContains(
                          currentSelection,
                          option.value,
                        );
                        const name =
                          option.label || option.name || option.email || option.value || 'User';
                        return (
                          <div
                            key={option.value}
                            role='button'
                            tabIndex={0}
                            className={cn(
                              'group/item relative flex cursor-pointer select-none items-center gap-2 rounded-lg p-2',
                              'text-paragraph-sm text-text-strong-950 outline-none transition duration-200 ease-out',
                              'focus:outline-none',
                              isSelected && 'bg-bg-weak-50',
                            )}
                            onClick={() => handleToggle(option.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleToggle(option.value);
                              }
                            }}
                          >
                            <CrmAccountAvatar
                              name={name}
                              index={peopleOptions.indexOf(option)}
                              size={32}
                            />
                            <div className='flex min-w-0 flex-1 flex-col'>
                              <span className='text-paragraph-sm text-text-main-900'>{name}</span>
                              <span className='text-label-xs text-text-soft-400'>
                                {subtitleForOption(option)}
                              </span>
                            </div>
                            {isSelected && (
                              <RiCheckLine className='size-4 shrink-0 text-text-main-900' />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  );
};

export default SupervisorAssigneeMultiSelect;
