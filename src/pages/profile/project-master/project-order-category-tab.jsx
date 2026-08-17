import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RiAddLine, RiExpandUpDownFill, RiSearchLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import * as Input from '@/components/ui/input';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/use-debounce';
import {
  createOrderCategory,
  deleteOrderCategory,
  fetchOrderCategoryList,
  patchOrderCategoryListItem,
  updateOrderCategory,
} from '@/redux/projectMasterSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import ProjectMasterTableDeleteButton from '@/pages/profile/project-master/project-master-table-delete-button';

function SortableColumnHeader({ label }) {
  return (
    <div className='flex items-center gap-0.5 whitespace-nowrap'>
      <span className='label-small font-medium text-text-soft-400'>{label}</span>
      <RiExpandUpDownFill className='size-5 shrink-0 text-text-sub-600' aria-hidden />
    </div>
  );
}

function OrderParentColgroup() {
  return (
    <colgroup>
      <col style={{ width: '30%' }} />
      <col style={{ width: '66%' }} />
      <col style={{ width: '4%' }} />
    </colgroup>
  );
}

const ORDER_ACTIONS_COL_CLASS = 'w-[4%] min-w-[56px]';

function TruncatedTooltip({ label, children, enabled = true }) {
  const text = String(label ?? '').trim();
  if (!enabled || !text) return children;

  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Content side='top' size='small' variant='dark' className='max-w-xs break-words'>
          {text}
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function CategoryInlineInput({ defaultValue, placeholder, onCommit, isName = false, className }) {
  return (
    <Input.Root variant='borderless' size='xsmall' className={cn('min-w-0 w-full', className)}>
      <Input.Wrapper>
        <Input.Input
          key={defaultValue}
          type='text'
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={cn(
            'truncate',
            isName && 'label-small font-medium text-text-strong-950 placeholder:font-normal',
          )}
          onBlur={(event) => onCommit?.(event.target.value.trim())}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
      </Input.Wrapper>
    </Input.Root>
  );
}

export default function ProjectOrderCategoryTab() {
  const dispatch = useDispatch();
  const { list, create } = useSelector((state) => state.projectMaster.orderCategories);
  const isDeleting = useSelector((state) => state.projectMaster.delete.isLoading);
  const { data: listData, isLoading } = list;
  const categories = listData?.results ?? [];
  const isInitialLoading = isLoading && categories.length === 0;
  const isCreating = create.isLoading;

  const [searchTerm, setSearchTerm] = useState('');
  const [showDraftRow, setShowDraftRow] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const debouncedSearch = useDebounce(searchTerm, 400);
  const hasLoadedListRef = useRef(false);
  const draftDescriptionInputRef = useRef(null);

  const loadCategories = useCallback(
    async ({ silent = false } = {}) => {
      try {
        await dispatch(
          fetchOrderCategoryList({ keyword: debouncedSearch, limit_page_length: 50, silent }),
        ).unwrap();
        hasLoadedListRef.current = true;
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [debouncedSearch, dispatch],
  );

  useEffect(() => {
    loadCategories({ silent: hasLoadedListRef.current });
  }, [loadCategories]);

  const handleFieldUpdate = useCallback(
    async (rowName, fieldName, value) => {
      const row = categories.find((r) => r.name === rowName);
      if (!rowName || !row) return;
      const current = fieldName === 'order_category' ? row.order_category : row.description;
      if (current === value) return;

      const patch = {
        name: rowName,
        order_category: fieldName === 'order_category' ? value : row.order_category,
        description: fieldName === 'description' ? value : row.description,
      };
      dispatch(patchOrderCategoryListItem(patch));

      try {
        await dispatch(updateOrderCategory(patch)).unwrap();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
        await loadCategories({ silent: true });
      }
    },
    [categories, dispatch, loadCategories],
  );

  const resetDraftRow = useCallback(() => {
    setDraftName('');
    setDraftDescription('');
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

  const submitNew = useCallback(async () => {
    const name = draftName.trim();
    if (!name || isCreating) return;
    try {
      await dispatch(
        createOrderCategory({ order_category: name, description: draftDescription.trim() }),
      ).unwrap();
      showSuccessToast('Order category created');
      setShowDraftRow(false);
      resetDraftRow();
      await loadCategories({ silent: true });
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [dispatch, draftDescription, draftName, isCreating, loadCategories, resetDraftRow]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete?.id) return;
    try {
      await dispatch(deleteOrderCategory(pendingDelete.id)).unwrap();
      showSuccessToast('Order category deleted');
      setPendingDelete(null);
      await loadCategories({ silent: true });
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  }, [dispatch, loadCategories, pendingDelete?.id]);

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

      <div className='w-full overflow-x-auto'>
        {isInitialLoading ? (
          <div className='flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
            Loading order categories…
          </div>
        ) : (
          <div className='w-full overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
            <Table.Root
              variant='compact'
              className='!overflow-x-visible w-full'
              style={{ tableLayout: 'fixed', width: '100%' }}
            >
              <OrderParentColgroup />
              <Table.Header>
                <Table.Row className='border-0 hover:bg-transparent'>
                  <Table.Head className='h-9 min-w-0 border-0 bg-bg-weak-50 !rounded-none px-3 py-2'>
                    <SortableColumnHeader label='Name' />
                  </Table.Head>
                  <Table.Head className='h-9 min-w-0 border-0 bg-bg-weak-50 !rounded-none px-3 py-2'>
                    <SortableColumnHeader label='Description' />
                  </Table.Head>
                  <Table.Head
                    className={cn(
                      'h-9 border-0 bg-bg-weak-50 !rounded-none p-0',
                      ORDER_ACTIONS_COL_CLASS,
                    )}
                  />
                </Table.Row>
              </Table.Header>

              <Table.Body spacing={0}>
                {categories.map((row, rowIndex) => (
                  <React.Fragment key={row.name}>
                    <Table.Row className='group/parent-row h-10 border-0 transition-colors hover:bg-bg-weak-50'>
                      <Table.Cell className='h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0 group-hover/parent-row:bg-bg-weak-50'>
                        <div className='flex h-10 min-w-0 items-center px-3'>
                          <TruncatedTooltip label={row.order_category}>
                            <div className='min-w-0 w-full'>
                              <CategoryInlineInput
                                defaultValue={row.order_category}
                                placeholder='Enter order category name'
                                isName
                                className='w-full'
                                onCommit={(value) =>
                                  handleFieldUpdate(row.name, 'order_category', value)
                                }
                              />
                            </div>
                          </TruncatedTooltip>
                        </div>
                      </Table.Cell>
                      <Table.Cell className='h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0 group-hover/parent-row:bg-bg-weak-50'>
                        <div className='flex h-10 min-w-0 items-center px-3'>
                          <TruncatedTooltip label={row.description}>
                            <div className='min-w-0 w-full'>
                              <CategoryInlineInput
                                defaultValue={row.description}
                                placeholder='Enter description'
                                className='w-full'
                                onCommit={(value) =>
                                  handleFieldUpdate(row.name, 'description', value)
                                }
                              />
                            </div>
                          </TruncatedTooltip>
                        </div>
                      </Table.Cell>
                      <Table.Cell
                        className={cn(
                          'h-10 border-0 bg-bg-white-0 !rounded-none p-0 group-hover/parent-row:bg-bg-weak-50',
                          ORDER_ACTIONS_COL_CLASS,
                        )}
                      >
                        <div className='flex h-10 items-center justify-center opacity-0 transition-opacity group-hover/parent-row:opacity-100 focus-within:opacity-100'>
                          <ProjectMasterTableDeleteButton
                            ariaLabel={`Delete ${row.order_category || row.name}`}
                            onClick={() =>
                              setPendingDelete({
                                id: row.name,
                                label: row.order_category || row.name,
                              })
                            }
                          />
                        </div>
                      </Table.Cell>
                    </Table.Row>

                    {rowIndex < categories.length - 1 || showDraftRow ? <Table.RowDivider /> : null}
                  </React.Fragment>
                ))}

                {showDraftRow ? (
                  <Table.Row className='h-10 border-0 hover:bg-transparent'>
                    <Table.Cell className='h-10 min-w-0 border-0 bg-bg-white-0 !rounded-none !p-0'>
                      <div className='flex h-10 min-w-0 items-center px-3'>
                        <Input.Root variant='borderless' size='xsmall' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              autoFocus
                              value={draftName}
                              placeholder='Enter order category name'
                              className='label-small font-medium text-text-strong-950 placeholder:font-normal'
                              onChange={(event) => setDraftName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  draftDescriptionInputRef.current?.focus();
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
                        <Input.Root variant='borderless' size='xsmall' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              ref={draftDescriptionInputRef}
                              value={draftDescription}
                              placeholder='Enter description'
                              onChange={(event) => setDraftDescription(event.target.value)}
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
                    <Table.Cell
                      className={cn(
                        'border-0 bg-bg-white-0 !rounded-none p-0',
                        ORDER_ACTIONS_COL_CLASS,
                      )}
                    />
                  </Table.Row>
                ) : null}

                <Table.RowDivider className='[&_td]:!p-0' dividerClassName='!h-px' />

                <Table.Row className='border-0 bg-bg-weak-100 hover:bg-transparent'>
                  <Table.Cell
                    colSpan={3}
                    className='h-9 border-0 !rounded-none bg-bg-weak-100 px-3 py-2'
                  >
                    <button
                      type='button'
                      disabled={isCreating}
                      onClick={openDraftRow}
                      className='flex w-full items-center gap-3 text-left label-small font-medium text-text-soft-400 transition-colors hover:text-text-sub-500 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      <span
                        className='flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'
                        aria-hidden
                      >
                        <RiAddLine className='size-5 text-text-soft-400' />
                      </span>
                      Add Order Category
                    </button>
                  </Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Root>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title='Delete order category?'
        description={
          pendingDelete?.label
            ? `Are you sure you want to delete "${pendingDelete.label}"? This action cannot be undone.`
            : 'Are you sure you want to delete this order category? This action cannot be undone.'
        }
        item={pendingDelete}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
