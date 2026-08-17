import React, { useCallback, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiLayoutColumnLine,
  RiPencilLine,
  RiSearchLine,
  RiContactsBook2Line,
  RiMailLine,
  RiPhoneLine,
  RiPriceTag3Line,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Table from '@/components/ui/table';
import * as Modal from '@/components/ui/modal';
import * as Checkbox from '@/components/ui/checkbox';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import FieldRow from '@/components/ui/field-row';
import { PhoneInputController } from '@/components/ui/phone-input';

import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { capitalizeEachWordFirstLetter } from '@/lib/utils';

import {
  addPartnerContactThunk,
  deletePartnerContactThunk,
  fetchPartnerThunk,
  updatePartnerContactThunk,
} from '@/redux/partnerSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { ensureSinglePrimary } from '@/components/partner/partner-helper';

const DEFAULT_CONTACT = {
  contact_name: '',
  contact_designation: '',
  contact_email: '',
  mobile_number: '',
  is_primary: 0,
};

const normalizeContactForUi = (c) => {
  if (!c || typeof c !== 'object') return { ...DEFAULT_CONTACT };
  const primary =
    c.is_primary === 1 ||
    c.is_primary === true ||
    c.is_primary_contact === 1 ||
    c.is_primary_contact === true ||
    c.is_primary_contact === true;
  return {
    ...DEFAULT_CONTACT,
    name: c.name,
    contact_name: c.contact_name ?? c.name ?? '',
    contact_designation: c.contact_designation ?? c.designation ?? '',
    contact_email: c.contact_email ?? c.email ?? '',
    mobile_number: c.mobile_number ?? c.phone ?? '',
    department: c.department?.department_name ?? c.department ?? '',
    alt_mobile_number: c.alt_mobile_number ?? c.alt_mobile ?? '',
    is_primary: primary ? 1 : 0,
    originalContact: c,
  };
};

const PartnerContactModal = ({ open, onOpenChange, values, onSave, isEdit = false }) => {
  const { control, handleSubmit, reset } = useForm({ defaultValues: DEFAULT_CONTACT });

  React.useEffect(() => {
    if (open) reset(values || DEFAULT_CONTACT);
  }, [open, reset, values]);

  const onSubmit = (formValues) => {
    onSave(formValues);
    onOpenChange(false);
    reset(DEFAULT_CONTACT);
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[560px]' showClose={true}>
        <Modal.Header
          icon={RiContactsBook2Line}
          title={isEdit ? 'Edit Contact' : 'Add Contact'}
          description={
            isEdit ? 'Modify the details for this contact.' : 'Add details for this contact.'
          }
        />
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col'>
          <Modal.Body className='flex flex-col gap-6'>
            <div className='flex flex-col gap-3'>
              <h3 className='text-label-md text-neutral-500'>Contact Information</h3>
              <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                <FieldRow icon={RiPriceTag3Line} label='Contact Name' required>
                  <Controller
                    name='contact_name'
                    control={control}
                    render={({ field }) => (
                      <Input.Root size='xsmall' variant='borderless'>
                        <Input.Wrapper>
                          <Input.Input {...field} placeholder='Type here...' />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                </FieldRow>

                <FieldRow icon={RiPriceTag3Line} label='Designation'>
                  <Controller
                    name='contact_designation'
                    control={control}
                    render={({ field }) => (
                      <Input.Root size='xsmall' variant='borderless'>
                        <Input.Wrapper>
                          <Input.Input {...field} placeholder='Type here...' />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                </FieldRow>

                <FieldRow icon={RiMailLine} label='Email' required>
                  <Controller
                    name='contact_email'
                    control={control}
                    render={({ field }) => (
                      <Input.Root size='xsmall' variant='borderless'>
                        <Input.Wrapper>
                          <Input.Input {...field} type='email' placeholder='Type here...' />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                </FieldRow>

                <FieldRow icon={RiPhoneLine} label='Mobile' required>
                  <Controller
                    name='mobile_number'
                    control={control}
                    render={({ field }) => (
                      <PhoneInputController
                        value={field.value}
                        onChange={field.onChange}
                        size='xsmall'
                        variant='borderless'
                        placeholder='9876500011'
                        maxLength={15}
                      />
                    )}
                  />
                </FieldRow>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Controller
                name='is_primary'
                control={control}
                render={({ field }) => (
                  <Checkbox.Root
                    id='partner-contact-primary'
                    checked={field.value === 1}
                    onCheckedChange={(checked) => field.onChange(checked === true ? 1 : 0)}
                  />
                )}
              />
              <label
                htmlFor='partner-contact-primary'
                className='text-paragraph-sm text-text-sub-500 cursor-pointer'
              >
                Set as SPOC
              </label>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className='flex items-center justify-end gap-3 w-full'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button.Root>
              <Button.Root type='submit' size='medium'>
                {isEdit ? 'Save' : 'Add Contact'}
              </Button.Root>
            </div>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

const CONTACTS_TABLE_ID = 'partner-contacts-table';

const persistLocal = async (tableId, payload) => {
  try {
    localStorage.setItem(`column-config-${tableId}`, JSON.stringify(payload));
  } catch {
    // ignore
  }
  return payload;
};

const readLocal = async (tableId) => {
  try {
    const raw = localStorage.getItem(`column-config-${tableId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const PartnerContact = ({ partnerId, contacts = [], onPartnerUpdated }) => {
  const dispatch = useDispatch();

  const [search, setSearch] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  const normalizedContacts = useMemo(
    () => ensureSinglePrimary(contacts, normalizeContactForUi),
    [contacts],
  );

  const filteredContacts = useMemo(() => {
    const q = String(search || '')
      .trim()
      .toLowerCase();
    if (!q) return normalizedContacts;
    return normalizedContacts.filter((c) => {
      const name = String(c.contact_name || '').toLowerCase();
      const email = String(c.contact_email || '').toLowerCase();
      const phone = String(c.mobile_number || '').toLowerCase();
      const designation = String(c.contact_designation || '').toLowerCase();
      const department = String(c.department || '').toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        designation.includes(q) ||
        department.includes(q)
      );
    });
  }, [normalizedContacts, search]);

  const refreshPartner = useCallback(async () => {
    if (!partnerId) return;
    const doc = await dispatch(fetchPartnerThunk(partnerId)).unwrap();
    if (doc && typeof onPartnerUpdated === 'function') {
      onPartnerUpdated(doc);
    }
  }, [dispatch, partnerId, onPartnerUpdated]);

  const handleAdd = () => {
    setEditingContact(null);
    setIsContactModalOpen(true);
  };

  const handleEdit = (row) => {
    setEditingContact(row?.originalContact ?? row);
    setIsContactModalOpen(true);
  };

  const requestDelete = (row) => {
    setContactToDelete(row?.originalContact ?? row);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!partnerId || !contactToDelete) return;
    const contactId =
      contactToDelete?.name ?? contactToDelete?.contact_id ?? contactToDelete?.contact;
    if (!contactId) {
      showErrorToast(null, { defaultMessage: 'Contact id not found.' });
      return;
    }
    try {
      await dispatch(
        deletePartnerContactThunk({
          partner: partnerId,
          contact: contactId,
        }),
      ).unwrap();
      showSuccessToast('Contact deleted.');
      setDeleteModalOpen(false);
      setContactToDelete(null);
      await refreshPartner();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to delete contact' });
    }
  };

  const allColumnDefs = useMemo(
    () => [
      {
        id: 'contact_name',
        accessorKey: 'contact_name',
        columnLabel: 'Name',
        header: () => (
          <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Name</span>
        ),
        cell: ({ row }) => {
          const raw = row.original.contact_name;
          return (
            <span
              className='paragraph-small font-medium text-text-main-900'
              title={raw || undefined}
            >
              {raw || '--'}
            </span>
          );
        },
        enableSorting: false,
      },
      {
        id: 'mobile_number',
        accessorKey: 'mobile_number',
        columnLabel: 'Mobile Number',
        header: () => (
          <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
            Mobile Number
          </span>
        ),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {row.original.mobile_number || '--'}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'contact_email',
        accessorKey: 'contact_email',
        columnLabel: 'Email',
        header: () => (
          <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Email</span>
        ),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {row.original.contact_email || '--'}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'contact_designation',
        accessorKey: 'contact_designation',
        columnLabel: 'Designation',
        header: () => (
          <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Designation</span>
        ),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {row.original.contact_designation || '--'}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'department',
        accessorKey: 'department',
        columnLabel: 'Department',
        header: () => (
          <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Department</span>
        ),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {row.original.department || '--'}
          </span>
        ),
        enableSorting: false,
        visible: false,
      },
      {
        id: 'alt_mobile_number',
        accessorKey: 'alt_mobile_number',
        columnLabel: 'Alt. Mobile Number',
        header: () => (
          <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
            Alt. Mobile Number
          </span>
        ),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {row.original.alt_mobile_number || '--'}
          </span>
        ),
        enableSorting: false,
        visible: false,
      },
      {
        id: 'is_primary',
        accessorKey: 'is_primary',
        columnLabel: 'Primary',
        header: () => (
          <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Primary</span>
        ),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {row.original.is_primary === 1 ? 'Yes' : 'No'}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'actions',
        accessorKey: 'actions',
        columnLabel: 'Actions',
        enableHiding: false,
        header: () => null,
        cell: ({ row }) => (
          <div className='flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity'>
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='xsmall'
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(row.original);
              }}
              aria-label='Edit contact'
            >
              <Button.Icon as={RiPencilLine} />
            </Button.Root>
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='xsmall'
              onClick={(e) => {
                e.stopPropagation();
                requestDelete(row.original);
              }}
              aria-label='Delete contact'
            >
              <Button.Icon as={RiDeleteBinLine} />
            </Button.Root>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partnerId, onPartnerUpdated],
  );

  const defaultColumnConfig = useMemo(
    () => prepareColumnsForConfig(allColumnDefs),
    [allColumnDefs],
  );

  const columnConfigHook = useColumnConfig(
    CONTACTS_TABLE_ID,
    defaultColumnConfig,
    async (payload) => persistLocal(CONTACTS_TABLE_ID, payload),
    async () => readLocal(CONTACTS_TABLE_ID),
    { autoSave: true, debounce: 300 },
  );

  const visibleDefs = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfigHook.columns),
    [allColumnDefs, columnConfigHook.columns],
  );

  const table = useReactTable({
    data: filteredContacts,
    columns: visibleDefs,
    getCoreRowModel: getCoreRowModel(),
  });

  const onSaveContact = async (contactValues) => {
    if (!partnerId) return;
    const trimmedContactName = (contactValues.contact_name || '').trim();
    const fields = {
      contact_name: trimmedContactName ? capitalizeEachWordFirstLetter(trimmedContactName) : '',
      contact_designation: (contactValues.contact_designation || '').trim(),
      contact_email: (contactValues.contact_email || '').trim(),
      mobile_number: (contactValues.mobile_number || '').trim(),
      is_primary: contactValues.is_primary === 1 ? 1 : 0,
    };

    try {
      if (editingContact?.name) {
        await dispatch(
          updatePartnerContactThunk({
            contact_id: editingContact.name,
            fields,
          }),
        ).unwrap();
        showSuccessToast('Contact updated.');
      } else {
        await dispatch(
          addPartnerContactThunk({
            partner: partnerId,
            ...fields,
          }),
        ).unwrap();
        showSuccessToast('Contact added.');
      }
      await refreshPartner();
    } catch (error) {
      let serverMessage = '';

      try {
        const raw = error?.response?.data?._server_messages;
        if (raw) {
          const parsed = JSON.parse(raw);
          const msgObj = JSON.parse(parsed[0]);
          serverMessage = msgObj.message || '';
        }
      } catch {
        serverMessage = error?.response?.data?.exception || error?.message || '';
      }

      if (serverMessage.toLowerCase().includes('not valid')) {
        showErrorToast(null, { defaultMessage: 'Invalid Mobile Number' });
      } else {
        showErrorToast(error, {
          defaultMessage: editingContact ? 'Failed to update contact' : 'Failed to add contact',
        });
      }
    }
  };

  return (
    <div className='flex flex-col gap-3 py-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <Input.Root className='w-full lg:w-[372px]'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine />
            </Input.Icon>
            <Input.Input
              placeholder='Search here...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label='Search contacts'
            />
          </Input.Wrapper>
        </Input.Root>

        <div className='flex flex-wrap items-center gap-3'>
          <ColumnManagerDropdown
            open={isColumnManagerOpen}
            onOpenChange={setIsColumnManagerOpen}
            config={columnConfigHook}
            tooltipContent={<p>Column Manager</p>}
            trigger={
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                className='gap-1'
                aria-label='Columns'
              >
                <Button.Icon>
                  <RiLayoutColumnLine size={20} />
                </Button.Icon>
              </Button.Root>
            }
          />

          <Button.Root size='xsmall' className='gap-1' onClick={handleAdd}>
            <Button.Icon as={RiAddLine} size={18} />
            Add Contact
          </Button.Root>
        </div>
      </div>

      <div className='w-full overflow-hidden rounded-xl  border-stroke-soft-200 bg-bg-white-0 '>
        <Table.Root variant='compact' className='w-full'>
          <Table.Header className='bg-bg-weak-50'>
            <Table.Row>
              {table
                .getHeaderGroups()
                .map((headerGroup) =>
                  headerGroup.headers.map((header) => (
                    <Table.Head key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </Table.Head>
                  )),
                )}
            </Table.Row>
          </Table.Header>
          <Table.Body spacing={8}>
            {table.getRowModel().rows.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={visibleDefs.length} className='py-16 text-center'>
                  <span className='text-paragraph-sm text-text-soft-400'>No contacts found.</span>
                </Table.Cell>
              </Table.Row>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <React.Fragment key={row.id}>
                  <Table.Row className='group/row'>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {idx < table.getRowModel().rows.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </div>

      <PartnerContactModal
        open={isContactModalOpen}
        onOpenChange={(open) => {
          setIsContactModalOpen(open);
          if (!open) setEditingContact(null);
        }}
        values={editingContact ? normalizeContactForUi(editingContact) : undefined}
        isEdit={Boolean(editingContact)}
        onSave={onSaveContact}
      />

      <Modal.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <Modal.Content className='max-w-[450px]' showClose={false}>
          <Modal.Body className='px-5 py-8'>
            <div className='flex flex-col items-center gap-4'>
              <div className='flex flex-col gap-1 items-center text-center'>
                <h3 className='text-label-md text-text-sub-500'>Remove Contact?</h3>
                <p className='text-paragraph-sm text-text-sub-500'>
                  Are you sure you want to remove this contact?
                </p>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className='flex items-center justify-end gap-3 w-full'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={() => {
                  setDeleteModalOpen(false);
                  setContactToDelete(null);
                }}
              >
                Cancel
              </Button.Root>
              <Button.Root type='button' variant='primary' size='small' onClick={confirmDelete}>
                Confirm
              </Button.Root>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
};

export default PartnerContact;
