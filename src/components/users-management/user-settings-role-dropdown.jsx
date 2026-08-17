import React, { useMemo, useState, useCallback } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Dropdown from '@/components/ui/dropdown';
import * as Input from '@/components/ui/input';
import { cn } from '@/utils/cn';
import {
  filterGroupedRolesForSearch,
  isNestedRoleTypeMap,
  normalizeBucketToArray,
  normalizeRoleEntry,
} from '@/utils/user-utils';

/**
 * Searchable role picker for Settings → Users (add / edit), matching center/client dropdown UX.
 */
const UserSettingsRoleDropdown = ({
  value,
  onValueChange,
  groupedRolesFromApi,
  hasGroupedRolesUi,
  loading,
  disabled,
  hasError,
  adminExcludedRole,
  placeholder = 'Select',
  searchPlaceholder = 'Search role...',
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const excluded = useCallback(
    (roleName) => (typeof adminExcludedRole === 'function' ? adminExcludedRole(roleName) : false),
    [adminExcludedRole],
  );

  const filteredGrouped = useMemo(
    () => filterGroupedRolesForSearch(groupedRolesFromApi, searchQuery, excluded),
    [groupedRolesFromApi, searchQuery, excluded],
  );

  const hasFilteredRows = Object.keys(filteredGrouped).length > 0;

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) setSearchQuery('');
  };

  const selectRole = (roleName) => {
    onValueChange(roleName);
    setOpen(false);
    setSearchQuery('');
  };

  const triggerLabel = value?.trim() ? value : '';

  let listContent;
  if (loading) {
    listContent = (
      <div className='px-2 py-3 text-paragraph-sm text-text-sub-500'>Loading roles...</div>
    );
  } else if (hasGroupedRolesUi && hasFilteredRows) {
    listContent = (
      <>
        {Object.entries(filteredGrouped).map(([teamLabel, bucket], index) => {
          if (isNestedRoleTypeMap(bucket)) {
            const typeEntries = Object.entries(bucket).filter(([, roleNames]) =>
              Array.isArray(roleNames),
            );
            return (
              <div key={teamLabel || String(index)} className='flex flex-col'>
                <span className='subheading-2xs px-1 pt-1 text-[var(--color-text-soft-400)]'>
                  {teamLabel}
                </span>
                {typeEntries.map(([typeLabel, roleNames]) => {
                  const roles = (Array.isArray(roleNames) ? roleNames : [])
                    .map(normalizeRoleEntry)
                    .filter((r) => r.name && !excluded(r.name));
                  if (roles.length === 0) return null;
                  return (
                    <div key={`${teamLabel}-${typeLabel}`} className='flex flex-col'>
                      <span className='subheading-2xs pl-3 pr-1 pt-1 text-[var(--color-text-soft-400)]'>
                        {typeLabel}
                      </span>
                      {roles.map((r) => (
                        <div
                          key={`${teamLabel}-${typeLabel}-${r.name}`}
                          role='button'
                          tabIndex={0}
                          onClick={() => selectRole(r.name)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              selectRole(r.name);
                            }
                          }}
                          className={cn(
                            'rounded-lg p-2 text-paragraph-sm text-text-strong-950 outline-none cursor-pointer select-none',
                            'hover:bg-bg-weak-50',
                            value === r.name && 'bg-bg-weak-50',
                          )}
                        >
                          {r.name}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          }

          const roles = normalizeBucketToArray(bucket)
            .map(normalizeRoleEntry)
            .filter((r) => r.name && !excluded(r.name));
          if (roles.length === 0) return null;
          return (
            <div key={teamLabel || String(index)}>
              <span className='subheading-2xs px-1 pt-1 text-[var(--color-text-soft-400)]'>
                {teamLabel}
              </span>
              {roles.map((r) => (
                <div
                  key={`${teamLabel}-${r.name}`}
                  role='button'
                  tabIndex={0}
                  onClick={() => selectRole(r.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectRole(r.name);
                    }
                  }}
                  className={cn(
                    'rounded-lg p-2 text-paragraph-sm text-text-strong-950 outline-none cursor-pointer select-none',
                    'hover:bg-bg-weak-50',
                    value === r.name && 'bg-bg-weak-50',
                  )}
                >
                  {r.name}
                </div>
              ))}
            </div>
          );
        })}
      </>
    );
  } else if (hasGroupedRolesUi) {
    listContent = (
      <p className='px-2 py-3 text-paragraph-sm text-text-soft-400 text-center'>No roles found</p>
    );
  } else {
    listContent = (
      <div className='px-2 py-3 text-paragraph-sm text-text-sub-500'>No roles available</div>
    );
  }

  return (
    <Dropdown.Root open={open} onOpenChange={handleOpenChange}>
      <Dropdown.Trigger asChild>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='medium'
          type='button'
          disabled={disabled}
          className={cn(
            'w-full text-left justify-start font-normal',
            Boolean(hasError) && 'ring-error-base',
          )}
          hasError={hasError}
        >
          {triggerLabel ? (
            <span className='truncate'>{triggerLabel}</span>
          ) : (
            <span className='text-text-soft-400'>{placeholder}</span>
          )}
        </Button.Root>
      </Dropdown.Trigger>
      <Dropdown.Content
        className='w-[max(var(--radix-dropdown-menu-trigger-width),260px)] p-0 gap-0 max-h-[320px]'
        align='start'
        sideOffset={4}
      >
        <div className='p-2 border-b border-stroke-soft-200'>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete='off'
                autoCorrect='off'
                autoCapitalize='off'
                spellCheck='false'
                disabled={loading || hasGroupedRolesUi === false}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <div className='flex flex-col max-h-[260px] overflow-y-auto p-2'>{listContent}</div>
      </Dropdown.Content>
    </Dropdown.Root>
  );
};

export default UserSettingsRoleDropdown;
