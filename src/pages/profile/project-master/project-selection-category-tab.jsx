import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
  RiExpandUpDownFill,
  RiSearchLine,
  RiUpload2Line,
} from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Checkbox from '@/components/ui/checkbox';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/use-debounce';
import {
  ASSIGNEE_OPTIONS,
  SELECTION_CUSTOM_COLUMN_TYPES,
} from '@/pages/profile/project-master/project-master.constants';
import ProjectMasterTableDeleteButton from '@/pages/profile/project-master/project-master-table-delete-button';
import {
  buildFieldValuesForItem,
  buildSelectionCategoryPayload,
  createEmptyItem,
  makeSelectionColumnId,
} from '@/pages/profile/project-master/project-selection-category-helpers';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import { PRODUCT_FORM_FIELDS } from '@/api/productFormOptions';
import { fetchProductCategoriesByTab } from '@/api/productCategories';
import {
  createSelectionCategory,
  deleteSelectionCategory,
  fetchItemsForProductCategory,
  fetchOrderCategoryList,
  fetchProductCategoryOptions,
  fetchSelectionCategoryDetail,
  fetchSelectionCategoryList,
  patchSelectionCategoryListItem,
  updateSelectionCategory,
} from '@/redux/projectMasterSlice';
import { cn } from '@/utils/cn';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  CategoryInlineInput,
  ExpandToggleButton,
  ExpandedItemsSection,
  ExpandedItemsSkeleton,
  PARENT_ACTIONS_COL_CLASS,
  SELECTION_NAME_TEXT_MAX_CLASS,
  SelectionCategoryAddFooter,
  SelectionParentColgroup,
  SortableColumnHeader,
  TruncatedTableSelect,
  TruncatedTooltip,
} from '@/pages/profile/project-master/selection-category-table-shared';

const CATEGORY_LEVEL_ID_KEYS = [
  'categoryGroupId',
  'parentCategoryId',
  'categoryId',
  'productGroupId',
];

function resolveProductCategoryIdFromOption(option) {
  if (!option || typeof option !== 'object') return '';
  const row = option.row || {};
  const level = Number.isInteger(option.selectedLevel)
    ? option.selectedLevel
    : CATEGORY_LEVEL_ID_KEYS.length - 1;
  const idKey =
    CATEGORY_LEVEL_ID_KEYS[Math.max(0, Math.min(level, CATEGORY_LEVEL_ID_KEYS.length - 1))];
  return String(row[idKey] || row.leafId || option.value || '').trim();
}

function ProductCategoryHierarchicalCell({
  value,
  onChange,
  disabled = false,
  displayLabelFallback = '',
  placeholder = 'Select',
  triggerClassName = 'h-8 w-full',
}) {
  const displayText = String(value ?? displayLabelFallback ?? '').trim();

  // Stop pointer/mouse events from bubbling to parent row handlers so the
  // popover opens on the first click (not the second).
  const stopBubbling = (event) => event.stopPropagation();

  return (
    <div
      className='w-full'
      onClick={stopBubbling}
      onMouseDown={stopBubbling}
      onPointerDown={stopBubbling}
    >
      <ProductFormSearchableSelect
        field={PRODUCT_FORM_FIELDS.CATEGORY}
        value={value || ''}
        onValueChange={(_optionValue, option) => {
          const nextId = resolveProductCategoryIdFromOption(option);
          if (nextId) onChange(nextId);
        }}
        disabled={disabled}
        placeholder={placeholder}
        searchPlaceholder='Search category...'
        emptyMessage='Start typing to browse categories'
        size='xsmall'
        variant='borderless'
        allowCreate={false}
        triggerClassName={triggerClassName}
        renderTriggerValue={({ selectedOption }) => (
          <span className='block min-w-0 max-w-full truncate text-paragraph-sm text-text-strong-950'>
            {selectedOption?.label || displayText || placeholder}
          </span>
        )}
        renderOptionLabel={(opt) => (
          <span className='flex min-w-0 w-full flex-col gap-0.5'>
            <span className='truncate text-paragraph-sm font-medium text-text-main-900'>
              {opt.title || opt.label || opt.value}
            </span>
            {opt.breadcrumb ? (
              <span className='truncate text-paragraph-xs text-text-sub-500'>{opt.breadcrumb}</span>
            ) : null}
          </span>
        )}
      />
    </div>
  );
}

