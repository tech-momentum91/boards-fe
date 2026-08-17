import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RiAddLine, RiArrowDownSLine, RiArrowRightSLine, RiSearchLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import EmptyIllustration from '@/components/ui/empty-illustration';
import KnowledgeCenterQaCard from '@/pages/profile/knowledge-center-qa-card';
import KnowledgeCenterQaCategorySidebar from '@/pages/profile/knowledge-center-qa-category-sidebar';
import {
  QA_CATEGORY_ITEMS,
  qaCategoryLabelByValue,
} from '@/pages/profile/knowledge-center-qa-constants';
import {
  KNOWLEDGE_CENTER_QA_NEW,
  KNOWLEDGE_CENTER_ROOT,
  knowledgeCenterQaDetailPath,
} from '@/pages/profile/knowledge-center-paths';
import {
  clearKnowledgeCenterQaListError,
  fetchKnowledgeCenterQaList,
  selectKnowledgeCenterQaList,
} from '@/redux/knowledgeCenterQaSlice';

/** Debounce server keyword search; first load uses 0 delay so the list appears immediately. */
const LIST_SEARCH_DEBOUNCE_MS = 350;
const QA_CATEGORY_VALUE_BY_LABEL = QA_CATEGORY_ITEMS.reduce((acc, item) => {
  acc[item.label] = item.value;
  return acc;
}, /** @type {Record<string, string>} */ ({}));

const normalizeQuestionTypeValue = (rawType) => {
  const normalized = String(rawType ?? '').trim();
  if (!normalized) return '';
  if (qaCategoryLabelByValue[normalized]) return normalized;
  if (QA_CATEGORY_VALUE_BY_LABEL[normalized]) return QA_CATEGORY_VALUE_BY_LABEL[normalized];
  return '';
};

/**
 * Q&A list + filters (`/settings/knowledge-center/QA` and `/settings/knowledge-center/QA/:qaId`).
 */
