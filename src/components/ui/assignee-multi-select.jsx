import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiAddLine, RiSearchLine, RiCheckLine, RiCloseLine } from 'react-icons/ri';
import * as Dropdown from '@/components/ui/dropdown';
import * as Input from '@/components/ui/input';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { cn } from '@/lib/utils';
import { searchUsers, selectUserSearch } from '@/redux/userSlice';
import { useDebounce } from '@/hooks/use-debounce';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { upperFirst } from 'lodash';
import { getAssigneeDisplayName, getAssigneeFirstNameInitial } from '@/utils/task-utils';
import { getProjectAssigneeOptions } from '@/services/follower-scope-service';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

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

// Helper to get cache key for search
const getSearchCacheKey = (searchQuery, names, internalOnly = false) => {
  const namesKey = names && names.length > 0 ? names.sort().join(',') : 'no-names';
  return `${searchQuery || ''}::${namesKey}::${internalOnly ? 'internal' : 'all'}`;
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
  onOpen,
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
  /** When set, assignee list is limited to this project's team roles (no global user search) */
  projectId,
  /** When `options` is an array from an async source (e.g. sales team list), true while that fetch is in flight */
  optionsLoading = false,
  /** When true, only one assignee can be selected at a time */
  singleSelect = false,
  triggerAriaLabel,
  className,
  /** Extra classes for dropdown panel (e.g. z-index when nested in popovers) */
  dropdownContentClassName,
  /** When true, show avatar stack + dashed + button (open picker from + only) */
  showAddButton = false,
}) => {
  const dispatch = useDispatch();
  const userSearch = useSelector(selectUserSearch);

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignees, setAssignees] = useState([]); // Selected users fetched with names
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [projectTeamAssigneeOptions, setProjectTeamAssigneeOptions] = useState([]);
  const [projectTeamAssigneeOptionsLoading, setProjectTeamAssigneeOptionsLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setProjectTeamAssigneeOptions([]);
      setProjectTeamAssigneeOptionsLoading(false);
      return;
    }

    let cancelled = false;
    setProjectTeamAssigneeOptionsLoading(true);
    getProjectAssigneeOptions(projectId)
      .then((options) => {
        if (!cancelled) setProjectTeamAssigneeOptions(Array.isArray(options) ? options : []);
      })
      .catch((error) => {
        if (!cancelled) {
          showErrorToast(extractErrorMessage(error) || 'Failed to load project team members');
        }
      })
      .finally(() => {
        if (!cancelled) setProjectTeamAssigneeOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId || projectTeamAssigneeOptions.length === 0) return;
    projectTeamAssigneeOptions.forEach((user) => {
      if (user?.value) cacheAssigneeOptionUnderIds(user);
    });
  }, [projectId, projectTeamAssigneeOptions]);

  const resolvedFixedAssigneeOptions = projectId
    ? projectTeamAssigneeOptions
    : fixedAssigneeOptions;
  const resolvedFixedAssigneeOptionsLoading = projectId
    ? projectTeamAssigneeOptionsLoading
    : fixedAssigneeOptionsLoading;

  // Track the value when dropdown was opened
  const valueWhenOpenedRef = useRef([]);
  // Pinned assignees explicitly unselected during this open session stay in the People list if reselected
  const unpinnedDuringSessionRef = useRef(new Set());
  // Track current draft selection
  const [draftSelection, setDraftSelection] = useState([]);
  // Ref for input field to focus when dropdown opens
  const inputRef = useRef(null);
  const listScrollRef = useRef(null);
  const prevOpenRef = useRef(false);

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
          if (resolvedFixedAssigneeOptions !== undefined) {
            const match = findAssigneeOptionInList(resolvedFixedAssigneeOptions, v);
            if (match) {
              cacheAssigneeOptionUnderIds(match);
              return match;
            }
            if (projectId) {
              const basic = {
                value: v,
                label: v,
                email: v,
                name: v,
                image: null,
                user_role: null,
                roles: [],
              };
              return basic;
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
  }, [value, resolvedFixedAssigneeOptions, hasProvidedOptions, providedOptions, projectId]);

  // Current selection for display - use draft when open, valueIds when closed
  const currentSelection = open ? draftSelection : valueIds;

  // Extract selected user names/IDs for names payload (API expects user IDs/names)
  const selectedUserNames = useMemo(() => {
    if (!valueOptions || valueOptions.length === 0) return [];
    // API expects user names (which are the user IDs in Frappe)
    return valueOptions.map((opt) => opt.name || opt.value).filter(Boolean);
  }, [valueOptions]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (!open) return;
    // Delay so dropdown content is mounted and inputRef.current is set
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [open]);

  // Fetch assignees (selected users) once when dropdown opens — not on each selection change
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    const justClosed = !open && prevOpenRef.current;
    prevOpenRef.current = open;

    if (justClosed || !open) {
      setAssignees([]);
      setAssigneesLoading(false);
      return;
    }

    if (!justOpened) {
      return;
    }

    if (hasProvidedOptions) {
      setAssignees([]);
      setAssigneesLoading(false);
      return;
    }
    if (resolvedFixedAssigneeOptions !== undefined) {
      if (valueIds.length > 0 && debouncedSearchQuery.trim().length === 0) {
        const resolved = valueIds.map((id) => {
          const fromFixed = findAssigneeOptionInList(resolvedFixedAssigneeOptions, id);
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

    if (selectedUserNames.length > 0 && debouncedSearchQuery.trim().length === 0) {
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
    selectedUserNames,
    debouncedSearchQuery,
    dispatch,
    internalOnly,
    hasProvidedOptions,
    resolvedFixedAssigneeOptions,
    valueIds,
  ]);

  // Fetch initial users when dropdown opens, or search when typing
  useEffect(() => {
    if (hasProvidedOptions) return;
    if (resolvedFixedAssigneeOptions !== undefined) {
      return;
    }
    if (open) {
      const hasSearchQuery = debouncedSearchQuery.trim().length > 0;
      const names = []; // Don't pass names when searching or fetching people list

      // Clean old cache entries periodically
      cleanOldCacheEntries();

      // Check cache first
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
            updateSearchData: true, // Cache is for people list, so update search data
          },
        });
        return;
      }

      // Cache miss or expired - make API call
      const searchPromise = hasSearchQuery
        ? dispatch(
            searchUsers({
              searchQuery: debouncedSearchQuery,
              limit: 50,
              names: [], // Don't pass names when searching
              internal_only: internalOnly,
            }),
          )
        : dispatch(
            searchUsers({
              searchQuery: '',
              limit: 10,
              names: [], // Fetch general people list
              internal_only: internalOnly,
            }),
          );

      // Cache the result after API call completes
      searchPromise.then((result) => {
        // Check if the action was fulfilled (not rejected)
        if (searchUsers.fulfilled.match(result)) {
          searchResultsCache.set(cacheKey, {
            data: result.payload.users || [],
            timestamp: Date.now(),
          });
        }
      });
    }
  }, [
    debouncedSearchQuery,
    dispatch,
    open,
    internalOnly,
    hasProvidedOptions,
    resolvedFixedAssigneeOptions,
  ]);

  // Helper to convert IDs to options (using cache when available)
  const idsToOptions = useCallback(
    (ids) => {
      return ids.map((id) => {
        if (resolvedFixedAssigneeOptions !== undefined) {
          const fromFixed = findAssigneeOptionInList(resolvedFixedAssigneeOptions, id);
          if (fromFixed) return fromFixed;
          if (projectId) {
            return {
              value: id,
              label: id,
              email: id,
              name: id,
              image: null,
              user_role: null,
              roles: [],
            };
          }
        }
        if (hasProvidedOptions) {
          const fromProvided = findAssigneeOptionInList(providedOptions, id);
          if (fromProvided) {
            cacheAssigneeOptionUnderIds(fromProvided);
            return fromProvided;
          }
        }
        // Check cache first
        const cached = userDataCache.get(id);
        if (cached) {
          return cached;
        }
        // Check valueOptions for full data
        const fromValue = valueOptions.find(
          (opt) =>
            String(opt?.value ?? '') === String(id) ||
            String(opt?.email ?? '').toLowerCase() === String(id).toLowerCase(),
        );
        if (fromValue) {
          return fromValue;
        }
        // Create basic option and cache it
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
    },
    [valueOptions, resolvedFixedAssigneeOptions, hasProvidedOptions, providedOptions, projectId],
  );

  // All assignees - while open, only users selected before this session (pinned at top).
  // Newly selected users stay in the People list with a checkmark until the dropdown reopens.
  const pinnedAssigneeIds = useMemo(() => {
    if (!open) return valueIds;
    return valueWhenOpenedRef.current.filter(
      (id) => draftSelection.includes(id) && !unpinnedDuringSessionRef.current.has(String(id)),
    );
  }, [open, draftSelection, valueIds]);

  const allAssignees = useMemo(() => {
    if (searchQuery.trim().length > 0) return []; // Don't show assignees section when searching

    const assigneesMap = new Map();
    const idsForSection = pinnedAssigneeIds;

    // Add assignees from API (fetched for selections that existed when dropdown opened)
    assignees.forEach((assignee) => {
      if (
        idsForSection.length === 0 ||
        idsForSection.some((id) => String(id) === String(assignee.value))
      ) {
        assigneesMap.set(assignee.value, assignee);
      }
    });

    // Add pinned selected users that aren't in assignees yet
    if (idsForSection.length > 0) {
      const localSelectedOptions = idsToOptions(idsForSection);
      localSelectedOptions.forEach((opt) => {
        if (!assigneesMap.has(opt.value)) {
          assigneesMap.set(opt.value, opt);
        }
      });
    }

    return [...assigneesMap.values()];
  }, [assignees, pinnedAssigneeIds, searchQuery, idsToOptions]);

  // People options (from search results, initial users, or fixed sales-team list)
  const peopleOptions = useMemo(() => {
    const selectedIds = open ? draftSelection : valueIds;
    // While open, only hide pinned assignees (selected at open). New picks stay in list with a checkmark.
    const idsToHideFromPeople =
      open && !singleSelect
        ? pinnedAssigneeIds
        : selectedIds.length > 0 && !singleSelect
          ? selectedIds
          : [];

    if (hasProvidedOptions) {
      const needle = searchQuery.trim().toLowerCase();
      const filtered = needle
        ? providedOptions.filter(
            (opt) =>
              (opt.label || '').toLowerCase().includes(needle) ||
              String(opt.value || '')
                .toLowerCase()
                .includes(needle),
          )
        : providedOptions;
      if (!needle && idsToHideFromPeople.length > 0) {
        return filtered.filter(
          (opt) => !optionMatchesAnySelectedId(opt, idsToHideFromPeople, providedOptions),
        );
      }
      return filtered;
    }
    if (resolvedFixedAssigneeOptions !== undefined) {
      const q = searchQuery.trim().toLowerCase();
      let pool = resolvedFixedAssigneeOptions;
      if (q) {
        pool = resolvedFixedAssigneeOptions.filter((opt) => {
          const label = String(opt.label || opt.name || opt.email || '').toLowerCase();
          const val = String(opt.value || '').toLowerCase();
          const role = String(
            opt.user_role || opt.role || (Array.isArray(opt.roles) ? opt.roles.join(' ') : ''),
          ).toLowerCase();
          return label.includes(q) || val.includes(q) || role.includes(q);
        });
      }
      if (!q && idsToHideFromPeople.length > 0) {
        return pool.filter(
          (opt) =>
            !optionMatchesAnySelectedId(opt, idsToHideFromPeople, resolvedFixedAssigneeOptions),
        );
      }
      return pool;
    }

    if (!userSearch.data || userSearch.data.length === 0) return [];

    const hasSearchQuery = searchQuery.trim().length > 0;

    if (!hasSearchQuery && idsToHideFromPeople.length > 0) {
      return userSearch.data.filter(
        (opt) => !optionMatchesAnySelectedId(opt, idsToHideFromPeople, userSearch.data),
      );
    }

    return userSearch.data;
  }, [
    hasProvidedOptions,
    providedOptions,
    resolvedFixedAssigneeOptions,
    userSearch.data,
    searchQuery,
    open,
    draftSelection,
    valueIds,
    singleSelect,
    pinnedAssigneeIds,
  ]);

  // Handle dropdown open
  const handleOpen = useCallback(() => {
    if (disabled || readonly) return;
    onOpen?.();
    // Store current value when opening
    valueWhenOpenedRef.current = [...valueIds];
    unpinnedDuringSessionRef.current = new Set();
    // Initialize draft with current value
    setDraftSelection([...valueIds]);
    setOpen(true);
  }, [valueIds, disabled, readonly, onOpen]);

  // Handle dropdown close
  const handleClose = useCallback(() => {
    setOpen(false);
    setSearchQuery('');
    setAssignees([]);
    unpinnedDuringSessionRef.current = new Set();

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

  // Handle toggle - update draft selection
  const handleToggle = useCallback(
    (optionValue) => {
      if (disabled || readonly) return;

      const fullOption =
        peopleOptions.find((o) => o.value === optionValue) ||
        allAssignees.find((o) => o.value === optionValue) ||
        userSearch.data?.find((o) => o.value === optionValue);
      if (fullOption) cacheAssigneeOptionUnderIds(fullOption);

      const scrollTop = listScrollRef.current?.scrollTop ?? 0;

      if (singleSelect) {
        const isSelected = draftSelection.includes(optionValue);
        const newSelection = isSelected ? [] : [optionValue];
        setDraftSelection(newSelection);
        onChange?.(newSelection);
        // Persist on select — handleClose runs before draftSelection state updates.
        onBlur?.(newSelection);
        setOpen(false);
        setSearchQuery('');
        return;
      }

      const isSelected = draftSelection.includes(optionValue);
      const newSelection = isSelected
        ? draftSelection.filter((v) => v !== optionValue)
        : [...draftSelection, optionValue];

      if (
        isSelected &&
        valueWhenOpenedRef.current.some((id) => String(id) === String(optionValue))
      ) {
        unpinnedDuringSessionRef.current.add(String(optionValue));
      }

      setDraftSelection(newSelection);
      // Call onChange for optimistic UI update
      onChange?.(newSelection);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (listScrollRef.current) {
            listScrollRef.current.scrollTop = scrollTop;
          }
        });
      });
    },
    [
      draftSelection,
      onChange,
      onBlur,
      disabled,
      readonly,
      singleSelect,
      peopleOptions,
      allAssignees,
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

  // Display options for trigger — keep every resolved value entry (option.value may
  // differ from the raw id when matched via email/name).
  const displayOptions = valueOptions.filter((opt) => {
    if (!opt) return false;
    const optIds = [opt.value, opt.email, opt.name, opt.user].filter(Boolean).map(String);
    return valueIds.some((id) => {
      const s = String(id);
      const lower = s.toLowerCase();
      return optIds.some((oid) => oid === s || oid.toLowerCase() === lower);
    });
  });
  const visibleAvatarCount = singleSelect ? 1 : maxVisibleAvatars;

  const selectedAvatars = (
    <div className='flex items-center'>
      {displayOptions.slice(0, visibleAvatarCount).map((opt, index) => {
        const displayName = getAssigneeDisplayName(opt);
        const initial = getAssigneeFirstNameInitial(opt);
        return (
          <Tooltip.Root size='xsmall' key={opt.value || index}>
            <Tooltip.Trigger asChild>
              <span
                className='relative inline-block rounded-full ring-2 ring-white group/avatar'
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
                      'absolute -top-1 -right-1 z-10 flex size-4 cursor-pointer items-center justify-center rounded-full bg-error-base text-white',
                      'opacity-0 transition-opacity duration-200 group-hover/avatar:opacity-100',
                      'hover:bg-error-600 focus:outline-none focus:ring-2 focus:ring-error-base focus:ring-offset-1',
                    )}
                    aria-label={`Remove ${displayName}`}
                  >
                    <RiCloseLine className='size-2.5' />
                  </span>
                )}
              </span>
            </Tooltip.Trigger>
            {displayName ? (
              <Tooltip.Content size='xsmall' side='bottom'>
                {displayName}
              </Tooltip.Content>
            ) : null}
          </Tooltip.Root>
        );
      })}
      {displayOptions.length > visibleAvatarCount ? (
        <Tooltip.Root size='xsmall'>
          <Tooltip.Trigger asChild>
            <span
              className='inline-block cursor-default rounded-full ring-2 ring-white'
              style={{ marginLeft: -8, zIndex: visibleAvatarCount }}
            >
              <CrmAccountAvatar
                name={`+${displayOptions.length - visibleAvatarCount}`}
                initials={`+${displayOptions.length - visibleAvatarCount}`}
                variant='weak'
                size={24}
                showNativeTitle={false}
              />
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content side='bottom' className='max-w-[220px]'>
            {displayOptions
              .slice(visibleAvatarCount)
              .map((option) => getAssigneeDisplayName(option))
              .join(', ')}
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
    </div>
  );

  return (
    <Dropdown.Root open={open} onOpenChange={(isOpen) => (isOpen ? handleOpen() : handleClose())}>
      {showAddButton ? (
        <div className='flex items-center gap-1.5'>
          {displayOptions.length > 0 ? selectedAvatars : null}
          <Tooltip.Root size='xsmall' variant='dark'>
            <Tooltip.Trigger asChild>
              <span className='inline-flex'>
                <Dropdown.Trigger asChild>
                  <button
                    type='button'
                    disabled={disabled || readonly}
                    aria-label={triggerAriaLabel || 'Add member'}
                    className={cn(
                      'inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-stroke-soft-200 text-text-soft-400 transition',
                      'hover:border-stroke-sub-300 hover:bg-bg-weak-50 hover:text-text-sub-600',
                      'disabled:pointer-events-none disabled:opacity-50',
                      open && 'border-stroke-sub-300 bg-bg-weak-50 text-text-sub-600',
                    )}
                  >
                    <RiAddLine className='size-4' />
                  </button>
                </Dropdown.Trigger>
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content side='left' className='z-[70]'>
              Add Member
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      ) : (
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
            aria-label={triggerAriaLabel}
            className={cn(
              'w-full justify-start text-left',
              disabled && 'cursor-not-allowed opacity-50',
              readonly && 'cursor-not-allowed hover:bg-transparent',
              hasError && 'ring-error-base',
              className,
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
              selectedAvatars
            )}
          </Button.Root>
        </Dropdown.Trigger>
      )}
      <Dropdown.Content
        className={cn(
          'max-h-[300px] min-h-[200px] w-[320px] gap-0 overflow-y-auto p-0',
          dropdownContentClassName,
        )}
        align={showAddButton ? 'end' : 'start'}
        side='bottom'
        sideOffset={showAddButton ? 6 : 8}
        data-project-members-nested={showAddButton ? 'true' : undefined}
      >
        <div className='p-2 border-b border-stroke-soft-200'>
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
        <div
          ref={listScrollRef}
          className='flex flex-col h-full flex-1 max-h-[300px] overflow-y-auto'
        >
          {(hasProvidedOptions && optionsLoading) ||
          resolvedFixedAssigneeOptionsLoading ||
          userSearch.status === 'loading' ||
          assigneesLoading ? (
            <div className='flex-1 flex items-center justify-center px-4 py-8 text-center grow'>
              <p className='text-paragraph-sm text-text-soft-400'>
                {searchQuery.trim().length > 0 ? 'Searching...' : 'Loading users...'}
              </p>
            </div>
          ) : (
            <>
              {/* Assignees Section */}
              {allAssignees.length > 0 && searchQuery.trim().length === 0 && (
                <div className='px-2 pt-2'>
                  <Dropdown.Label className='px-2 py-1.5'>Assignees</Dropdown.Label>
                  <div className='space-y-1'>
                    {allAssignees.map((option) => {
                      const isSelected = currentSelection.includes(option.value);
                      const displayName = getAssigneeDisplayName(option);
                      const { user_role } = option;
                      return (
                        <div
                          key={option.value}
                          onClick={() => handleToggle(option.value)}
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
                              handleToggle(option.value);
                            }
                          }}
                        >
                          <CrmAccountAvatar
                            name={displayName}
                            initials={getAssigneeFirstNameInitial(option)}
                            image={option.image || option.user_image}
                            index={allAssignees.indexOf(option)}
                            size={32}
                          />
                          <div className='flex flex-col flex-1'>
                            <span className='text-paragraph-sm text-text-main-900'>
                              {displayName}
                            </span>
                            {user_role && (
                              <span className='text-label-xs text-text-soft-400'>{user_role}</span>
                            )}
                          </div>
                          {isSelected && (
                            <RiCheckLine className='size-4 text-text-main-900 shrink-0' />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* People Section */}
              <div
                className={cn(
                  'px-2 flex flex-1 grow flex-col',
                  allAssignees.length > 0 && searchQuery.trim().length === 0 && 'pt-2',
                )}
              >
                {peopleOptions.length > 0 &&
                  allAssignees.length > 0 &&
                  searchQuery.trim().length === 0 && (
                    <Dropdown.Label className='px-2 py-1.5'>People</Dropdown.Label>
                  )}
                {peopleOptions.length === 0 ? (
                  searchQuery.trim().length > 0 ? (
                    <div className='flex-1 flex items-center justify-center px-4 py-8 text-center grow'>
                      <p className='text-paragraph-sm text-text-soft-400'>No users found</p>
                    </div>
                  ) : allAssignees.length === 0 ? (
                    <div className='flex-1 flex items-center justify-center px-4 py-8 text-center grow'>
                      <p className='text-paragraph-sm text-text-soft-400'>No users available</p>
                    </div>
                  ) : null
                ) : (
                  <div className='space-y-1'>
                    {peopleOptions.map((option) => {
                      const isSelected = currentSelection.includes(option.value);
                      const displayName = getAssigneeDisplayName(option);
                      const { user_role, roles } = option;
                      // Prefer user_role over roles array
                      const roleDisplay =
                        user_role || (roles && roles.length > 0 ? roles[0] : null);
                      return (
                        <div
                          key={option.value}
                          onClick={() => handleToggle(option.value)}
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
                              handleToggle(option.value);
                            }
                          }}
                        >
                          <CrmAccountAvatar
                            name={displayName}
                            initials={getAssigneeFirstNameInitial(option)}
                            image={option.image || option.user_image}
                            index={peopleOptions.indexOf(option)}
                            size={32}
                          />
                          <div className='flex flex-col flex-1'>
                            <span className='text-paragraph-sm text-text-main-900'>
                              {displayName}
                            </span>
                            {roleDisplay && (
                              <span className='text-label-xs text-text-soft-400'>
                                {roleDisplay}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <RiCheckLine className='size-4 text-text-main-900 shrink-0' />
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
  );
};

export default AssigneeMultiSelect;
