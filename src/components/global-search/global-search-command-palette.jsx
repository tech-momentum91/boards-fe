import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { RiSearchLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { buildTopLevelNavigationItems } from '@/utils/sidebarPerm';
import GlobalSearchResultsList from '@/components/global-search/global-search-results-list';
import { clearGlobalSearchResults } from '@/redux/globalSearchSlice';
import { selectGlobalSearchOpen, setGlobalSearchOpen, toggleGlobalSearch } from '@/redux/uiSlice';
import { cn } from '@/utils/cn';

const QUICK_NAV_COLUMNS = 2;

const getNextQuickNavIndex = (currentIndex, key, itemCount, columns = QUICK_NAV_COLUMNS) => {
  if (itemCount <= 0) {
    return 0;
  }
  const clamped = Math.min(Math.max(currentIndex, 0), itemCount - 1);
  const row = Math.floor(clamped / columns);

  switch (key) {
    case 'ArrowRight': {
      const next = clamped + 1;
      return next < itemCount && Math.floor(next / columns) === row ? next : clamped;
    }
    case 'ArrowLeft': {
      const next = clamped - 1;
      return next >= 0 && Math.floor(next / columns) === row ? next : clamped;
    }
    case 'ArrowDown': {
      const next = clamped + columns;
      return next < itemCount ? next : clamped;
    }
    case 'ArrowUp': {
      const next = clamped - columns;
      return next >= 0 ? next : clamped;
    }
    default:
      return clamped;
  }
};

const GlobalSearchCommandPalette = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const inputReference = useRef(null);
  const open = useSelector(selectGlobalSearchOpen);
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isBoardsRoute = location.pathname.startsWith('/boards');

  const { query, setQuery, results, isLoading, canSearch, recent, addRecentSearch } =
    useGlobalSearch({
      limit: 200,
    });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (location.pathname.startsWith('/boards')) {
        return;
      }

      const isSearchShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.shiftKey;
      if (!isSearchShortcut) {
        return;
      }

      event.preventDefault();
      dispatch(toggleGlobalSearch());
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch, location.pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTimeout(() => {
      inputReference.current?.focus();
    }, 0);
  }, [open]);

  const topLevelNavigation = useMemo(
    () => buildTopLevelNavigationItems(userSideBarPerm),
    [userSideBarPerm],
  );

  const searchHasSelectableResults = query.trim().length > 0 && canSearch && results.length > 0;

  const quickNavItemsForKeyboard = useMemo(() => {
    if (query.trim().length > 0 || searchHasSelectableResults) {
      return [];
    }
    return topLevelNavigation;
  }, [query, searchHasSelectableResults, topLevelNavigation]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results.length, searchHasSelectableResults, quickNavItemsForKeyboard.length]);

  const resetPaletteState = () => {
    setQuery('');
    setSelectedIndex(0);
    dispatch(clearGlobalSearchResults());
  };

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) {
      resetPaletteState();
    } else {
      resetPaletteState();
    }
    dispatch(setGlobalSearchOpen(nextOpen));
  };

  const handleSelect = (result) => {
    if (!result?.route) {
      return;
    }
    addRecentSearch(query);
    dispatch(setGlobalSearchOpen(false));
    resetPaletteState();
    navigate(result.route);
  };

  const handleQuickNavigate = (route) => {
    if (!route) {
      return;
    }
    dispatch(setGlobalSearchOpen(false));
    resetPaletteState();
    navigate(route);
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Escape') {
      handleOpenChange(false);
      return;
    }

    if (searchHasSelectableResults) {
      if (event.key === 'ArrowDown' && results.length > 0) {
        event.preventDefault();
        setSelectedIndex((current) => Math.min(current + 1, results.length - 1));
        return;
      }

      if (event.key === 'ArrowUp' && results.length > 0) {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === 'Enter' && results.length > 0) {
        event.preventDefault();
        handleSelect(results[selectedIndex] || results[0]);
      }
      return;
    }

    const quickCount = quickNavItemsForKeyboard.length;
    const arrowKeys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
    if (quickCount > 0 && arrowKeys.includes(event.key)) {
      event.preventDefault();
      setSelectedIndex((current) =>
        getNextQuickNavIndex(current, event.key, quickCount, QUICK_NAV_COLUMNS),
      );
      return;
    }

    if (quickCount > 0 && event.key === 'Enter') {
      event.preventDefault();
      const item = quickNavItemsForKeyboard[selectedIndex] || quickNavItemsForKeyboard[0];
      if (item?.route) {
        handleQuickNavigate(item.route);
      }
    }
  };

  return (
    <Modal.Root open={open && !isBoardsRoute} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[760px] overflow-hidden p-0' showClose={false}>
        <div className='border-b border-stroke-soft-200 px-4 pt-4 pb-3'>
          <Input.Root>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                ref={inputReference}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder='Search anything'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        {query.trim().length === 0 ? (
          <div className='p-4'>
            {topLevelNavigation.length > 0 && (
              <>
                <div className='mb-2 text-label-xs text-text-sub-600'>Quick navigation</div>
                <div className='mb-4 grid grid-cols-2 gap-2'>
                  {topLevelNavigation.map((item, index) => (
                    <button
                      key={item.id}
                      type='button'
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => handleQuickNavigate(item.route)}
                      className={cn(
                        'flex items-center gap-2 rounded-md border border-stroke-soft-200 px-2.5 py-2 text-left text-paragraph-xs text-text-sub-600 transition-colors hover:bg-bg-weak-50',
                        quickNavItemsForKeyboard.length > 0 &&
                          selectedIndex === index &&
                          'bg-bg-weak-50',
                      )}
                    >
                      <span className='shrink-0 text-text-soft-400'>
                        {item.icon || <RiSearchLine />}
                      </span>
                      <span className='truncate'>{item.title}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className='mb-2 text-label-xs text-text-sub-600'>Recent searches</div>
            {recent.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {recent.map((item) => (
                  <button
                    key={item}
                    type='button'
                    className='rounded-md border border-stroke-soft-200 px-2 py-1 text-paragraph-xs text-text-sub-600 hover:bg-bg-weak-50'
                    onClick={() => setQuery(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : (
              <div className='text-paragraph-sm text-text-soft-400'>
                Use Ctrl/Cmd + K to open this palette anytime.
              </div>
            )}
          </div>
        ) : (
          <>
            <GlobalSearchResultsList
              results={results}
              isLoading={isLoading}
              canSearch={canSearch}
              query={query}
              selectedIndex={selectedIndex}
              onSelectIndex={setSelectedIndex}
              onSelectResult={handleSelect}
              grouped
            />
          </>
        )}
      </Modal.Content>
    </Modal.Root>
  );
};

export default GlobalSearchCommandPalette;