export default function ProjectSelectionCategoryTab() {
  const dispatch = useDispatch();
  const { list, create } = useSelector((state) => state.projectMaster.selectionCategories);
  const orderList = useSelector(
    (state) => state.projectMaster.orderCategories.list.data?.results ?? [],
  );
  const isDeleting = useSelector((state) => state.projectMaster.delete.isLoading);
  const { data: listData, isLoading } = list;
  const categories = useMemo(() => listData?.results ?? [], [listData?.results]);
  const isInitialLoading = isLoading && categories.length === 0;
  const isCreating = create.isLoading;

  const [searchTerm, setSearchTerm] = useState('');
  const [showDraftRow, setShowDraftRow] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftProductCategory, setDraftProductCategory] = useState('');
  const [draftOrderCategory, setDraftOrderCategory] = useState('');
  const [draftAssignee, setDraftAssignee] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const [categoryDetails, setCategoryDetails] = useState({});
  const [productOptions, setProductOptions] = useState([]);
  const [itemOptionsMap, setItemOptionsMap] = useState({});
  const debouncedSearch = useDebounce(searchTerm, 400);
  const hasLoadedListRef = useRef(false);

  const loadCategories = useCallback(
    async ({ silent = false } = {}) => {
      try {
        await dispatch(fetchSelectionCategoryList({ keyword: debouncedSearch, silent })).unwrap();
        hasLoadedListRef.current = true;
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [debouncedSearch, dispatch],
  );

  const loadOptions = useCallback(async () => {
    try {
      const [categoryRows, orderRes] = await Promise.all([
        fetchProductCategoriesByTab('category'),
        dispatch(fetchOrderCategoryList({ limit_page_length: 100 })).unwrap(),
      ]);
      setProductOptions(
        (categoryRows ?? []).map((row) => ({
          value: row.id,
          label: row.name || row.id,
        })),
      );
      void orderRes;
    } catch {
      try {
        const productRes = await dispatch(fetchProductCategoryOptions({})).unwrap();
        setProductOptions(productRes?.results ?? []);
      } catch (fallbackError) {
        showErrorToast(extractErrorMessage(fallbackError));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    loadCategories({ silent: hasLoadedListRef.current });
  }, [loadCategories]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const loadCategoryDetail = useCallback(
    async (name) => {
      try {
        const data = await dispatch(fetchSelectionCategoryDetail(name)).unwrap();
        setCategoryDetails((prev) => ({ ...prev, [name]: data }));
        const itemsRes = await dispatch(
          fetchItemsForProductCategory({
            product_category: data?.product_category || '',
            keyword: '',
            limit_page_length: 200,
          }),
        ).unwrap();
        setItemOptionsMap((prev) => ({
          ...prev,
          [name]: itemsRes?.results ?? [],
        }));
        return data;
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
        return null;
      }
    },
    [dispatch],
  );

  const saveCategoryDetail = useCallback(
    async (detail) => {
      const payload = buildSelectionCategoryPayload(detail);
      await dispatch(updateSelectionCategory(payload)).unwrap();
      setCategoryDetails((prev) => ({ ...prev, [detail.name]: detail }));
      dispatch(
        patchSelectionCategoryListItem({
          name: detail.name,
          selection_category_name: detail.selection_category_name,
          product_category: detail.product_category,
          order_category: detail.order_category,
          assignee: detail.assignee,
        }),
      );
    },
    [dispatch],
  );

  const toggleExpand = useCallback(
    async (name) => {
      const willExpand = !expandedRows.has(name);
      setExpandedRows((prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        return next;
      });
      if (willExpand && !categoryDetails[name]) {
        await loadCategoryDetail(name);
      }
    },
    [categoryDetails, expandedRows, loadCategoryDetail],
  );

  const handleParentFieldUpdate = useCallback(
    async (rowName, fieldName, value) => {
      const listRow = categories.find((row) => row.name === rowName);
      if (!listRow || listRow[fieldName] === value) return;

      let detail = categoryDetails[rowName];
      if (!detail) {
        detail = await loadCategoryDetail(rowName);
      }
      if (!detail) return;

      const nextDetail = {
        ...detail,
        [fieldName]: value,
        ...(fieldName === 'assignee' ? { assignee_type: 'Role' } : {}),
      };

      dispatch(patchSelectionCategoryListItem({ name: rowName, [fieldName]: value }));
      setCategoryDetails((prev) => ({ ...prev, [rowName]: nextDetail }));

      if (fieldName === 'product_category') {
        const itemsRes = await dispatch(
          fetchItemsForProductCategory({
            product_category: value || '',
            keyword: '',
            limit_page_length: 200,
          }),
        ).unwrap();
        setItemOptionsMap((prev) => ({ ...prev, [rowName]: itemsRes?.results ?? [] }));
      }

      try {
        await saveCategoryDetail(nextDetail);
        if (fieldName === 'assignee') {
          setCategoryDetails((prev) => ({
            ...prev,
            [rowName]: {
              ...nextDetail,
              items: (nextDetail.items ?? []).map((item) => ({
                ...item,
                assignee: item.assignee || value,
              })),
            },
          }));
        }
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [categories, categoryDetails, dispatch, loadCategoryDetail, saveCategoryDetail],
  );

  const resetDraftRow = useCallback(() => {
    setDraftName('');
    setDraftProductCategory('');
    setDraftOrderCategory('');
    setDraftAssignee('');
  }, []);

  const openDraftRow = useCallback(() => {
    if (showDraftRow) return;
    resetDraftRow();
    setShowDraftRow(true);
  }, [resetDraftRow, showDraftRow]);

  const cancelDraftRow = useCallback(() => {
    setShowDraftRow(false);
    resetDraftRow();
  }, [resetDraftRow]);

  const submitNew = useCallback(
    async (overrides = {}) => {
      const name = String(overrides.name ?? draftName).trim();
      if (!name || isCreating) return;

      const product_category = overrides.product_category ?? draftProductCategory;
      const order_category = overrides.order_category ?? draftOrderCategory;
      const assignee = overrides.assignee ?? draftAssignee;

      try {
        await dispatch(
          createSelectionCategory({
            selection_category_name: name,
            ...(product_category ? { product_category } : {}),
            ...(order_category ? { order_category } : {}),
            ...(assignee ? { assignee, assignee_type: 'Role' } : {}),
          }),
        ).unwrap();
        showSuccessToast('Selection category created');
        setShowDraftRow(false);
        resetDraftRow();
        await loadCategories({ silent: true });
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [
      dispatch,
      draftAssignee,
      draftName,
      draftOrderCategory,
      draftProductCategory,
      isCreating,
      loadCategories,
      resetDraftRow,
    ],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete?.id) return;
    try {
      await dispatch(deleteSelectionCategory(pendingDelete.id)).unwrap();
      showSuccessToast('Selection category deleted');
      setPendingDelete(null);
      setCategoryDetails((prev) => {
        const next = { ...prev };
        delete next[pendingDelete.id];
        return next;
      });
      await loadCategories({ silent: true });
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [dispatch, loadCategories, pendingDelete?.id]);

  const handleAddColumn = useCallback(
    async (rowName, { label, columnType }) => {
      const detail = categoryDetails[rowName];
      if (!detail) return;

      const custom_columns = [
        ...(detail.custom_columns ?? []),
        {
          column_label: label,
          column_id: makeSelectionColumnId(label),
          column_type: columnType,
        },
      ];
      const items = (detail.items ?? []).map((item) => ({
        ...item,
        field_values: buildFieldValuesForItem(item, custom_columns),
      }));

      try {
        await saveCategoryDetail({ ...detail, custom_columns, items });
        showSuccessToast('Custom column added');
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [categoryDetails, saveCategoryDetail],
  );

  const handleRemoveColumn = useCallback(
    async (rowName, columnLabel) => {
      const detail = categoryDetails[rowName];
      if (!detail) return;

      const custom_columns = (detail.custom_columns ?? []).filter(
        (col) => col.column_label !== columnLabel,
      );
      const items = (detail.items ?? []).map((item) => ({
        ...item,
        field_values: (item.field_values ?? []).filter((fv) => fv.column_label !== columnLabel),
      }));

      try {
        await saveCategoryDetail({ ...detail, custom_columns, items });
        showSuccessToast('Custom column removed');
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [categoryDetails, saveCategoryDetail],
  );

  const orderOptions = useMemo(
    () => orderList.map((row) => ({ value: row.name, label: row.order_category || row.name })),
    [orderList],
  );

  return (
    <div className='flex w-full flex-col gap-4'>
      <Input.Root size='xsmall' className='w-full sm:w-[276px]'>
        <Input.Wrapper>
          <Input.Icon as={RiSearchLine} />
          <Input.Input
            placeholder='Search here...'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='w-full'>
        {isInitialLoading ? (
          <div className='flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
            Loading selection categories…
          </div>
        ) : (
          <div className='flex max-h-[min(70vh,800px)] flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
            <div className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden'>
              <Table.Root
                variant='compact'
                className='!overflow-x-visible w-full'
                style={{ tableLayout: 'fixed', width: '100%' }}
              >
                <SelectionParentColgroup />
                <Table.Header>
                  <Table.Row className='border-0 hover:bg-transparent'>
                    <Table.Head className='h-9 min-w-0 border-0 bg-bg-weak-50 !rounded-none px-3 py-2'>
                      <SortableColumnHeader label='Name' />
                    </Table.Head>
                    <Table.Head className='h-9 min-w-0 border-0 bg-bg-weak-50 !rounded-none px-3 py-2'>
                      <SortableColumnHeader label='Product Category' />
                    </Table.Head>
                    <Table.Head className='h-9 min-w-0 border-0 bg-bg-weak-50 !rounded-none px-3 py-2'>
                      <SortableColumnHeader label='Order Category' />
                    </Table.Head>
                    <Table.Head className='h-9 min-w-0 border-0 bg-bg-weak-50 !rounded-none px-3 py-2'>
                      <SortableColumnHeader label='Assignee' />
                    </Table.Head>
                    <Table.Head
                      className={cn(
                        'h-9 border-0 bg-bg-weak-50 !rounded-none p-0',
                        PARENT_ACTIONS_COL_CLASS,
                      )}
                    />
                  </Table.Row>
                </Table.Header>

                <Table.Body spacing={0}>
                  {categories.map((row, rowIndex) => {
                    const expanded = expandedRows.has(row.name);
                    const detail = categoryDetails[row.name];
                    return (
                      <React.Fragment key={row.name}>
                        <Table.Row
                          className={cn(
                            'group/parent-row h-10 border-0 transition-colors hover:bg-bg-weak-50',
                            expanded && 'bg-bg-weak-50',
                          )}
                        >
                          <Table.Cell
                            className={cn(
                              'h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0 group-hover/parent-row:bg-bg-weak-50',
                              expanded && 'bg-bg-weak-50',
                            )}
                          >
                            <div className='flex h-10 min-w-0 items-center px-3'>
                              <div className='flex min-w-0 flex-1 items-center'>
                                <TruncatedTooltip label={row.selection_category_name}>
                                  <div className={cn('min-w-0', SELECTION_NAME_TEXT_MAX_CLASS)}>
                                    <CategoryInlineInput
                                      defaultValue={row.selection_category_name}
                                      placeholder='Enter name'
                                      isName
                                      className='w-full'
                                      onCommit={(value) =>
                                        handleParentFieldUpdate(
                                          row.name,
                                          'selection_category_name',
                                          value,
                                        )
                                      }
                                    />
                                  </div>
                                </TruncatedTooltip>
                                <ExpandToggleButton
                                  expanded={expanded}
                                  onClick={() => toggleExpand(row.name)}
                                />
                              </div>
                            </div>
                          </Table.Cell>
                          <Table.Cell
                            className={cn(
                              'h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0 group-hover/parent-row:bg-bg-weak-50',
                              expanded && 'bg-bg-weak-50',
                            )}
                          >
                            <div className='flex h-10 min-w-0 items-center px-3'>
                              <ProductCategoryHierarchicalCell
                                value={row.product_category || ''}
                                displayLabelFallback={
                                  productOptions.find((opt) => opt.value === row.product_category)
                                    ?.label ?? ''
                                }
                                onChange={(value) =>
                                  handleParentFieldUpdate(row.name, 'product_category', value)
                                }
                              />
                            </div>
                          </Table.Cell>
                          <Table.Cell
                            className={cn(
                              'h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0 group-hover/parent-row:bg-bg-weak-50',
                              expanded && 'bg-bg-weak-50',
                            )}
                          >
                            <div className='flex h-10 min-w-0 items-center px-3'>
                              <TruncatedTableSelect
                                value={row.order_category}
                                placeholder='Select'
                                options={orderOptions}
                                maxWidthClass='w-full'
                                onValueChange={(value) =>
                                  handleParentFieldUpdate(row.name, 'order_category', value)
                                }
                              />
                            </div>
                          </Table.Cell>
                          <Table.Cell
                            className={cn(
                              'h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0 group-hover/parent-row:bg-bg-weak-50',
                              expanded && 'bg-bg-weak-50',
                            )}
                          >
                            <div className='flex h-10 min-w-0 items-center px-3'>
                              <TruncatedTableSelect
                                value={row.assignee}
                                placeholder='Select'
                                options={ASSIGNEE_OPTIONS}
                                maxWidthClass='w-full'
                                onValueChange={(value) =>
                                  handleParentFieldUpdate(row.name, 'assignee', value)
                                }
                              />
                            </div>
                          </Table.Cell>
                          <Table.Cell
                            className={cn(
                              'h-10 border-0 bg-bg-white-0 !rounded-none p-0 group-hover/parent-row:bg-bg-weak-50',
                              PARENT_ACTIONS_COL_CLASS,
                              expanded && 'bg-bg-weak-50',
                            )}
                          >
                            <div className='flex h-10 items-center justify-center'>
                              <ProjectMasterTableDeleteButton
                                ariaLabel={`Delete ${row.selection_category_name}`}
                                onClick={() =>
                                  setPendingDelete({
                                    id: row.name,
                                    label: row.selection_category_name || row.name,
                                  })
                                }
                              />
                            </div>
                          </Table.Cell>
                        </Table.Row>

                        {expanded ? (
                          <tr className='border-0'>
                            <Table.Cell
                              colSpan={5}
                              className='!p-0 align-top border-t border-stroke-soft-200 bg-bg-weak-100'
                            >
                              <div className='min-w-0 max-w-full overflow-hidden'>
                                {detail ? (
                                  <ExpandedItemsSection
                                    categoryDetail={detail}
                                    itemOptions={itemOptionsMap[row.name] ?? []}
                                    onSave={saveCategoryDetail}
                                    onAddColumn={(payload) => handleAddColumn(row.name, payload)}
                                    onRemoveColumn={(columnLabel) =>
                                      handleRemoveColumn(row.name, columnLabel)
                                    }
                                    onSearchItems={async (keyword) => {
                                      try {
                                        const itemsRes = await dispatch(
                                          fetchItemsForProductCategory({
                                            product_category: detail?.product_category || '',
                                            keyword,
                                            limit_page_length: 200,
                                          }),
                                        ).unwrap();
                                        setItemOptionsMap((prev) => ({
                                          ...prev,
                                          [row.name]: itemsRes?.results ?? [],
                                        }));
                                      } catch {
                                        /* keep existing options */
                                      }
                                    }}
                                    imageUploadContext={
                                      detail?.name
                                        ? {
                                            doctype: 'Selection Category',
                                            docname: detail.name,
                                          }
                                        : null
                                    }
                                  />
                                ) : (
                                  <ExpandedItemsSkeleton />
                                )}
                              </div>
                            </Table.Cell>
                          </tr>
                        ) : null}

                        {rowIndex < categories.length - 1 || showDraftRow ? (
                          <Table.RowDivider />
                        ) : null}
                      </React.Fragment>
                    );
                  })}

                  {showDraftRow ? (
                    <Table.Row className='h-10 border-0 hover:bg-transparent'>
                      <Table.Cell className='h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0'>
                        <div className='flex h-10 min-w-0 items-center px-3'>
                          <Input.Root variant='borderless' size='xsmall' className='w-full'>
                            <Input.Wrapper>
                              <Input.Input
                                autoFocus
                                value={draftName}
                                placeholder='Enter selection category name'
                                className='label-small font-medium text-text-strong-950 placeholder:font-normal'
                                onChange={(event) => setDraftName(event.target.value)}
                                onBlur={() => void submitNew()}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    event.currentTarget.blur();
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    cancelDraftRow();
                                  }
                                }}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </div>
                      </Table.Cell>
                      <Table.Cell className='h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0'>
                        <div className='flex h-10 min-w-0 items-center px-3'>
                          <ProductCategoryHierarchicalCell
                            value={draftProductCategory}
                            disabled={isCreating}
                            onChange={(value) => setDraftProductCategory(value)}
                          />
                        </div>
                      </Table.Cell>
                      <Table.Cell className='h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0'>
                        <div className='flex h-10 min-w-0 items-center px-3'>
                          <TruncatedTableSelect
                            value={draftOrderCategory}
                            placeholder='Select'
                            options={orderOptions}
                            maxWidthClass='w-full'
                            disabled={isCreating}
                            onValueChange={(value) => setDraftOrderCategory(value)}
                          />
                        </div>
                      </Table.Cell>
                      <Table.Cell className='h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0'>
                        <div className='flex h-10 min-w-0 items-center px-3'>
                          <TruncatedTableSelect
                            value={draftAssignee}
                            placeholder='Select'
                            options={ASSIGNEE_OPTIONS}
                            maxWidthClass='w-full'
                            disabled={isCreating}
                            onValueChange={(value) => {
                              setDraftAssignee(value);
                              if (draftName.trim()) {
                                void submitNew({ assignee: value });
                              }
                            }}
                          />
                        </div>
                      </Table.Cell>
                      <Table.Cell
                        className={cn(
                          'border-0 bg-bg-white-0 !rounded-none p-0',
                          PARENT_ACTIONS_COL_CLASS,
                        )}
                      >
                        <div className='flex h-10 items-center justify-center'>
                          <ProjectMasterTableDeleteButton
                            ariaLabel='Cancel new selection category'
                            onClick={cancelDraftRow}
                          />
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ) : null}
                </Table.Body>
              </Table.Root>
            </div>

            <SelectionCategoryAddFooter disabled={isCreating} onClick={openDraftRow} />
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title='Delete selection category?'
        description={
          pendingDelete?.label
            ? `Are you sure you want to delete "${pendingDelete.label}"? This action cannot be undone.`
            : 'Are you sure you want to delete this selection category? This action cannot be undone.'
        }
        item={pendingDelete}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
