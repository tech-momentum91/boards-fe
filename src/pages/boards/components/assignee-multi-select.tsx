import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiSearchLine, RiCheckLine, RiCloseLine } from 'react-icons/ri';
import * as Dropdown from '@/components/ui/dropdown';
import * as Input from '@/components/ui/input';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { cn } from '@/lib/utils';
import { searchUsers, selectUserSearch } from '@/redux/userSlice';
import { useDebounce } from '@/hooks/use-debounce';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { getAssigneeDisplayName, getAssigneeFirstNameInitial } from '@/utils/task-utils';

// Cache for user data to preserve names and images
const userDataCache = new Map();

/** Match static `options` / `fixedAssigneeOptions` row when `value` is only an email or id string. */
function findAssigneeOptionInList(list, rawId) {
  if (!rawId || !Array.isArray(list) || list.length === 0) return null;
  const s = String(rawId).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  return (
    list.find((o) => String(o?.value ?? '').trim() === s) ||
    list.find((o) => String(o?.email ?? '').toLowerCase() === lower) ||
    list.find((o) => String(o?.user ?? '').trim() === s) ||
    list.find((o) => String(o?.name ?? '').trim() === s) ||
    null
  );
}

function cacheAssigneeOptionUnderIds(option) {
  if (!option || option.value == null) return;
  userDataCache.set(String(option.value), option);
  const e = option.email;
  if (e && String(e) !== String(option.value)) userDataCache.set(String(e), option);
  const u = option.user;
  if (u && String(u) !== String(option.value) && String(u) !== String(e))
    userDataCache.set(String(u), option);
}

/** True if `opt` is the same assignee as any id in `selectedIds` (email vs user id). */
function optionMatchesAnySelectedId(opt, selectedIds, resolveList) {
  if (!selectedIds?.length || !opt) return false;
  return selectedIds.some((sid) => {
    if (String(opt.value) === String(sid)) return true;
    if (!Array.isArray(resolveList) || resolveList.length === 0) return false;
    const resolved = findAssigneeOptionInList(resolveList, sid);
    return Boolean(resolved && String(resolved.value) === String(opt.value));
  });
}

// Cache for search results with TTL (Time To Live)
const searchResultsCache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes in milliseconds
const USER_PAGE_SIZE = 20;

// Helper to get cache key for search
const getSearchCacheKey = (searchQuery, names, internalOnly = false) => {
  const namesKey = names && names.length > 0 ? names.sort().join(',') : 'no-names';
  return `${searchQuery || ''}::${namesKey}::${internalOnly ? 'internal' : 'all'}::page0`;
};

// Helper to check if cache entry is still valid
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  const now = Date.now();
  return now - cacheEntry.timestamp < CACHE_TTL;
};

// Helper to clean old cache entries
const cleanOldCacheEntries = () => {
  const now = Date.now();
  for (const [key, entry] of searchResultsCache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL) {
      searchResultsCache.delete(key);
    }
  }
};