export default function KnowledgeCenterQaSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    data: listRows,
    status: listStatus,
    error: listError,
  } = useSelector(selectKnowledgeCenterQaList);

  const [activeCategory, setActiveCategory] = useState('all');
  const [cityFilter, setCityFilter] = useState('all-cities');
  const [centerFilter, setCenterFilter] = useState('all-centers');
  const [clientFilter, setClientFilter] = useState('all-clients');
  const [searchValue, setSearchValue] = useState('');

  /** Category is filtered client-side so list rows stay complete for sidebar counts. */
  const listFilters = useMemo(() => [], []);

  const skipSearchDebounceOnce = useRef(true);

  useEffect(() => {
    const keyword = searchValue.trim() || undefined;
    const delay = skipSearchDebounceOnce.current ? 0 : LIST_SEARCH_DEBOUNCE_MS;
    skipSearchDebounceOnce.current = false;

    const requestId = window.setTimeout(() => {
      dispatch(
        fetchKnowledgeCenterQaList({
          filters: listFilters,
          keyword,
          limit_start: 0,
          limit_page_length: 200,
          order_by: 'modified desc',
        }),
      );
    }, delay);

    return () => window.clearTimeout(requestId);
  }, [dispatch, listFilters, searchValue]);

  const categoryCounts = useMemo(() => {
    const rows = listRows || [];
    const byValue = new Map();
    for (const row of rows) {
      const typeValue = normalizeQuestionTypeValue(row.question_type);
      if (!typeValue) continue;
      byValue.set(typeValue, (byValue.get(typeValue) ?? 0) + 1);
    }
    return { total: rows.length, byValue };
  }, [listRows]);

  const countForCategoryItem = useCallback(
    ({ value, label }) => {
      if (value === 'all') return categoryCounts.total;
      return categoryCounts.byValue.get(value) ?? 0;
    },
    [categoryCounts],
  );

  const filteredRows = useMemo(() => {
    let rows = listRows || [];
    if (activeCategory !== 'all') {
      rows = rows.filter((r) => normalizeQuestionTypeValue(r.question_type) === activeCategory);
    }
    return rows;
  }, [listRows, activeCategory]);

  const groupedByQuestionType = useMemo(() => {
    const map = new Map();
    for (const row of filteredRows) {
      const typeValue = normalizeQuestionTypeValue(row.question_type);
      const typeLabel = qaCategoryLabelByValue[typeValue] ?? row.question_type?.trim() ?? 'Other';
      if (!map.has(typeLabel)) map.set(typeLabel, []);
      map.get(typeLabel).push(row);
    }
    return [...map.entries()];
  }, [filteredRows]);

  const activeCategoryLabel = qaCategoryLabelByValue[activeCategory] ?? 'Q&A';

  const refetchList = useCallback(() => {
    dispatch(
      fetchKnowledgeCenterQaList({
        filters: listFilters,
        keyword: searchValue.trim() || undefined,
        limit_start: 0,
        limit_page_length: 200,
        order_by: 'modified desc',
      }),
    );
  }, [dispatch, listFilters, searchValue]);

  const handleRetryList = useCallback(() => {
    dispatch(clearKnowledgeCenterQaListError());
    refetchList();
  }, [dispatch, refetchList]);

  const openDetailsDrawer = useCallback(
    (row) => {
      if (row?.name) {
        navigate(knowledgeCenterQaDetailPath(row.name));
      }
    },
    [navigate],
  );

  const openCreateDrawer = useCallback(() => {
    navigate(KNOWLEDGE_CENTER_QA_NEW);
  }, [navigate]);

  const gotoKnowledgeCenterRoot = useCallback(() => {
    navigate(KNOWLEDGE_CENTER_ROOT);
  }, [navigate]);

  const clearSearch = useCallback(() => {
    setSearchValue('');
  }, []);

  const showEmptySuccess = listStatus === 'succeeded' && filteredRows.length === 0 && !listError;

  const totalRowCount = listRows?.length ?? 0;
  const trimmedSearch = searchValue.trim();

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <nav
        aria-label='Breadcrumb'
        className='h-12 shrink-0 border-b border-stroke-soft-200 px-3 flex items-center gap-1.5'
      >
        <button
          type='button'
          onClick={gotoKnowledgeCenterRoot}
          className='label-small text-text-sub-500 hover:text-text-main-900 transition-colors'
        >
          Knowledge Center
        </button>
        <RiArrowRightSLine className='size-5 text-text-soft-400 shrink-0' aria-hidden />
        <p className='label-small text-text-main-900'>Q&A</p>
      </nav>

      <div className='flex min-h-0 flex-1 overflow-hidden'>
        <aside className='flex min-h-0 shrink-0 flex-col'>
          <KnowledgeCenterQaCategorySidebar
            value={activeCategory}
            onValueChange={setActiveCategory}
            countForCategoryItem={countForCategoryItem}
          />
        </aside>

        <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pl-5 pt-6'>
          <div className='flex w-full shrink-0 flex-wrap items-center justify-between gap-4 pb-4'>
            <div className='w-[240px]'>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    placeholder='Search here...'
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    aria-label='Search questions'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <div className='flex items-center gap-2'>
              <Select.Root value={cityFilter} onValueChange={setCityFilter} size='small'>
                <Select.Trigger className='w-[103px]'>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value='all-cities'>All Cities</Select.Item>
                  <Select.Item value='ahmedabad'>Ahmedabad</Select.Item>
                </Select.Content>
              </Select.Root>

              <Select.Root value={centerFilter} onValueChange={setCenterFilter} size='small'>
                <Select.Trigger className='w-[118px]'>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value='all-centers'>All Centers</Select.Item>
                  <Select.Item value='binori'>Binori</Select.Item>
                </Select.Content>
              </Select.Root>

              <Select.Root value={clientFilter} onValueChange={setClientFilter} size='small'>
                <Select.Trigger className='w-[111px]'>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value='all-clients'>All Clients</Select.Item>
                  <Select.Item value='persistent-system'>Persistent System</Select.Item>
                </Select.Content>
              </Select.Root>

              <Button.Root size='small' onClick={openCreateDrawer}>
                <Button.Icon as={RiAddLine} />
                Add
              </Button.Root>
            </div>
          </div>

          <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2'>
            {listStatus === 'loading' ? (
              <p className='paragraph-small text-text-sub-500'>Loading…</p>
            ) : null}

            {listStatus === 'failed' && listError ? (
              <div
                className='rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'
                role='alert'
              >
                <p className='paragraph-small text-text-main-900'>{String(listError)}</p>
                <Button.Root
                  type='button'
                  size='small'
                  variant='neutral'
                  mode='stroke'
                  onClick={handleRetryList}
                >
                  Retry
                </Button.Root>
              </div>
            ) : null}

            {showEmptySuccess ? (
              <div
                className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-6 py-14 text-center'
                role='status'
                aria-live='polite'
              >
                <EmptyIllustration className='size-[108px] shrink-0' />
                {totalRowCount === 0 && !trimmedSearch ? (
                  <>
                    <h3 className='mt-5 label-medium text-text-main-900'>No questions yet</h3>
                    <p className='mt-2 max-w-md paragraph-small text-text-sub-500'>
                      Create Q&A entries so your team can find answers quickly from one place.
                    </p>
                    <Button.Root
                      type='button'
                      size='small'
                      variant='neutral'
                      mode='stroke'
                      className='mt-6 gap-2'
                      onClick={openCreateDrawer}
                    >
                      <Button.Icon as={RiAddLine} />
                      Add question
                    </Button.Root>
                  </>
                ) : null}
                {totalRowCount === 0 && trimmedSearch ? (
                  <>
                    <h3 className='mt-5 label-medium text-text-main-900'>No matching questions</h3>
                    <p className='mt-2 max-w-md paragraph-small text-text-sub-500'>
                      Nothing matches your search. Try different keywords or clear the search.
                    </p>
                    <div className='mt-6 flex flex-wrap items-center justify-center gap-2'>
                      <Button.Root
                        type='button'
                        size='small'
                        variant='neutral'
                        mode='stroke'
                        onClick={clearSearch}
                      >
                        Clear search
                      </Button.Root>
                      <Button.Root
                        type='button'
                        size='small'
                        className='gap-2'
                        onClick={openCreateDrawer}
                      >
                        <Button.Icon as={RiAddLine} />
                        Add question
                      </Button.Root>
                    </div>
                  </>
                ) : null}
                {totalRowCount > 0 ? (
                  <>
                    <h3 className='mt-5 label-medium text-text-main-900'>
                      No questions in this category
                    </h3>
                    <p className='mt-2 max-w-md paragraph-small text-text-sub-500'>
                      {`There are no questions in “${activeCategoryLabel}”. View all categories or pick another type.`}
                    </p>
                    <Button.Root
                      type='button'
                      size='small'
                      variant='neutral'
                      mode='stroke'
                      className='mt-6'
                      onClick={() => setActiveCategory('all')}
                    >
                      View all categories
                    </Button.Root>
                  </>
                ) : null}
              </div>
            ) : null}

            {listStatus === 'succeeded' && filteredRows.length > 0 && activeCategory === 'all'
              ? groupedByQuestionType.map(([typeLabel, cards]) => (
                  <div key={typeLabel} className='flex flex-col gap-4'>
                    <div className='flex items-center gap-2'>
                      <RiArrowDownSLine className='size-5 text-text-sub-500' aria-hidden />
                      <p className='label-medium text-text-main-900'>{typeLabel}</p>
                      <span className='text-[12px] leading-4 text-text-sub-500'>
                        {cards.length} Questions
                      </span>
                    </div>

                    <div className='grid grid-cols-3 gap-3'>
                      {cards.map((row) => (
                        <KnowledgeCenterQaCard
                          key={row.name}
                          row={row}
                          onOpen={openDetailsDrawer}
                        />
                      ))}
                    </div>
                  </div>
                ))
              : null}

            {listStatus === 'succeeded' && activeCategory !== 'all' && filteredRows.length > 0 ? (
              <div className='flex flex-col gap-4'>
                <div className='flex items-center gap-2'>
                  <RiArrowDownSLine className='size-5 text-text-sub-500' aria-hidden />
                  <p className='label-medium text-text-main-900'>{activeCategoryLabel}</p>
                  <span className='text-[12px] leading-4 text-text-sub-500'>
                    {filteredRows.length} Questions
                  </span>
                </div>
                <div className='grid grid-cols-3 gap-3'>
                  {filteredRows.map((row) => (
                    <KnowledgeCenterQaCard key={row.name} row={row} onOpen={openDetailsDrawer} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
