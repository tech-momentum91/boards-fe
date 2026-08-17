import * as Button from '@/components/ui/button';
import * as Table from '@/components/ui/table';
import * as Input from '@/components/ui/input';
import {
  RiAlertLine,
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiPencilLine,
  RiSearchLine,
} from 'react-icons/ri';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import emptyState from '@/assets/images/empty-state.png';
import CenterEmergencyContactModal from '@/components/centers-management/center-emergency-contact-modal';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { useDispatch, useSelector } from 'react-redux';
import {
  createEmergencyContactThunk,
  deleteEmergencyContactThunk,
  fetchEmergencyContactCategoriesThunk,
  fetchEmergencyContactsThunk,
  selectEmergencyContactCategories,
  selectEmergencyContactsList,
  updateEmergencyContactThunk,
} from '@/redux/emergencyContactsSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useDebounce } from '@/hooks/use-debounce';
import { hasModulePermission } from '@/utils/user-role-utils';

function EmergencyContactsTable({
  rows,
  headColumns,
  columnWidths,
  emptyText,
  canWrite,
  showActions,
  showSpacer,
  onView,
  onEdit,
  onDelete,
  onCopy,
}) {
  return (
    <div className='flex shrink-0 w-full min-h-0 overflow-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
      <Table.Root variant='compact' className='table-fixed w-full'>
        <Table.Header>
          <Table.Row>
            {headColumns.map((item, index) => (
              <Table.Head
                key={`${item || 'spacer'}-${index}`}
                className={`bg-bg-weak-50 text-text-sub-600 ${columnWidths[index]}`}
              >
                {item}
              </Table.Head>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((contact) => (
            <Table.Row
              key={contact.id}
              role='button'
              tabIndex={0}
              onClick={() => onView(contact)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onView(contact);
                }
              }}
              className='group/row paragraph-small border-b border-stroke-soft-200 text-text-main-900 cursor-pointer hover:bg-bg-weak-50'
            >
              <Table.Cell className={`whitespace-nowrap ${columnWidths[0]}`}>
                {contact.contact_name}
              </Table.Cell>
              <Table.Cell className={`whitespace-nowrap ${columnWidths[1]}`}>
                {contact.category}
              </Table.Cell>
              <Table.Cell className={`whitespace-nowrap ${columnWidths[2]}`}>
                <div className='flex w-full items-center justify-between gap-2'>
                  <span>{contact.contact_number || '—'}</span>
                  {contact.contact_number ? (
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='ghost'
                      size='xsmall'
                      className='size-7 p-0 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100'
                      title='Copy contact number'
                      aria-label='Copy contact number'
                      onClick={(e) => onCopy(contact.contact_number, e)}
                    >
                      <RiFileCopyLine className='size-4' />
                    </Button.Root>
                  ) : null}
                </div>
              </Table.Cell>

              {showSpacer && canWrite ? <Table.Cell className={columnWidths[3]} /> : null}

              {showActions && canWrite ? (
                <Table.Cell
                  className={`whitespace-nowrap ${columnWidths[3]}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className='flex items-center gap-1'>
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='ghost'
                      size='xsmall'
                      className='size-8 p-0'
                      title='Edit contact'
                      onClick={(e) => onEdit(contact, e)}
                      aria-label='Edit contact'
                    >
                      <RiPencilLine className='size-4' />
                    </Button.Root>
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='ghost'
                      size='xsmall'
                      className='size-8 p-0 text-error-base hover:text-error-base'
                      title='Delete contact'
                      onClick={(e) => onDelete(contact, e)}
                      aria-label='Delete contact'
                      disabled={Number(contact?.is_common || 0) === 1}
                    >
                      <RiDeleteBinLine className='size-4' />
                    </Button.Root>
                  </div>
                </Table.Cell>
              ) : null}
            </Table.Row>
          ))}
          {rows.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={headColumns.length}>
                <div className='py-6 text-center text-paragraph-sm text-text-sub-600'>
                  {emptyText}
                </div>
              </Table.Cell>
            </Table.Row>
          ) : null}
        </Table.Body>
      </Table.Root>
    </div>
  );
}

/**
 * @param {{ centerDetails?: { name?: string; state?: string; city?: string } }} props
 */
const CenterDetailEmergenceyContact = ({ centerDetails }) => {
  const dispatch = useDispatch();
  const categoriesState = useSelector(selectEmergencyContactCategories);
  const contactsState = useSelector(selectEmergencyContactsList);
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const canWrite = hasModulePermission(userSideBarPerm, 'Center', 'write');
  const commonHeadColumns = canWrite
    ? ['Name', 'Category', 'Contact', '']
    : ['Name', 'Category', 'Contact'];
  const centerHeadColumns = canWrite
    ? ['Name', 'Category', 'Contact', 'Action']
    : ['Name', 'Category', 'Contact'];
  const columnWidths = canWrite
    ? [
        'w-[45%] min-w-[280px]',
        'w-[27%] min-w-[180px]',
        'w-[18%] min-w-[140px]',
        'w-[10%] min-w-[96px]',
      ]
    : ['w-[50%] min-w-[280px]', 'w-[30%] min-w-[200px]', 'w-[20%] min-w-[140px]'];
  const centerIdRef = useRef(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [activeContact, setActiveContact] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNationalOpen, setIsNationalOpen] = useState(true);
  const [isCenterOpen, setIsCenterOpen] = useState(true);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const centerId = centerDetails?.name || null;
  const commonContacts = contactsState.commonContacts || [];
  const specificContacts = contactsState.contacts || [];
  const categories = categoriesState.data || [];

  const refetchCenterContacts = useCallback(() => {
    if (!centerId) return;
    dispatch(fetchEmergencyContactsThunk({ centerId, keyword: debouncedSearch }));
  }, [dispatch, centerId, debouncedSearch]);

  useEffect(() => {
    dispatch(fetchEmergencyContactCategoriesThunk());
  }, [dispatch]);

  useEffect(() => {
    if (!centerId) return;
    if (centerIdRef.current !== centerId) {
      centerIdRef.current = centerId;
    }
    refetchCenterContacts();
  }, [centerId, refetchCenterContacts]);

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
    if (Number(contact?.is_common || 0) === 1) return;
    setDeleteTarget(contact);
  }, []);

  const copyContactNumber = useCallback(async (number, e) => {
    e?.stopPropagation?.();
    e?.currentTarget?.blur?.();
    const text = String(number || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showSuccessToast('Contact number copied.');
    } catch {
      showErrorToast('Failed to copy contact number.');
    }
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
              center: centerId,
            }),
          ).unwrap();
          showSuccessToast('Emergency contact added successfully.');
        }
        refetchCenterContacts();
        dispatch(fetchEmergencyContactCategoriesThunk());
      } catch (error) {
        showErrorToast(error);
      }
    },
    [centerId, dispatch, modalMode, refetchCenterContacts],
  );

  const confirmDelete = useCallback(
    async (item) => {
      const target = item || deleteTarget;
      if (!target?.id) return;
      try {
        await dispatch(deleteEmergencyContactThunk({ id: target.id })).unwrap();
        showSuccessToast('Emergency contact deleted successfully.');
        setDeleteTarget(null);
        refetchCenterContacts();
      } catch (error) {
        showErrorToast(error);
      }
    },
    [deleteTarget, dispatch, refetchCenterContacts],
  );

  if (!centerDetails?.name) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-5 py-12'>
        <img className='object-contain max-w-[200px]' src={emptyState} alt='no data' />
        <span className='label-medium text-text-soft-400'>Loading center…</span>
      </div>
    );
  }

  return (
    <div className='flex h-full flex-col gap-6'>
      <div className='flex items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <RiAlertLine size={20} className='text-text-sub-500' />
          <h2 className='text-title-h6 text-text-strong-950'>Emergency Contact</h2>
        </div>
        {canWrite ? (
          <div className='flex items-center gap-2'>
            <Button.Root variant='primary' size='small' onClick={openAdd} className='gap-1'>
              <Button.Icon as={RiAddLine} />
              Add Contact
            </Button.Root>
          </div>
        ) : null}
      </div>

      <Input.Root size='xsmall' className='max-w-[360px]'>
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

      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <button
            type='button'
            onClick={() => setIsNationalOpen((prev) => !prev)}
            className='label-small flex items-center gap-1 font-medium text-[var(--color-text-sub-500)] cursor-pointer hover:opacity-80 transition-opacity w-full text-left'
            aria-expanded={isNationalOpen}
          >
            National Emergency Numbers
            <span className='text-text-soft-400 font-normal'>({commonContacts.length})</span>
            {isNationalOpen ? (
              <RiArrowUpSLine size={16} className='shrink-0' />
            ) : (
              <RiArrowDownSLine size={16} className='shrink-0' />
            )}
          </button>
          {isNationalOpen ? (
            <EmergencyContactsTable
              rows={commonContacts}
              headColumns={commonHeadColumns}
              columnWidths={columnWidths}
              emptyText='No national emergency numbers found.'
              canWrite={canWrite}
              showSpacer
              showActions={false}
              onView={openView}
              onEdit={openEdit}
              onDelete={requestDelete}
              onCopy={copyContactNumber}
            />
          ) : null}
        </div>

        <div className='flex flex-col gap-2'>
          <button
            type='button'
            onClick={() => setIsCenterOpen((prev) => !prev)}
            className='label-small flex items-center gap-1 font-medium text-[var(--color-text-sub-500)] cursor-pointer hover:opacity-80 transition-opacity w-full text-left'
            aria-expanded={isCenterOpen}
          >
            Center Emergency Contacts
            <span className='text-text-soft-400 font-normal'>({specificContacts.length})</span>
            {isCenterOpen ? (
              <RiArrowUpSLine size={16} className='shrink-0' />
            ) : (
              <RiArrowDownSLine size={16} className='shrink-0' />
            )}
          </button>
          {isCenterOpen ? (
            <EmergencyContactsTable
              rows={specificContacts}
              headColumns={centerHeadColumns}
              columnWidths={columnWidths}
              emptyText='No center emergency contacts found.'
              canWrite={canWrite}
              showSpacer={false}
              showActions
              onView={openView}
              onEdit={openEdit}
              onDelete={requestDelete}
              onCopy={copyContactNumber}
            />
          ) : null}
        </div>
      </div>

      <CenterEmergencyContactModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        contact={modalMode === 'add' ? null : activeContact}
        centerDetails={centerDetails}
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
        description='This contact will be removed from the list for this center.'
        item={deleteTarget}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default CenterDetailEmergenceyContact;