const AssigneeMultiSelect = ({
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
  internalOnly = false,
  options = null,
  /** When set (including []), list/search is limited to these users (no global user search) */
  fixedAssigneeOptions,
  fixedAssigneeOptionsLoading = false,
  /** When `options` is an array from an async source (e.g. sales team list), true while that fetch is in flight */
  optionsLoading = false,
  /** Render search + user list only (no trigger); parent provides the popover container */
  listOnly = false,
}) => {
  const dispatch = useDispatch();
  const userSearch = useSelector(selectUserSearch);

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignees, setAssignees] = useState([]); // Selected users fetched with names
  const [assigneesLoading, setAssigneesLoading] = useState(false);

  // Track the value when dropdown was opened
  const valueWhenOpenedRef = useRef([]);
  // Track current draft selection
  const [draftSelection, setDraftSelection] = useState([]);
  // Ref for input field to focus when dropdown opens
  const inputRef = useRef(null);
  const listScrollRef = useRef(null);
  const assigneesFetchedForOpenRef = useRef(false);
  const hasFocusedListOnlyInputRef = useRef(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const hasProvidedOptions = Array.isArray(options);
  const providedOptions = useMemo(
    () =>
      (Array.isArray(options) ? options : []).map((user) => ({
        label: user.label || user.full_name || user.name || user.email || 'User',
        value: user.value || user.name || user.email,
        email: user.email || user.value || user.name,
        name: user.name || user.value || user.email,
        full_name: user.full_name || user.label || user.name || user.email,
        image: user.image || user.avatar || user.user_image || null,
        avatar: user.image || user.avatar || user.user_image || null,
        user_role: user.user_role || null,
        roles: user.roles || (user.user_role ? [user.user_role] : user.role ? [user.role] : []),
      })),
    [options],
  );

  useEffect(() => {
    if (!hasProvidedOptions) return;
    providedOptions.forEach((user) => {
      if (user?.value) cacheAssigneeOptionUnderIds(user);
    });
  }, [hasProvidedOptions, providedOptions]);

  // Extract user IDs from value prop (handles both strings and objects)
  const valueIds = useMemo(() => {
    if (!value) return [];
    const array = Array.isArray(value) ? value : [value].filter(Boolean);
    return array
      .map((v) => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object') return v.value || v.email || v.user || v.name || '';
        return String(v);
      })
      .filter(Boolean);
  }, [value]);

  // Convert value to display options with full data (name, image, etc.)
  // Uses cache to preserve user data even if API returns just emails
  const valueOptions = useMemo(() => {
    if (!value) return [];
    const array = Array.isArray(value) ? value : [value].filter(Boolean);
    return array
      .map((v) => {
        if (typeof v === 'string') {
          if (fixedAssigneeOptions) {
            const match = findAssigneeOptionInList(fixedAssigneeOptions, v);
            if (match) {
              cacheAssigneeOptionUnderIds(match);
              return match;
            }
          }
          if (hasProvidedOptions) {
            const fromProvided = findAssigneeOptionInList(providedOptions, v);
            if (fromProvided) {
              cacheAssigneeOptionUnderIds(fromProvided);
              return fromProvided;
            }
          }
          // Check cache first
          const cached = userDataCache.get(v);
          if (cached) {
            return cached;
          }
          // Create basic object and cache it
          const basic = {
            value: v,
            label: v,
            email: v,
            name: v,
            image: null,
            user_role: null,
            roles: [],
          };
          userDataCache.set(v, basic);
          return basic;
        }
        if (v && typeof v === 'object') {
          const userValue = v.value || v.email || v.user || v.name || '';
          if (!userValue) return null;
          const userData = {
            value: userValue,
            label: getAssigneeDisplayName(v) || String(userValue || 'User'),
            email: v.email || v.user || userValue,
            user: v.user || userValue,
            name: v.full_name || v.name || v.label || v.user || userValue,
            full_name: v.full_name || v.label,
            image: v.image || v.avatar || v.user_image || null,
            user_role: v.user_role || null,
            roles: v.roles || (v.user_role ? [v.user_role] : v.role ? [v.role] : []), // Support both formats
          };
          cacheAssigneeOptionUnderIds(userData);
          return userData;
        }
        return null;
      })
      .filter(Boolean);
  }, [value, fixedAssigneeOptions, hasProvidedOptions, providedOptions]);

  // Current selection for display - use draft when panel is active, valueIds when closed
  const currentSelection = open || listOnly ? draftSelection : valueIds;

  // Extract selected user names/IDs for names payload (API expects user IDs/names)
  const selectedUserNames = useMemo(() => {
    if (!valueOptions || valueOptions.length === 0) return [];
    // API expects user names (which are the user IDs in Frappe)
    return valueOptions.map((opt) => opt.name || opt.value).filter(Boolean);
  }, [valueOptions]);

  // Focus input when dropdown opens (dropdown mode only — listOnly focuses once on mount)
  useEffect(() => {
    if (!open || listOnly) return;
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [open, listOnly]);

  // Fetch assignees (selected users) when dropdown opens and there are selected users
  useEffect(() => {
    const isPanelActive = open || listOnly;

    if (!isPanelActive) {
      assigneesFetchedForOpenRef.current = false;
    }

    if (hasProvidedOptions) {
      setAssignees([]);
      setAssigneesLoading(false);
      return;
    }
    if (fixedAssigneeOptions !== undefined) {
      if (!isPanelActive) {
        setAssignees([]);
        setAssigneesLoading(false);
        return;
      }
      if (valueIds.length > 0 && debouncedSearchQuery.trim().length === 0) {
        const resolved = valueIds.map((id) => {
          const fromFixed = findAssigneeOptionInList(fixedAssigneeOptions, id);
          if (fromFixed) {
            cacheAssigneeOptionUnderIds(fromFixed);
            return fromFixed;
          }
          const cached = userDataCache.get(id);
          if (cached) return cached;
          const basic = {
            value: id,
            label: id,
            email: id,
            name: id,
            image: null,
            user_role: null,
            roles: [],
          };
          userDataCache.set(id, basic);
          return basic;
        });
        setAssignees(resolved);
      } else {
        setAssignees([]);
      }
      setAssigneesLoading(false);
      return;
    }

    if (isPanelActive && selectedUserNames.length > 0 && debouncedSearchQuery.trim().length === 0) {
      if (assigneesFetchedForOpenRef.current) {
        return;
      }

      assigneesFetchedForOpenRef.current = true;
      setAssigneesLoading(true);
      dispatch(
        searchUsers({
          searchQuery: '',
          names: selectedUserNames,
          limit: selectedUserNames.length,
          updateSearchData: false, // Don't overwrite userSearch.data with assignees
          internal_only: internalOnly,
        }),
      )
        .then((result) => {
          if (searchUsers.fulfilled.match(result)) {
            const formattedAssignees = result.payload.users || [];
            // Cache assignees
            formattedAssignees.forEach((user) => {
              cacheAssigneeOptionUnderIds(user);
            });
            setAssignees(formattedAssignees);
          } else {
            setAssignees([]);
          }
          setAssigneesLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch assignees:', error);
          setAssignees([]);
          setAssigneesLoading(false);
        });
    } else {
      setAssignees([]);
      setAssigneesLoading(false);
    }
  }, [
    open,
    listOnly,
    selectedUserNames,
    debouncedSearchQuery,
    dispatch,
    internalOnly,
    hasProvidedOptions,
    fixedAssigneeOptions,
    valueIds,
  ]);

  // Fetch initial users when dropdown opens, or search when typing
  useEffect(() => {
    if (hasProvidedOptions) return;
    if (fixedAssigneeOptions !== undefined) {
      return;
    }
    if (open || listOnly) {
      const hasSearchQuery = debouncedSearchQuery.trim().length > 0;
      const names = []; // Don't pass names when searching or fetching people list

      // Clean old cache entries periodically
      cleanOldCacheEntries();

      // Check cache first (first page only)
      const cacheKey = getSearchCacheKey(debouncedSearchQuery, names, internalOnly);
      const cachedResult = searchResultsCache.get(cacheKey);

      if (isCacheValid(cachedResult)) {
        // Use cached result - manually update Redux state by dispatching fulfilled action
        // This bypasses the API call
        dispatch({
          type: 'user/searchUsers/fulfilled',
          payload: {
            searchQuery: debouncedSearchQuery || '',
            users: cachedResult.data,
            hasMore: cachedResult.hasMore ?? false,
            start: 0,
            limit: USER_PAGE_SIZE,
            append: false,
            updateSearchData: true, // Cache is for people list, so update search data
          },
        });
        return;
      }

      // Cache miss or expired - make API call
      const searchPromise = dispatch(
        searchUsers({
          searchQuery: hasSearchQuery ? debouncedSearchQuery : '',
          limit: USER_PAGE_SIZE,
          start: 0,
          append: false,
          names: [],
          internal_only: internalOnly,
        }),
      );

      // Cache the result after API call completes
      searchPromise.then((result) => {
        // Check if the action was fulfilled (not rejected)
        if (searchUsers.fulfilled.match(result)) {
          searchResultsCache.set(cacheKey, {
            data: result.payload.users || [],
            hasMore: Boolean(result.payload.hasMore),
            timestamp: Date.now(),
          });
        }
      });
    }
  }, [
    debouncedSearchQuery,
    dispatch,
    open,
    listOnly,
    internalOnly,
    hasProvidedOptions,
    fixedAssigneeOptions,
  ]);

  const handleLoadMoreUsers = useCallback(() => {
    if (hasProvidedOptions || fixedAssigneeOptions !== undefined) {
      return;
    }
    if (!(open || listOnly)) {
      return;
    }
    if (!userSearch.hasMore || userSearch.isLoadingMore || userSearch.status === 'loading') {
      return;
    }

    dispatch(
      searchUsers({
        searchQuery: debouncedSearchQuery.trim(),
        limit: USER_PAGE_SIZE,
        start: userSearch.nextStart || userSearch.data.length || 0,
        append: true,
        names: [],
        internal_only: internalOnly,
      }),
    );
  }, [
    debouncedSearchQuery,
    dispatch,
    fixedAssigneeOptions,
    hasProvidedOptions,
    internalOnly,
    listOnly,
    open,
    userSearch.data.length,
    userSearch.hasMore,
    userSearch.isLoadingMore,
    userSearch.nextStart,
    userSearch.status,
  ]);

  const handlePeopleListScroll = useCallback(
    (event) => {
      const target = event.currentTarget;
      const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (remaining < 48) {
        handleLoadMoreUsers();
      }
    },
    [handleLoadMoreUsers],
  );
  const resolveOptionById = useCallback(
    (id, extraPools = []) => {
      if (fixedAssigneeOptions) {
        const fromFixed = findAssigneeOptionInList(fixedAssigneeOptions, id);
        if (fromFixed) return fromFixed;
      }
      if (hasProvidedOptions) {
        const fromProvided = findAssigneeOptionInList(providedOptions, id);
        if (fromProvided) {
          cacheAssigneeOptionUnderIds(fromProvided);
          return fromProvided;
        }
      }

      const pools = [...extraPools, assignees, userSearch.data || [], valueOptions];
      for (const pool of pools) {
        const found = findAssigneeOptionInList(pool, id);
        if (found) {
          cacheAssigneeOptionUnderIds(found);
          return found;
        }
      }

      const cached = userDataCache.get(id);
      if (cached) return cached;

      const basic = {
        value: id,
        label: id,
        email: id,
        name: id,
        image: null,
        user_role: null,
        roles: [],
      };
      userDataCache.set(id, basic);
      return basic;
    },
    [
      assignees,
      userSearch.data,
      valueOptions,
      fixedAssigneeOptions,
      hasProvidedOptions,
      providedOptions,
    ],
  );

  // Helper to convert IDs to options (using cache when available)
  const idsToOptions = useCallback(
    (ids) => ids.map((id) => resolveOptionById(id)),
    [resolveOptionById],
  );

  // All assignees - merge API assignees with locally selected users
  const allAssignees = useMemo(() => {
    if (searchQuery.trim().length > 0) return []; // Don't show assignees section when searching

    const assigneesMap = new Map();
    const selectedIds = open || listOnly ? draftSelection : valueIds;

    // Add assignees from API
    assignees.forEach((assignee) => {
      assigneesMap.set(assignee.value, assignee);
    });

    // Add locally selected users that aren't in assignees yet
    if (selectedIds.length > 0) {
      const localSelectedOptions = idsToOptions(selectedIds);
      localSelectedOptions.forEach((opt) => {
        if (!assigneesMap.has(opt.value)) {
          assigneesMap.set(opt.value, opt);
        }
      });
    }

    return [...assigneesMap.values()];
  }, [assignees, draftSelection, valueIds, open, listOnly, searchQuery, idsToOptions]);

  // People options (from search results, initial users, or fixed sales-team list)
  const peopleOptions = useMemo(() => {
    if (hasProvidedOptions) {
      const needle = searchQuery.trim().toLowerCase();
      const selectedIds = open || listOnly ? draftSelection : valueIds;
      const filtered = needle
        ? providedOptions.filter(
            (opt) =>
              (opt.label || '').toLowerCase().includes(needle) ||
              String(opt.value || '')
                .toLowerCase()
                .includes(needle),
          )
        : providedOptions;
      if (!needle && selectedIds.length > 0) {
        return filtered.filter(
          (opt) => !optionMatchesAnySelectedId(opt, selectedIds, providedOptions),
        );
      }
      return filtered;
    }
    if (fixedAssigneeOptions !== undefined) {
      const q = searchQuery.trim().toLowerCase();
      let pool = fixedAssigneeOptions;
      if (q) {
        pool = fixedAssigneeOptions.filter((opt) => {
          const label = String(opt.label || opt.name || opt.email || '').toLowerCase();
          const val = String(opt.value || '').toLowerCase();
          return label.includes(q) || val.includes(q);
        });
      }
      const selectedIds = open || listOnly ? draftSelection : valueIds;
      if (!q && selectedIds.length > 0) {
        return pool.filter(
          (opt) => !optionMatchesAnySelectedId(opt, selectedIds, fixedAssigneeOptions),
        );
      }
      return pool;
    }

    if (!userSearch.data || userSearch.data.length === 0) return [];

    const hasSearchQuery = searchQuery.trim().length > 0;
    const selectedIds = open || listOnly ? draftSelection : valueIds;

    // Filter out selected users from people list when not searching
    if (!hasSearchQuery && selectedIds.length > 0) {
      return userSearch.data.filter(
        (opt) => !optionMatchesAnySelectedId(opt, selectedIds, userSearch.data),
      );
    }

    return userSearch.data;
  }, [
    hasProvidedOptions,
    providedOptions,
    fixedAssigneeOptions,
    userSearch.data,
    searchQuery,
    open,
    listOnly,
    draftSelection,
    valueIds,
  ]);

  const hasPanelOptions =
    allAssignees.length > 0 || peopleOptions.length > 0 || searchQuery.trim().length > 0;

  // Handle dropdown open
  const handleOpen = useCallback(() => {
    if (disabled || readonly) return;
    // Store current value when opening
    valueWhenOpenedRef.current = [...valueIds];
    // Initialize draft with current value
    setDraftSelection([...valueIds]);
    setOpen(true);
  }, [valueIds, disabled, readonly]);

  // Handle dropdown close
  const handleClose = useCallback(() => {
    setOpen(false);
    setSearchQuery('');
    setAssignees([]);

    // Compare draft with value when opened
    const openedSorted = [...valueWhenOpenedRef.current].sort().join(',');
    const draftSorted = [...draftSelection].sort().join(',');
    const hasChanged = openedSorted !== draftSorted;

    // Call onBlur if there are changes
    if (hasChanged && onBlur) {
      onBlur(draftSelection);
    }

    // Reset draft
    setDraftSelection([]);
  }, [draftSelection, onBlur]);

  const isOptionSelected = useCallback(
    (option, selectedIds) => optionMatchesAnySelectedId(option, selectedIds, userSearch.data || []),
    [userSearch.data],
  );

  // Handle toggle - update draft selection
  const handleToggle = useCallback(
    (optionOrValue, event) => {
      if (disabled || readonly) return;

      event?.stopPropagation?.();

      const option =
        optionOrValue && typeof optionOrValue === 'object'
          ? optionOrValue
          : resolveOptionById(optionOrValue);
      const optionValue = option?.value ?? optionOrValue;

      const scrollTop = listScrollRef.current?.scrollTop ?? 0;
      const isSelected = isOptionSelected(option, draftSelection);
      const newSelection = isSelected
        ? draftSelection.filter(
            (id) => !optionMatchesAnySelectedId(option, [id], userSearch.data || []),
          )
        : [...draftSelection, optionValue];

      if (!isSelected && option) {
        cacheAssigneeOptionUnderIds(option);
        setAssignees((prev) => {
          if (prev.some((item) => optionMatchesAnySelectedId(option, [item.value], prev))) {
            return prev;
          }
          return [...prev, option];
        });
      }

      setDraftSelection(newSelection);
      onChange?.(newSelection);

      requestAnimationFrame(() => {
        if (listScrollRef.current) {
          listScrollRef.current.scrollTop = scrollTop;
        }
      });
    },
    [
      draftSelection,
      onChange,
      disabled,
      readonly,
      resolveOptionById,
      isOptionSelected,
      userSearch.data,
    ],
  );

  // Handle remove assignee - remove directly from valueIds
  const handleRemoveAssignee = useCallback(
    (optionValue, e) => {
      if (disabled || readonly) return;
      e.preventDefault();
      e.stopPropagation(); // Prevent opening dropdown

      const newSelection = valueIds.filter((v) => v !== optionValue);

      // Update local state immediately
      onChange?.(newSelection);

      // Trigger onBlur to persist the change via API
      if (onBlur) {
        onBlur(newSelection);
      }
    },
    [valueIds, onChange, onBlur, disabled, readonly],
  );

  // Handle mouse down to prevent dropdown opening
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

  // Display options for trigger (always use valueOptions for display - they have full data)
  const displayOptions = valueOptions.filter((opt) => valueIds.includes(opt.value));

  useEffect(() => {
    if (!listOnly || disabled || readonly) return undefined;
    hasFocusedListOnlyInputRef.current = false;
    handleOpen();
    return () => {
      setOpen(false);
      setSearchQuery('');
      setAssignees([]);
      setDraftSelection([]);
      hasFocusedListOnlyInputRef.current = false;
    };
    // Mount/unmount only — parent remounts when popover opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listOnly]);

  const stopRowPointerEvent = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const renderAssigneeOption = (option, index) => {
    const isSelected = isOptionSelected(option, currentSelection);
    const displayName = getAssigneeDisplayName(option);
    const { user_role, roles } = option;
    const roleDisplay = user_role || (roles && roles.length > 0 ? roles[0] : null);

    return (
      <div
        key={option.value}
        data-prevent-row-click
        onMouseDown={stopRowPointerEvent}
        onClick={(event) => handleToggle(option, event)}
        className={cn(
          'group/item relative cursor-pointer select-none rounded-lg p-2 text-paragraph-sm text-text-strong-950 outline-none',
          'flex items-center gap-2',
          'transition duration-200 ease-out',
          'focus:outline-none',
          isSelected && 'bg-bg-weak-50',
        )}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            handleToggle(option, e);
          }
        }}
      >
        <CrmAccountAvatar
          name={displayName}
          initials={getAssigneeFirstNameInitial(option)}
          image={option.image || option.user_image}
          index={index}
          size={32}
        />
        <div className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate text-paragraph-sm text-text-main-900'>{displayName}</span>
          {roleDisplay ? (
            <span className='truncate text-label-xs text-text-soft-400'>{roleDisplay}</span>
          ) : option.email && option.email !== displayName ? (
            <span className='truncate text-label-xs text-text-soft-400'>{option.email}</span>
          ) : null}
        </div>
        {isSelected ? <RiCheckLine className='size-4 text-text-main-900 shrink-0' /> : null}
      </div>
    );
  };

  const isListLoading =
    (hasProvidedOptions && optionsLoading) ||
    fixedAssigneeOptionsLoading ||
    (userSearch.status === 'loading' && !userSearch.isLoadingMore) ||
    assigneesLoading;

  const assigneeSearchInput = (
    <div className='shrink-0 border-b border-stroke-soft-200 p-2'>
      <Input.Root size='small'>
        <Input.Wrapper>
          <Input.Icon as={RiSearchLine} />
          <Input.Input
            ref={(node) => {
              inputRef.current = node;
              if (listOnly && node && !hasFocusedListOnlyInputRef.current) {
                hasFocusedListOnlyInputRef.current = true;
                node.focus({ preventScroll: true });
              }
            }}
            placeholder='Search users...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete='off'
            autoCorrect='off'
            autoCapitalize='off'
            spellCheck='false'
            autoFocus={!listOnly}
          />
        </Input.Wrapper>
      </Input.Root>
    </div>
  );

  const assigneeOptionsList = (
    <div
      ref={listScrollRef}
      onScroll={handlePeopleListScroll}
      className={cn(
        'overflow-y-auto',
        listOnly ? 'min-h-0 flex-1 p-1' : 'flex max-h-[300px] flex-1 flex-col',
      )}
      style={listOnly ? { maxHeight: 260 } : undefined}
    >
      {isListLoading ? (
        <div className='flex flex-1 items-center justify-center px-4 py-8 text-center'>
          <p className='text-paragraph-sm text-text-soft-400'>
            {searchQuery.trim().length > 0 ? 'Searching...' : 'Loading users...'}
          </p>
        </div>
      ) : !hasPanelOptions ? (
        <div className='flex flex-1 items-center justify-center px-4 py-8 text-center'>
          <p className='text-paragraph-sm text-text-soft-400'>
            {searchQuery.trim().length > 0 ? 'No users found' : 'No users available'}
          </p>
        </div>
      ) : (
        <>
          {allAssignees.length > 0 && searchQuery.trim().length === 0 ? (
            <div className='px-2 pt-2'>
              <Dropdown.Label className='px-2 py-1.5'>Assignees</Dropdown.Label>
              <div className='space-y-1'>
                {allAssignees.map((option, index) => renderAssigneeOption(option, index))}
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              'flex flex-1 flex-col px-2',
              allAssignees.length > 0 && searchQuery.trim().length === 0 && 'pt-2',
            )}
          >
            {peopleOptions.length > 0 &&
            allAssignees.length > 0 &&
            searchQuery.trim().length === 0 ? (
              <Dropdown.Label className='px-2 py-1.5'>People</Dropdown.Label>
            ) : null}
            {peopleOptions.length > 0 ? (
              <div className='space-y-1'>
                {peopleOptions.map((option, index) =>
                  renderAssigneeOption(option, allAssignees.length + index),
                )}
              </div>
            ) : searchQuery.trim().length > 0 ? (
              <div className='flex flex-1 items-center justify-center px-4 py-8 text-center'>
                <p className='text-paragraph-sm text-text-soft-400'>No users found</p>
              </div>
            ) : null}
            {userSearch.isLoadingMore ? (
              <p className='px-2 py-3 text-center text-paragraph-xs text-text-soft-400'>
                Loading more...
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );

  const assigneeListPanel = (
    <>
      {assigneeSearchInput}
      {assigneeOptionsList}
    </>
  );

  if (listOnly) {
    return (
      <div
        className='flex w-[320px] min-h-[200px] max-h-[300px] flex-col overflow-hidden'
        onMouseDown={stopRowPointerEvent}
        onClick={stopRowPointerEvent}
        data-prevent-row-click
      >
        {assigneeListPanel}
      </div>
    );
  }

  return (
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
            'w-full text-left justify-start',
            disabled && 'cursor-not-allowed opacity-50',
            readonly && 'cursor-not-allowed hover:bg-transparent',
            hasError && 'ring-error-base',
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
                const displayName = getAssigneeDisplayName(opt);
                const initial = getAssigneeFirstNameInitial(opt);
                return (
                  <Tooltip.Root size='xsmall' key={opt.value || index}>
                    <Tooltip.Trigger asChild>
                      <span
                        className='inline-block ring-2 ring-white rounded-full relative group/avatar'
                        style={{ marginLeft: index === 0 ? 0 : -8, zIndex: index }}
                      >
                        <CrmAccountAvatar
                          name={displayName}
                          initials={initial}
                          image={opt.image || opt.user_image}
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
                              'absolute -top-1 -right-1 size-4 rounded-full bg-error-base text-white',
                              'flex items-center justify-center',
                              'opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200',
                              'hover:bg-error-600 focus:outline-none focus:ring-2 focus:ring-error-base focus:ring-offset-1',
                              'cursor-pointer z-10',
                            )}
                            aria-label={`Remove ${displayName}`}
                          >
                            <RiCloseLine className='size-2.5' />
                          </span>
                        )}
                      </span>
                    </Tooltip.Trigger>
                    {displayName && (
                      <Tooltip.Content size='xsmall' side='bottom'>
                        {displayName}
                      </Tooltip.Content>
                    )}
                  </Tooltip.Root>
                );
              })}
              {displayOptions.length > maxVisibleAvatars && (
                <Tooltip.Root size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <span
                      className='inline-block ring-2 ring-white rounded-full cursor-default'
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
                      .map((o) => getAssigneeDisplayName(o))
                      .join(', ')}
                  </Tooltip.Content>
                </Tooltip.Root>
              )}
            </div>
          )}
        </Button.Root>
      </Dropdown.Trigger>
      <Dropdown.Content
        className='w-[320px] p-0 gap-0 min-h-[200px] max-h-[300px] overflow-y-auto'
        align='start'
      >
        {assigneeListPanel}
      </Dropdown.Content>
    </Dropdown.Root>
  );
};

export default AssigneeMultiSelect;
