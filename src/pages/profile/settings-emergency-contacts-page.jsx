import * as Button from '@/components/ui/button';
import * as Table from '@/components/ui/table';
import * as Input from '@/components/ui/input';
import {
  RiAddLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiDeleteBinLine,
  RiPencilLine,
  RiSearchLine,
} from 'react-icons/ri';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import CenterEmergencyContactModal from '@/components/centers-management/center-emergency-contact-modal';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { useDispatch, useSelector } from 'react-redux';
import {
  createEmergencyContactThunk,
  deleteEmergencyContactThunk,
  fetchEmergencyContactCategoriesThunk,
  fetchEmergencyContactsThunk,
  selectEmergencyContactCategories,
  selectEmergencyContactsSettingsList,
  updateEmergencyContactThunk,
} from '@/redux/emergencyContactsSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useDebounce } from '@/hooks/use-debounce';
import { hasModulePermission } from '@/utils/user-role-utils';

const PAGE_SIZE = 20;

/** Matches `role["Emergency Contacts"]` from sidebar / permissions API. */
const EMERGENCY_CONTACTS_MODULE = 'Emergency Contacts';

/**
 * Settings → Emergency Contacts: manage **common** (`is_common`) numbers shown at all centers.
 */
const SettingsEmergencyContactsPage = () => {
  const dispatch = useDispatch();
  const categoriesState = useSelector(selectEmergencyContactCategories);
  const settingsState = useSelector(selectEmergencyContactsSettingsList);
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canCreate =
    hasModulePermission(userSideBarPerm, EMERGENCY_CONTACTS_MODULE, 'create') ||
    hasModulePermission(userSideBarPerm, EMERGENCY_CONTACTS_MODULE, 'write');
  const canEdit = hasModulePermission(userSideBarPerm, EMERGENCY_CONTACTS_MODULE, 'write');
  const canDelete = hasModulePermission(userSideBarPerm, EMERGENCY_CONTACTS_MODULE, 'delete');
  const showRowActions = canEdit || canDelete;
  const headColumns = showRowActions
    ? ['Name', 'Category', 'Contact', 'Action']
    : ['Name', 'Category', 'Contact'];

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [activeContact, setActiveContact] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const lastSearchRef = useRef(debouncedSearch);

  const items = settingsState.items || [];
  const pagination = settingsState.pagination || {};
  const totalPages = Math.max(1, Number(pagination.total_pages) || 1);

  const categories = categoriesState.data || [];

  useEffect(() => {
    dispatch(fetchEmergencyContactCategoriesThunk());
  }, [dispatch]);

  useEffect(() => {
    const searchChanged = lastSearchRef.current !== debouncedSearch;
    lastSearchRef.current = debouncedSearch;
    const effectivePage = searchChanged ? 1 : page;
    if (searchChanged && page !== 1) {
      setPage(1);
    }
    dispatch(
      fetchEmergencyContactsThunk({
        forSettings: true,
        keyword: debouncedSearch,
        page: effectivePage,
        limit_page_length: PAGE_SIZE,
      }),
    );
  }, [dispatch, debouncedSearch, page]);

  const openAdd = useCallback(() => {
    setModalMode('add');
    setActiveContact(null);
    setModalOpen(true);
  }, []);

  const openView = useCallback((contact) => {
    setModalMode('view');
    setActiveContact(contact);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((contact, e) => {
    e?.stopPropagation?.();
    setModalMode('edit');
    setActiveContact(contact);
    setModalOpen(true);
  }, []);

  const requestDelete = useCallback((contact, e) => {
    e?.stopPropagation?.();
    setDeleteTarget(contact);
  }, []);

  const handleModalSave = useCallback(
    async (payload) => {
      try {
        const apiPayload = {
          contact_name: payload.contact_name,
          contact_number: payload.contact_number,
          category: payload.category,
        };

        if (modalMode === 'edit' && payload.id) {
          await dispatch(
            updateEmergencyContactThunk({ id: payload.id, payload: apiPayload }),
          ).unwrap();
          showSuccessToast('Emergency contact updated successfully.');
        } else {
          await dispatch(
            createEmergencyContactThunk({
              ...apiPayload,
              is_common: 1,
            }),
          ).unwrap();
          showSuccessToast('Emergency contact added successfully.');
        }
        dispatch(
          fetchEmergencyContactsThunk({
            forSettings: true,
            keyword: debouncedSearch,
            page,
            limit_page_length: PAGE_SIZE,
          }),
        );
        dispatch(fetchEmergencyContactCategoriesThunk());
      } catch (error) {
        showErrorToast(error);
      }
    },
    [debouncedSearch, dispatch, modalMode, page],
  );

  const confirmDelete = useCallback(
    async (item) => {
      const target = item || deleteTarget;
      if (!target?.id) return;
      try {
        await dispatch(deleteEmergencyContactThunk({ id: target.id })).unwrap();
        showSuccessToast('Emergency contact deleted successfully.');
        setDeleteTarget(null);
        dispatch(
          fetchEmergencyContactsThunk({
            forSettings: true,
            keyword: debouncedSearch,
            page,
            limit_page_length: PAGE_SIZE,
          }),
        );
      } catch (error) {
        showErrorToast(error);
      }
    },
    [debouncedSearch, deleteTarget, dispatch, page],
  );

  return (
    <div className='flex w-full min-w-0 flex-col gap-6'>
      <div className='flex flex-col items-start justify-center'>
        <span className='text-[var(--color-text-main-900)] label-small'>Emergency Contacts</span>
        <span className='text-[var(--color-text-sub-500)] paragraph-xsmall'>
          Manage national emergency numbers that appear automatically for every center.
        </span>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Input.Root size='xsmall' className='max-w-[360px] min-w-[220px]'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine />
            </Input.Icon>
            <Input.Input
              placeholder='Search emergency contacts'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Input.Wrapper>
        </Input.Root>
        {canCreate ? (
          <Button.Root variant='primary' size='small' onClick={openAdd} className='gap-1 shrink-0'>
            <Button.Icon as={RiAddLine} />
            Add Contact
          </Button.Root>
        ) : null}
      </div>

      <div className='flex shrink-0 w-full min-h-0 overflow-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
        <Table.Root variant='compact'>
          <Table.Header>
            <Table.Row>
              {headColumns.map((item) => (
                <Table.Head key={item} className='bg-bg-weak-50 text-text-sub-600'>
                  {item}
                </Table.Head>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {settingsState.isLoading ? (
              <Table.Row>
                <Table.Cell colSpan={headColumns.length}>
                  <div className='py-10 text-center text-paragraph-sm text-text-sub-600'>
                    Loading…
                  </div>
                </Table.Cell>
              </Table.Row>
            ) : null}
            {!settingsState.isLoading &&
              items.map((contact) => (
                <Table.Row
                  key={contact.id}
                  role='button'
                  tabIndex={0}
                  onClick={() => openView(contact)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openView(contact);
                    }
                  }}
                  className='group/row paragraph-small border-b border-stroke-soft-200 text-text-main-900 cursor-pointer hover:bg-bg-weak-50'
                >
                  <Table.Cell className='whitespace-nowrap'>{contact.contact_name}</Table.Cell>
                  <Table.Cell className='whitespace-nowrap'>{contact.category}</Table.Cell>
                  <Table.Cell className='whitespace-nowrap'>
                    {contact.contact_number || '—'}
                  </Table.Cell>
                  {showRowActions ? (
                    <Table.Cell className='whitespace-nowrap' onClick={(e) => e.stopPropagation()}>
                      <div className='flex items-center gap-1'>
                        {canEdit ? (
                          <Button.Root
                            type='button'
                            variant='neutral'
                            mode='ghost'
                            size='xsmall'
                            className='size-8 p-0'
                            title='Edit contact'
                            onClick={(e) => openEdit(contact, e)}
                            aria-label='Edit contact'
                          >
                            <RiPencilLine className='size-4' />
                          </Button.Root>
                        ) : null}
                        {canDelete ? (
                          <Button.Root
                            type='button'
                            variant='neutral'
                            mode='ghost'
                            size='xsmall'
                            className='size-8 p-0 text-error-base hover:text-error-base'
                            title='Delete contact'
                            onClick={(e) => requestDelete(contact, e)}
                            aria-label='Delete contact'
                          >
                            <RiDeleteBinLine className='size-4' />
                          </Button.Root>
                        ) : null}
                      </div>
                    </Table.Cell>
                  ) : null}
                </Table.Row>
              ))}
            {!settingsState.isLoading && items.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={headColumns.length}>
                  <div className='py-10 text-center text-paragraph-sm text-text-sub-600'>
                    No emergency contacts found.
                  </div>
                </Table.Cell>
              </Table.Row>
            ) : null}
          </Table.Body>
        </Table.Root>
      </div>

      {totalPages > 1 ? (
        <div className='flex items-center justify-between gap-3'>
          <span className='text-paragraph-sm text-text-sub-600'>
            Page {pagination.page ?? page} of {totalPages}
            {pagination.total_count != null ? ` · ${pagination.total_count} total` : ''}
          </span>
          <div className='flex items-center gap-2'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className='gap-1'
            >
              <RiArrowLeftLine className='size-4' />
              Previous
            </Button.Root>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className='gap-1'
            >
              Next
              <RiArrowRightLine className='size-4' />
            </Button.Root>
          </div>
        </div>
      ) : null}

      <CenterEmergencyContactModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        contact={modalMode === 'add' ? null : activeContact}
        useFullStdList
        categories={categories}
        isCategoriesLoading={categoriesState.isLoading}
        onSave={handleModalSave}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title='Delete emergency contact?'
        description='This national emergency number will be removed for all centers.'
        item={deleteTarget}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default SettingsEmergencyContactsPage;
