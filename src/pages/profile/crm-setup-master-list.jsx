import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiDeleteBinLine, RiSearchLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Table from '@/components/ui/table';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { useDebounce } from '@/hooks/use-debounce';
import apiClient from '@/api/axios';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const unwrapFrappeMessage = (response) => response?.data?.message ?? response?.data;

const normalizeValue = (value) => (value || '').trim().toLowerCase();

const CrmSetupMasterList = ({
  apiBase,
  getMethod,
  upsertMethod,
  disableMethod,
  valueField,
  title,
  subtitle,
  columnHeader,
  addButtonLabel,
  searchPlaceholder,
  newItemPlaceholder,
  emptyTitle,
  emptySearchMessage,
  emptyDefaultMessage,
  requiredMessage,
  duplicateMessage,
  createSuccessMessage,
  updateSuccessMessage,
  disableSuccessMessage,
  loadErrorMessage,
  createErrorMessage,
  updateErrorMessage,
  disableErrorMessage,
  disableModalTitle,
  disableModalDescription,
  disableConfirmLabel = 'Disable',
  disableLoadingLabel = 'Disabling...',
}) => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [rowDrafts, setRowDrafts] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [savingItemName, setSavingItemName] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDisabling, setIsDisabling] = useState(false);
  const newValueInputRef = useRef(null);
  const cancelledEditNamesRef = useRef(new Set());

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const getItemValue = useCallback((item) => item?.[valueField] ?? '', [valueField]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`${apiBase}.${getMethod}`);
      const message = unwrapFrappeMessage(response);
      setItems(Array.isArray(message) ? message : []);
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: loadErrorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, getMethod, loadErrorMessage]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const query = normalizeValue(debouncedSearchTerm);
    if (!query) {
      return items;
    }
    return items.filter((item) => normalizeValue(getItemValue(item)).includes(query));
  }, [debouncedSearchTerm, getItemValue, items]);

  useEffect(() => {
    if (isAddingRow) {
      newValueInputRef.current?.focus();
    }
  }, [isAddingRow]);

  const hasDuplicateValue = useCallback(
    (value, excludeName = '') => {
      const normalizedValue = normalizeValue(value);
      return items.some(
        (item) =>
          item.name !== excludeName && normalizeValue(getItemValue(item)) === normalizedValue,
      );
    },
    [getItemValue, items],
  );

  const handleAddRow = () => {
    setSearchTerm('');
    setIsAddingRow(true);
    setNewValue('');
  };

  const handleCreateItem = async () => {
    if (isCreating) {
      return;
    }

    const trimmedValue = newValue.trim();
    if (!trimmedValue) {
      showErrorToast(requiredMessage);
      return;
    }

    if (hasDuplicateValue(trimmedValue)) {
      showErrorToast(duplicateMessage);
      return;
    }

    setIsCreating(true);
    try {
      await apiClient.post(`${apiBase}.${upsertMethod}`, {
        [valueField]: trimmedValue,
      });
      showSuccessToast(createSuccessMessage);
      setIsAddingRow(false);
      setNewValue('');
      await loadItems();
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: createErrorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateItem = async (item) => {
    if (cancelledEditNamesRef.current.has(item.name)) {
      cancelledEditNamesRef.current.delete(item.name);
      return;
    }

    const nextValue = (rowDrafts[item.name] ?? getItemValue(item)).trim();
    const currentValue = getItemValue(item).trim();

    if (normalizeValue(nextValue) === normalizeValue(currentValue)) {
      setRowDrafts((current) => {
        const next = { ...current };
        delete next[item.name];
        return next;
      });
      return;
    }

    if (!nextValue) {
      showErrorToast(requiredMessage);
      return;
    }

    if (hasDuplicateValue(nextValue, item.name)) {
      showErrorToast(duplicateMessage);
      setRowDrafts((current) => ({ ...current, [item.name]: getItemValue(item) }));
      return;
    }

    setSavingItemName(item.name);
    try {
      const response = await apiClient.post(`${apiBase}.${upsertMethod}`, {
        name: item.name,
        [valueField]: nextValue,
      });
      const savedItem = unwrapFrappeMessage(response);
      setItems((current) =>
        current.map((entry) =>
          entry.name === item.name
            ? { ...entry, [valueField]: savedItem?.[valueField] || nextValue }
            : entry,
        ),
      );
      setRowDrafts((current) => {
        const next = { ...current };
        delete next[item.name];
        return next;
      });
      showSuccessToast(updateSuccessMessage);
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: updateErrorMessage,
      });
    } finally {
      setSavingItemName('');
    }
  };

  const handleNewValueKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCreateItem();
    }
    if (event.key === 'Escape') {
      setIsAddingRow(false);
      setNewValue('');
    }
  };

  const handleNewValueBlur = () => {
    if (newValue.trim()) {
      handleCreateItem();
    }
  };

  const handleExistingValueKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      const { name, value } = event.currentTarget.dataset;
      cancelledEditNamesRef.current.add(name);
      setRowDrafts((current) => ({ ...current, [name]: value || '' }));
      event.currentTarget.blur();
    }
  };

  const handleDisableItem = async () => {
    if (!selectedItem) {
      return;
    }

    setIsDisabling(true);
    try {
      await apiClient.post(`${apiBase}.${disableMethod}`, {
        name: selectedItem.name,
      });
      setItems((current) => current.filter((entry) => entry.name !== selectedItem.name));
      showSuccessToast(disableSuccessMessage);
      setSelectedItem(null);
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: disableErrorMessage,
      });
    } finally {
      setIsDisabling(false);
    }
  };

  return (
    <div className='w-full flex flex-col gap-10 items-center justify-center'>
      <div className='w-full flex items-center justify-between gap-[16px]'>
        <div className='w-1/2 flex flex-col items-start justify-start gap-1'>
          <span className='text-text-main-900 text-label-sm'>{title}</span>
          <span className='text-text-sub-500 text-paragraph-xs'>{subtitle}</span>
        </div>

        <div className='w-1/2 flex items-center justify-end gap-[16px]'>
          <div className='w-full'>
            <Input.Root size='medium'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  type='text'
                  placeholder={searchPlaceholder}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <Button.Root
            variant='primary'
            mode='filled'
            size='medium'
            type='button'
            onClick={handleAddRow}
            className='px-4 gap-[8px]'
            disabled={isAddingRow}
          >
            <Button.Icon as={RiAddLine} />
            {addButtonLabel}
          </Button.Root>
        </div>
      </div>

      <div className='w-full overflow-x-auto'>
        <Table.Root variant='compact'>
          <Table.Header>
            <Table.Row>
              <Table.Head>{columnHeader}</Table.Head>
              <Table.Head className='w-[72px] text-right'>Action</Table.Head>
            </Table.Row>
          </Table.Header>

          {isLoading ? (
            <Table.Body>
              {Array.from({ length: 6 }).map((_, index, array) => (
                <React.Fragment key={`crm-setup-skeleton-${index}`}>
                  <Table.Row>
                    <Table.Cell>
                      <div className='h-4 w-1/3 animate-pulse rounded-md bg-bg-weak-50' />
                    </Table.Cell>
                    <Table.Cell className='text-right'>
                      <div className='ml-auto h-8 w-8 animate-pulse rounded-md bg-bg-weak-50' />
                    </Table.Cell>
                  </Table.Row>
                  {index < array.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}
            </Table.Body>
          ) : (
            <Table.Body>
              {isAddingRow && (
                <>
                  <Table.Row>
                    <Table.Cell>
                      <input
                        ref={newValueInputRef}
                        value={newValue}
                        onChange={(event) => setNewValue(event.target.value)}
                        onBlur={handleNewValueBlur}
                        onKeyDown={handleNewValueKeyDown}
                        placeholder={newItemPlaceholder}
                        disabled={isCreating}
                        className='w-full rounded-lg border border-primary-base bg-bg-white-0 px-2 py-2 text-paragraph-sm text-text-main-900 outline-none ring-2 ring-primary-base/20 placeholder:text-text-soft-400 disabled:opacity-60'
                      />
                    </Table.Cell>
                    <Table.Cell className='text-right'>
                      <div className='flex justify-end'>
                        {isCreating && (
                          <span className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base/30 border-t-primary-base' />
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                  {filteredItems.length > 0 && <Table.RowDivider />}
                </>
              )}

              {filteredItems.map((item, index, array) => (
                <React.Fragment key={item.name}>
                  <Table.Row>
                    <Table.Cell>
                      <input
                        value={rowDrafts[item.name] ?? getItemValue(item)}
                        data-name={item.name}
                        data-value={getItemValue(item)}
                        onChange={(event) =>
                          setRowDrafts((current) => ({
                            ...current,
                            [item.name]: event.target.value,
                          }))
                        }
                        onBlur={() => handleUpdateItem(item)}
                        onKeyDown={handleExistingValueKeyDown}
                        disabled={savingItemName === item.name}
                        className='w-full rounded-lg border border-transparent bg-transparent px-2 py-2 text-paragraph-sm text-text-main-900 outline-none transition-colors focus:border-primary-base focus:bg-bg-white-0 focus:ring-2 focus:ring-primary-base/20 disabled:opacity-60'
                      />
                    </Table.Cell>
                    <Table.Cell className='text-right'>
                      <div className='flex justify-end'>
                        <Button.Root
                          type='button'
                          variant='error'
                          mode='ghost'
                          size='small'
                          className='px-2'
                          onClick={() => setSelectedItem(item)}
                          aria-label={`Disable ${columnHeader.toLowerCase()}`}
                          disabled={savingItemName === item.name}
                        >
                          <Button.Icon as={RiDeleteBinLine} />
                        </Button.Root>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                  {index < array.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}

              {!isAddingRow && filteredItems.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={2} className='py-16 text-center hover:bg-transparent'>
                    <div className='flex flex-col items-center justify-center gap-2'>
                      <p className='text-label-sm text-text-main-900'>{emptyTitle}</p>
                      <p className='text-paragraph-sm text-text-sub-500'>
                        {debouncedSearchTerm ? emptySearchMessage : emptyDefaultMessage}
                      </p>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          )}
        </Table.Root>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
          }
        }}
        title={disableModalTitle}
        description={disableModalDescription}
        item={selectedItem}
        onConfirm={handleDisableItem}
        isLoading={isDisabling}
        confirmLabel={disableConfirmLabel}
        loadingLabel={disableLoadingLabel}
      />
    </div>
  );
};

export default CrmSetupMasterList;
