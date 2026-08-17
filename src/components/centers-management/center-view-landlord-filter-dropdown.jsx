import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowRightSLine } from 'react-icons/ri';
import { State, City } from 'country-state-city';

import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import { ENGAGEMENT_MODE_OPTIONS } from '@/components/landlords-management/constants';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

const getStateIsoCode = (stateName) => {
  if (!stateName) return '';
  const states = State.getStatesOfCountry('IN');
  const needle = norm(stateName);
  const state = states.find((s) => norm(s.name) === needle);
  return state?.isoCode || '';
};

/** Primary address doc from Landlord (Frappe: address[] or custom_addresses[]). */
function pickPrimaryAddress(lm) {
  const addr = lm?.address;
  if (addr && typeof addr === 'object' && !Array.isArray(addr)) {
    return addr;
  }
  const lists = [lm?.address, lm?.custom_addresses].filter(Boolean);
  for (const list of lists) {
    if (!Array.isArray(list) || list.length === 0) continue;
    const doc = list.find((a) => a?.is_primary) || list[0];
    if (doc) return doc;
  }
  return null;
}

function normalizeTagsFromUnknown(tags) {
  if (tags == null || tags === '') return [];
  if (Array.isArray(tags)) {
    return tags
      .map((t) => (t != null && typeof t === 'object' ? t.tag || t.name : t))
      .map((t) => String(t).trim())
      .filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

/** Merge tags from `tags`, Frappe `_user_tags`, etc. */
function mergeLandlordTags(lm, row) {
  const seen = new Set();
  const out = [];
  const sources = [lm?.tags, lm?._user_tags, row?.tags, row?._user_tags];
  for (const src of sources) {
    for (const t of normalizeTagsFromUnknown(src)) {
      const k = norm(t);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(t.trim());
    }
  }
  return out;
}

/** Normalize landlord row from center details API (nested landlord_master). */
export function extractLandlordRowFields(row) {
  const lm = row?.landlord_master || row || {};
  const addr = pickPrimaryAddress(lm);

  const stateRaw = lm.state ?? addr?.state ?? row?.state ?? '';
  const cityRaw = lm.city ?? addr?.city ?? row?.city ?? '';

  const normalizeCenters = (c) => {
    if (c == null || c === '') return [];
    if (Array.isArray(c)) return c.map((x) => String(x).trim()).filter(Boolean);
    if (typeof c === 'string') {
      return c
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    }
    return [];
  };
  return {
    state: String(stateRaw).trim(),
    city: String(cityRaw).trim(),
    engagement_mode: String(lm.engagement_mode || row.engagement_mode || '').trim(),
    tags: mergeLandlordTags(lm, row),
    block_floor: String(lm.block_floor || row.block_floor || '').trim(),
    centers: normalizeCenters(lm.center ?? row.center),
  };
}

export const DEFAULT_LANDLORD_VIEW_FILTERS = {
  center: [],
  centerSource: 'page',
  state: [],
  city: [],
  engagement_mode: [],
  tags: [],
  block_floor: [],
};

/** Only keys that differ from defaults — for compact sessionStorage payloads */
export function compactLandlordViewFiltersForStorage(filters) {
  return compactFiltersForSessionStorage(filters, DEFAULT_LANDLORD_VIEW_FILTERS, {
    scalarDiffKeys: ['centerSource'],
  });
}

/** Restore full filter shape after loading a compact stored object */
export function mergeStoredLandlordViewFilters(stored) {
  const merged = {
    ...DEFAULT_LANDLORD_VIEW_FILTERS,
    ...(stored && typeof stored === 'object' ? stored : {}),
  };
  return {
    ...merged,
    center: Array.isArray(merged.center) ? merged.center : [],
    centerSource: merged.centerSource === 'global' ? 'global' : 'page',
    state: Array.isArray(merged.state) ? merged.state : [],
    city: Array.isArray(merged.city) ? merged.city : [],
    engagement_mode: Array.isArray(merged.engagement_mode) ? merged.engagement_mode : [],
    tags: Array.isArray(merged.tags) ? merged.tags : [],
    block_floor: Array.isArray(merged.block_floor) ? merged.block_floor : [],
  };
}

/**
 * Client-side match for center landlord table rows.
 * @param {object} row — item from centerDetails.landlords
 * @param {object} filters — same shape as DEFAULT_LANDLORD_VIEW_FILTERS
 * @param {{ id: string, displayName: string }} currentCenter — current center id + display name for rows without center set
 */
export function landlordRowMatchesFilters(row, filters, currentCenter) {
  if (!filters) return true;
  const lm = extractLandlordRowFields(row);
  const curId = currentCenter?.id || '';
  const curDisplay = currentCenter?.displayName || '';

  if (Array.isArray(filters.center) && filters.center.length > 0) {
    const rowCenters = lm.centers.length > 0 ? lm.centers : [curDisplay, curId].filter(Boolean);
    const selected = new Set(filters.center.map((c) => norm(c)));
    const match = rowCenters.some((c) => selected.has(norm(c)));
    if (!match) return false;
  }

  if (Array.isArray(filters.state) && filters.state.length > 0) {
    const rowState = norm(lm.state);
    const stateOk = filters.state.some((s) => norm(s) === rowState);
    if (!stateOk) return false;
  }
  if (Array.isArray(filters.city) && filters.city.length > 0) {
    const rowCity = norm(lm.city);
    const cityOk = filters.city.some((c) => norm(c) === rowCity);
    if (!cityOk) return false;
  }
  if (Array.isArray(filters.engagement_mode) && filters.engagement_mode.length > 0) {
    const rowEm = norm(lm.engagement_mode);
    const emOk = filters.engagement_mode.some((e) => norm(e) === rowEm);
    if (!emOk) return false;
  }
  if (Array.isArray(filters.tags) && filters.tags.length > 0) {
    const hit = filters.tags.some((t) =>
      lm.tags.some((rt) => norm(rt) === norm(t) || norm(rt).includes(norm(t))),
    );
    if (!hit) return false;
  }
  if (
    Array.isArray(filters.block_floor) &&
    filters.block_floor.length > 0 &&
    (!lm.block_floor || !filters.block_floor.includes(lm.block_floor))
  ) {
    return false;
  }
  return true;
}

const CenterViewLandlordFilterDropdown = React.forwardRef(
  ({ setFilterCount, open, onFiltersChange, appliedFilters = {}, pageLandlords = [] }, ref) => {
    const dispatch = useDispatch();
    const centerAccess = useSelector(selectCenterAccess);

    const [activeTab, setActiveTab] = useState('state');
    const [localFilters, setLocalFilters] = useState(() => ({
      ...DEFAULT_LANDLORD_VIEW_FILTERS,
      ...appliedFilters,
    }));
    const [searchText, setSearchText] = useState('');
    const popoverRef = useRef(null);

    useEffect(() => {
      if (centerAccess.status === 'idle') {
        dispatch(fetchCenterAccess());
      }
    }, [centerAccess.status, dispatch]);

    useEffect(() => {
      setLocalFilters({
        ...DEFAULT_LANDLORD_VIEW_FILTERS,
        ...appliedFilters,
        center: Array.isArray(appliedFilters.center) ? appliedFilters.center : [],
        centerSource: appliedFilters.centerSource === 'global' ? 'global' : 'page',
        state: Array.isArray(appliedFilters.state) ? appliedFilters.state : [],
        city: Array.isArray(appliedFilters.city) ? appliedFilters.city : [],
        engagement_mode: Array.isArray(appliedFilters.engagement_mode)
          ? appliedFilters.engagement_mode
          : [],
        tags: Array.isArray(appliedFilters.tags) ? appliedFilters.tags : [],
        block_floor: Array.isArray(appliedFilters.block_floor) ? appliedFilters.block_floor : [],
      });
    }, [appliedFilters]);

    useEffect(() => {
      setFilterCount(
        // localFilters.center.length +
        localFilters.state.length +
          localFilters.city.length +
          localFilters.engagement_mode.length +
          localFilters.tags.length +
          localFilters.block_floor.length,
      );
    }, [
      // localFilters.center.length,
      localFilters.state.length,
      localFilters.city.length,
      localFilters.engagement_mode.length,
      localFilters.tags.length,
      localFilters.block_floor.length,
      setFilterCount,
    ]);

    useEffect(() => {
      setSearchText('');
    }, [activeTab]);

    const verticalTabs = useMemo(
      () => [
        // { value: 'center', label: 'Centre' },
        { value: 'state', label: 'State' },
        { value: 'city', label: 'City' },
        { value: 'engagement_mode', label: 'Eng mode' },
        { value: 'tags', label: 'Tags' },
        { value: 'block_floor', label: 'Blocks/Floors' },
      ],
      [],
    );

    const stateOptions = useMemo(() => {
      const allIndianStates = State.getStatesOfCountry('IN');
      return allIndianStates
        .map((s) => ({ value: s.name, label: s.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, []);

    const cityOptions = useMemo(() => {
      if (!localFilters.state?.length) return [];
      const allCities = new Set();
      localFilters.state.forEach((stateName) => {
        const iso = getStateIsoCode(stateName);
        if (iso) {
          City.getCitiesOfState('IN', iso).forEach((city) => allCities.add(city.name));
        }
      });
      return [...allCities]
        .map((city) => ({ value: city, label: city }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, [localFilters.state]);

    const engagementOptions = useMemo(() => ENGAGEMENT_MODE_OPTIONS, []);

    const [accumulatedTags, setAccumulatedTags] = useState(new Set());
    const [accumulatedBlocks, setAccumulatedBlocks] = useState(new Set());

    useEffect(() => {
      setAccumulatedTags((prev) => {
        const next = new Set(prev);
        let changed = false;
        (pageLandlords || []).forEach((row) => {
          extractLandlordRowFields(row).tags.forEach((t) => {
            if (!next.has(t)) {
              next.add(t);
              changed = true;
            }
          });
        });
        return changed ? next : prev;
      });

      setAccumulatedBlocks((prev) => {
        const next = new Set(prev);
        let changed = false;
        (pageLandlords || []).forEach((row) => {
          const bf = extractLandlordRowFields(row).block_floor;
          if (bf && !next.has(bf)) {
            next.add(bf);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, [pageLandlords]);

    const tagsOptions = useMemo(() => {
      return [...accumulatedTags]
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v }));
    }, [accumulatedTags]);

    const blockFloorOptions = useMemo(() => {
      return [...accumulatedBlocks]
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v }));
    }, [accumulatedBlocks]);

    // const centerListOptions = useMemo(() => {
    //   return localFilters.centerSource === 'global' ? centresFromGlobal : centresFromPage;
    // }, [localFilters.centerSource, centresFromGlobal, centresFromPage]);

    const currentOptions = useMemo(() => {
      let options = [];
      switch (activeTab) {
        // case 'center':
        //   options = centerListOptions;
        //   break;
        case 'state':
          options = stateOptions;
          break;
        case 'city':
          options = localFilters.state?.length ? cityOptions : [];
          break;
        case 'engagement_mode':
          options = engagementOptions;
          break;
        case 'tags':
          options = tagsOptions;
          break;
        case 'block_floor':
          options = blockFloorOptions;
          break;
        default:
          options = [];
      }
      if (!searchText.trim()) return options;
      const q = searchText.toLowerCase().trim();
      return options.filter(
        (opt) =>
          String(opt.label).toLowerCase().includes(q) ||
          String(opt.value).toLowerCase().includes(q),
      );
    }, [
      activeTab,
      // centerListOptions,
      stateOptions,
      cityOptions,
      engagementOptions,
      tagsOptions,
      blockFloorOptions,
      localFilters.state,
      searchText,
    ]);

    const listEmptyMessage = useMemo(() => {
      if (activeTab === 'city' && (!localFilters.state || localFilters.state.length === 0)) {
        return 'Select state first';
      }
      if (activeTab === 'engagement_mode' || activeTab === 'tags' || activeTab === 'block_floor') {
        return 'No values on this page';
      }
      // if (activeTab === 'center') {
      //   return 'No centres found';
      // }
      return 'No results';
    }, [activeTab, localFilters.state]);

    const toggleKey = (key, value) => {
      setLocalFilters((prev) => {
        const arr = Array.isArray(prev[key]) ? [...prev[key]] : [];
        const i = arr.indexOf(value);
        if (i >= 0) arr.splice(i, 1);
        else arr.push(value);
        return { ...prev, [key]: arr };
      });
    };

    const handleStateToggle = (value) => {
      setLocalFilters((prev) => {
        const currentStates = Array.isArray(prev.state) ? [...prev.state] : [];
        const isSelected = currentStates.includes(value);
        const newStates = isSelected
          ? currentStates.filter((s) => s !== value)
          : [...currentStates, value];
        return { ...prev, state: newStates, city: [] };
      });
    };

    const handleClear = () => {
      setLocalFilters({ ...DEFAULT_LANDLORD_VIEW_FILTERS });
      setSearchText('');
    };

    const handlePopoverClose = useCallback(() => {
      onFiltersChange?.(localFilters);
    }, [localFilters, onFiltersChange]);

    const previousOpenRef = useRef(open);
    useEffect(() => {
      if (previousOpenRef.current && !open) {
        handlePopoverClose();
      }
      previousOpenRef.current = open;
    }, [open, handlePopoverClose]);

    useImperativeHandle(ref, () => ({
      handleClose: handlePopoverClose,
    }));

    const onToggle = useCallback(
      (value) => {
        if (activeTab === 'state') handleStateToggle(value);
        else toggleKey(activeTab, value);
      },
      [activeTab],
    );

    if (!open) return null;

    return (
      <Filter.Root
        ref={popoverRef}
        onInteractOutside={handlePopoverClose}
        onEscapeKeyDown={handlePopoverClose}
      >
        <Filter.Header title='FILTERS' onClear={handleClear} />
        <Filter.Body>
          <Filter.Sidebar width='180px'>
            <TabMenuVertical.Root value={activeTab} onValueChange={setActiveTab}>
              <TabMenuVertical.List className='p-2 border-r-0'>
                {verticalTabs.map((item) => {
                  const key = item.value;
                  const arr = localFilters[key];
                  const len = Array.isArray(arr) ? arr.length : 0;
                  const showCount = len > 0;

                  return (
                    <TabMenuVertical.Trigger
                      className='w-full flex items-center justify-between'
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                      {showCount ? (
                        <Badge.Root
                          size='medium'
                          variant='filled'
                          className='shrink-0 rounded-full bg-black'
                        >
                          {len}
                        </Badge.Root>
                      ) : (
                        <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                      )}
                    </TabMenuVertical.Trigger>
                  );
                })}
              </TabMenuVertical.List>
            </TabMenuVertical.Root>
          </Filter.Sidebar>

          <Filter.Content width='300px' className='flex flex-col min-h-0'>
            {/* {activeTab === 'center' && (
              <div className='shrink-0 border-b border-stroke-soft-200 px-3 py-2'>
                <p className='text-label-xs text-text-sub-500 mb-1.5'>Centre list source</p>
                <div className='flex gap-1 rounded-lg bg-bg-weak-50 p-0.5'>
                  <button
                    type='button'
                    className={cn(
                      'flex-1 rounded-md py-1.5 text-label-sm transition-colors',
                      localFilters.centerSource === 'page'
                        ? 'bg-white text-text-strong-950 shadow-sm'
                        : 'text-text-sub-600 hover:text-text-strong-950',
                    )}
                    onClick={() =>
                      setLocalFilters((p) => ({
                        ...p,
                        centerSource: 'page',
                        center: [],
                      }))
                    }
                  >
                    Page-wise
                  </button>
                  <button
                    type='button'
                    className={cn(
                      'flex-1 rounded-md py-1.5 text-label-sm transition-colors',
                      localFilters.centerSource === 'global'
                        ? 'bg-white text-text-strong-950 shadow-sm'
                        : 'text-text-sub-600 hover:text-text-strong-950',
                    )}
                    onClick={() =>
                      setLocalFilters((p) => ({
                        ...p,
                        centerSource: 'global',
                        center: [],
                      }))
                    }
                  >
                    Global
                  </button>
                </div>
                <p className='text-paragraph-xs text-text-soft-400 mt-1.5'>
                  Page-wise: centres from this table. Global: all centres you can access.
                </p>
              </div>
            )} */}
            <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
              <Filter.List
                options={currentOptions}
                selectedValues={
                  Array.isArray(localFilters[activeTab]) ? localFilters[activeTab] : []
                }
                onToggle={onToggle}
                searchValue={searchText}
                onSearchChange={setSearchText}
                virtualized={currentOptions.length > 40}
                isLoading={
                  activeTab === 'center' &&
                  localFilters.centerSource === 'global' &&
                  centerAccess.status === 'loading'
                }
                emptyMessage={listEmptyMessage}
              />
            </div>
          </Filter.Content>
        </Filter.Body>
      </Filter.Root>
    );
  },
);

CenterViewLandlordFilterDropdown.displayName = 'CenterViewLandlordFilterDropdown';

export default CenterViewLandlordFilterDropdown;
