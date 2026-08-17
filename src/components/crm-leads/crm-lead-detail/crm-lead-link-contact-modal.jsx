import React, { useEffect, useMemo, useState } from 'react';
import { RiUserAddLine } from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getCrmAccountContacts } from '@/api/crmAccounts';

/**
 * Modal to link an existing account contact to a lead, or open create-new flow.
 */
const CrmLeadLinkContactModal = ({
  open,
  onOpenChange,
  accountId = '',
  linkedContactIds = [],
  onLink,
  onCreateNew,
  isSubmitting = false,
}) => {
  const [options, setOptions] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [selectedContact, setSelectedContact] = useState('');

  const linkedSet = useMemo(
    () => new Set((linkedContactIds || []).map((id) => String(id).trim()).filter(Boolean)),
    [linkedContactIds],
  );

  const availableOptions = useMemo(
    () => options.filter((opt) => !linkedSet.has(String(opt.value).trim())),
    [options, linkedSet],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedContact('');
    if (!accountId) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setIsLoadingOptions(true);
    getCrmAccountContacts(accountId)
      .then((list) => {
        if (cancelled) return;
        const mapped = (Array.isArray(list) ? list : []).map((c) => ({
          value: c.name || c.value,
          label: c.full_name || c.label || c.name || c.value || '—',
        }));
        setOptions(mapped.filter((o) => o.value));
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, accountId]);

  const handleClose = () => {
    if (isSubmitting) return;
    onOpenChange?.(false);
  };

  const handleLink = async () => {
    if (!selectedContact) return;
    await onLink?.(selectedContact);
  };

  return (
    <Modal.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <Modal.Content className='max-w-[450px]' showClose>
        <Modal.Header
          icon={RiUserAddLine}
          title='Add contact'
          description='Link an existing contact from this lead’s account, or create a new one.'
        />

        <Modal.Body>
          <div className='flex flex-col gap-4'>
            {!accountId ? (
              <p className='text-paragraph-sm text-error-base'>
                Link an account to this lead before adding contacts.
              </p>
            ) : (
              <div className='flex flex-col gap-1'>
                <Label.Root>Contact</Label.Root>
                <SearchableSelect
                  value={selectedContact}
                  onValueChange={setSelectedContact}
                  options={availableOptions}
                  placeholder={isLoadingOptions ? 'Loading contacts...' : 'Select contact'}
                  searchPlaceholder='Search contacts...'
                  noResultsMessage='No available contacts for this account'
                  emptyMessage='No contacts available'
                  disabled={isSubmitting || isLoadingOptions}
                />
              </div>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <div className='flex w-full items-center justify-between gap-3'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isSubmitting || !accountId}
              onClick={() => {
                onOpenChange?.(false);
                onCreateNew?.();
              }}
            >
              Create new
            </Button.Root>
            <div className='flex items-center gap-3'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='button'
                variant='primary'
                size='small'
                disabled={isSubmitting || !accountId || !selectedContact}
                onClick={handleLink}
              >
                {isSubmitting ? 'Linking...' : 'Link contact'}
              </Button.Root>
            </div>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CrmLeadLinkContactModal;
