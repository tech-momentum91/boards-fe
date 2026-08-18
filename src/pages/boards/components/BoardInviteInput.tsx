import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ChevronDown } from 'lucide-react';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import * as Button from '@/components/ui/button';
import * as Tag from '@/components/ui/tag';
import { useDebounce } from '@/hooks/use-debounce';
import { searchUsers } from '@/redux/userSlice';
import { cn } from '@/utils/cn';

function getUserId(user) {
  return user?.value || user?.name || user?.email || '';
}

function InviteUserChip({ user, disabled, onRemove }) {
  const userId = getUserId(user);
  const label = user.full_name || user.label || user.email || userId;

  return (
    <Tag.Root variant='stroke' disabled={disabled} className='h-6 gap-1 px-1 py-[3px]'>
      <CrmAccountAvatar
        name={label}
        image={user.image || user.avatar}
        size={16}
        className='shrink-0'
      />
      <span className='max-w-[140px] truncate text-xs font-medium leading-[18px] text-text-sub-600'>
        {label}
      </span>
      <Tag.DismissButton
        disabled={disabled}
        onClick={() => onRemove?.(userId)}
        aria-label={`Remove ${label}`}
      />
    </Tag.Root>
  );
}

function PeopleSuggestionRow({ user, index, onSelect }) {
  const userId = getUserId(user);
  const name = user.full_name || user.label || user.email || userId;
  const roleDisplay =
    user.user_role || (Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0] : null);
  const email = user.email && user.email !== name ? user.email : null;

  return (
    <li>
      <button
        type='button'
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onSelect(user)}
        className='flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1'
      >
        <CrmAccountAvatar name={name} image={user.image || user.avatar} size={32} index={index} />
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium leading-5 text-text-main-900'>{name}</p>
          {roleDisplay || email ? (
            <p className='truncate text-xs leading-4 text-text-soft-400'>
              {roleDisplay || email}
            </p>
          ) : null}
        </div>
      </button>
    </li>
  );
}

export default function BoardInviteInput({
  excludeUserIds = [],
  disabled = false,
  isSubmitting = false,
  onInvite,
  value = null,
  onChange = null,
  placeholder = 'Invite by name or email',
  submitLabel = 'Invite',
  className,
}) {
  const dispatch = useDispatch();
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const isControlled = Array.isArray(value) && typeof onChange === 'function';

  const [internalSelected, setInternalSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [peopleResults, setPeopleResults] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleLoadingMore, setPeopleLoadingMore] = useState(false);
  const [peopleHasMore, setPeopleHasMore] = useState(false);
  const [peopleNextStart, setPeopleNextStart] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const PEOPLE_PAGE_SIZE = 20;

  const selectedUsers = isControlled ? value : internalSelected;

  const excludeSet = useMemo(
    () => new Set(excludeUserIds.filter(Boolean).map(String)),
    [excludeUserIds],
  );

  const selectedIdSet = useMemo(
    () => new Set(selectedUsers.map((user) => String(getUserId(user)))),
    [selectedUsers],
  );

  const updateSelectedUsers = useCallback(
    (nextUsers) => {
      if (isControlled) {
        onChange(nextUsers);
        return;
      }
      setInternalSelected(nextUsers);
    },
    [isControlled, onChange],
  );

  const filteredPeople = useMemo(() => {
    return peopleResults.filter((user) => {
      const userId = getUserId(user);
      if (!userId) {
        return false;
      }
      return !excludeSet.has(String(userId)) && !selectedIdSet.has(String(userId));
    });
  }, [excludeSet, peopleResults, selectedIdSet]);

  const shouldShowDropdown = showDropdown && isFocused && !disabled;

  useEffect(() => {
    if (!shouldShowDropdown) {
      setPeopleLoading(false);
      setPeopleLoadingMore(false);
      return undefined;
    }

    const trimmed = searchQuery.trim();
    if (trimmed !== '' && debouncedSearch.trim() !== trimmed) {
      return undefined;
    }

    let cancelled = false;

    const fetchPeople = async () => {
      setPeopleLoading(true);
      try {
        const result = await dispatch(
          searchUsers({
            searchQuery: trimmed,
            limit: PEOPLE_PAGE_SIZE,
            start: 0,
            append: false,
            updateSearchData: false,
            internal_only: true,
          }),
        ).unwrap();

        if (!cancelled) {
          const users = Array.isArray(result?.users) ? result.users : [];
          setPeopleResults(users);
          setPeopleHasMore(Boolean(result?.hasMore));
          setPeopleNextStart((Number(result?.start) || 0) + users.length);
        }
      } catch {
        if (!cancelled) {
          setPeopleResults([]);
          setPeopleHasMore(false);
          setPeopleNextStart(0);
        }
      } finally {
        if (!cancelled) {
          setPeopleLoading(false);
        }
      }
    };

    fetchPeople();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, dispatch, searchQuery, shouldShowDropdown]);

  const handlePeopleScroll = useCallback(
    async (event) => {
      const target = event.currentTarget;
      const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (remaining >= 48 || !peopleHasMore || peopleLoading || peopleLoadingMore) {
        return;
      }

      setPeopleLoadingMore(true);
      try {
        const result = await dispatch(
          searchUsers({
            searchQuery: searchQuery.trim(),
            limit: PEOPLE_PAGE_SIZE,
            start: peopleNextStart,
            append: false,
            updateSearchData: false,
            internal_only: true,
          }),
        ).unwrap();

        const users = Array.isArray(result?.users) ? result.users : [];
        setPeopleResults((previous) => {
          const existing = new Set(previous.map((user) => String(getUserId(user))));
          const merged = [...previous];
          users.forEach((user) => {
            const id = String(getUserId(user));
            if (!existing.has(id)) {
              merged.push(user);
              existing.add(id);
            }
          });
          return merged;
        });
        setPeopleHasMore(Boolean(result?.hasMore));
        setPeopleNextStart((Number(result?.start) || peopleNextStart) + users.length);
      } catch {
        setPeopleHasMore(false);
      } finally {
        setPeopleLoadingMore(false);
      }
    },
    [
      dispatch,
      peopleHasMore,
      peopleLoading,
      peopleLoadingMore,
      peopleNextStart,
      searchQuery,
    ],
  );
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setShowDropdown(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const addUser = useCallback(
    (user) => {
      const userId = getUserId(user);
      if (!userId || excludeSet.has(String(userId)) || selectedIdSet.has(String(userId))) {
        return;
      }

      updateSelectedUsers([...selectedUsers, user]);
      setSearchQuery('');
      setShowDropdown(true);
      inputRef.current?.focus();
    },
    [excludeSet, selectedIdSet, selectedUsers, updateSelectedUsers],
  );

  const removeUser = useCallback(
    (userId) => {
      updateSelectedUsers(
        selectedUsers.filter((user) => String(getUserId(user)) !== String(userId)),
      );
    },
    [selectedUsers, updateSelectedUsers],
  );

  const resolveTypedUser = useCallback(() => {
    const query = searchQuery.trim();
    if (!query) {
      return null;
    }

    const exactMatch = filteredPeople.find((user) => {
      const userId = getUserId(user);
      const email = (user.email || '').toLowerCase();
      const name = (user.full_name || user.label || '').toLowerCase();
      const lowerQuery = query.toLowerCase();
      return (
        String(userId).toLowerCase() === lowerQuery || email === lowerQuery || name === lowerQuery
      );
    });

    if (exactMatch) {
      return exactMatch;
    }

    if (filteredPeople.length === 1) {
      return filteredPeople[0];
    }

    return {
      value: query,
      name: query,
      email: query,
      full_name: query,
      label: query,
      image: null,
    };
  }, [filteredPeople, searchQuery]);

  const handleSubmit = async () => {
    let usersToInvite = [...selectedUsers];

    if (usersToInvite.length === 0 && searchQuery.trim()) {
      const resolved = resolveTypedUser();
      if (resolved) {
        usersToInvite = [resolved];
      }
    }

    if (usersToInvite.length === 0) {
      return;
    }

    const userIds = usersToInvite.map((user) => getUserId(user)).filter(Boolean);
    let didSubmit = false;

    if (onInvite) {
      const invited = await onInvite(userIds, usersToInvite);
      if (invited !== false) {
        didSubmit = true;
        if (!isControlled) {
          setInternalSelected([]);
        }
      }
    } else if (isControlled) {
      const mergedUsers = [...selectedUsers];
      usersToInvite.forEach((user) => {
        const userId = getUserId(user);
        if (!mergedUsers.some((entry) => String(getUserId(entry)) === String(userId))) {
          mergedUsers.push(user);
        }
      });
      updateSelectedUsers(mergedUsers);
      didSubmit = true;
    }

    if (didSubmit) {
      setSearchQuery('');
      setShowDropdown(false);
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (searchQuery.trim()) {
        const resolved = resolveTypedUser();
        if (resolved && filteredPeople.length > 0 && filteredPeople[0] === resolved) {
          addUser(resolved);
          return;
        }
        if (resolved && selectedUsers.length === 0) {
          handleSubmit();
          return;
        }
        if (resolved) {
          addUser(resolved);
          return;
        }
      }
      handleSubmit();
      return;
    }

    if (event.key === 'Backspace' && !searchQuery && selectedUsers.length > 0) {
      removeUser(getUserId(selectedUsers.at(-1)));
    }

    if (event.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const canSubmit =
    !disabled && !isSubmitting && (selectedUsers.length > 0 || Boolean(searchQuery.trim()));

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex min-h-9 items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] transition-shadow',
          isFocused &&
            'border-stroke-strong-900 shadow-[0px_0px_0px_2px_white,0px_0px_0px_4px_#e4e5e7]',
        )}
      >
        <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
          {selectedUsers.map((user) => (
            <InviteUserChip
              key={getUserId(user)}
              user={user}
              disabled={disabled || isSubmitting}
              onRemove={removeUser}
            />
          ))}

          <input
            ref={inputRef}
            type='text'
            value={searchQuery}
            disabled={disabled || isSubmitting}
            placeholder={selectedUsers.length === 0 ? placeholder : ''}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowDropdown(true);
            }}
            onKeyDown={handleInputKeyDown}
            className='min-w-[120px] flex-1 bg-transparent text-sm leading-5 text-text-main-900 outline-none placeholder:text-text-soft-400 disabled:cursor-not-allowed disabled:text-text-disabled-300'
          />
        </div>

        <Button.Root
          type='button'
          variant='neutral'
          mode='ghost'
          size='xsmall'
          disabled={!canSubmit}
          onClick={handleSubmit}
          className='shrink-0'
        >
          {isSubmitting ? 'Inviting...' : submitLabel}
        </Button.Root>
      </div>

      {shouldShowDropdown ? (
        <div className='absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 shadow-regular-md'>
          <div className='max-h-[220px] overflow-y-auto px-2 py-2' onScroll={handlePeopleScroll}>
            <p className='px-2 pb-2 text-subheading-xs uppercase text-text-soft-400'>People</p>

            {peopleLoading ? (
              <p className='px-2 py-3 text-sm text-text-soft-400'>Searching...</p>
            ) : filteredPeople.length === 0 ? (
              <p className='px-2 py-3 text-sm text-text-soft-400'>
                {searchQuery.trim()
                  ? 'No matching users. Try a different search.'
                  : 'Start typing to search people.'}
              </p>
            ) : (
              <ul className='space-y-0.5'>
                {filteredPeople.map((user, index) => (
                  <PeopleSuggestionRow
                    key={getUserId(user)}
                    user={user}
                    index={index}
                    onSelect={addUser}
                  />
                ))}
              </ul>
            )}
            {peopleLoadingMore ? (
              <p className='px-2 py-2 text-center text-xs text-text-soft-400'>Loading more...</p>
            ) : null}
          </div>

          {peopleHasMore || filteredPeople.length > 3 ? (
            <div className='flex justify-center border-t border-stroke-soft-200 py-1.5 text-icon-soft-400'>
              <ChevronDown size={16} aria-hidden />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
