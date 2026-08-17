import React, { useState } from 'react';
import { RiMapPin2Line, RiPencilLine, RiAddLine } from 'react-icons/ri';
import * as CompactButton from '@/components/ui/compact-button';
import * as Button from '@/components/ui/button';
import CrmAccountEditAddressModal from './crm-account-edit-address-modal';

const AddressCard = ({ title, address, companyLegalName = '', onEdit }) => {
  const legalName = String(companyLegalName || '').trim();
  const parts = [
    address?.address_line1,
    address?.address_line2,
    address?.city,
    address?.state,
    address?.pin_code,
    address?.country,
  ]
    .filter(Boolean)
    .join(', ');

  if (!legalName && !parts) return null;

  return (
    <div className='group relative flex flex-1 flex-col gap-1.5 rounded-xl border border-stroke-soft-200 p-3'>
      <div className='text-subheading-xs uppercase tracking-wider opacity-72 text-text-sub-500'>
        {title}
      </div>
      <div className='flex flex-col gap-0.5 pr-10'>
        {legalName ? (
          <div className='text-paragraph-sm font-medium text-text-main-900'>{legalName}</div>
        ) : null}
        {parts ? <div className='text-paragraph-sm text-text-sub-500'>{parts}</div> : null}
      </div>
      {onEdit && (
        <div className='absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
          <CompactButton.Root size='large' variant='stroke' onClick={onEdit}>
            <CompactButton.Icon as={RiPencilLine} />
          </CompactButton.Root>
        </div>
      )}
    </div>
  );
};

const AddAddressCard = ({ title, onAdd }) => (
  <div className='flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stroke-soft-200 p-3 text-center'>
    <div className='text-subheading-xs uppercase tracking-wider opacity-72 text-text-sub-500'>
      {title}
    </div>
    <Button.Root
      type='button'
      variant='neutral'
      mode='stroke'
      size='xsmall'
      className='gap-1'
      onClick={onAdd}
    >
      <Button.Icon>
        <RiAddLine size={18} />
      </Button.Icon>
      Add Address
    </Button.Root>
  </div>
);

const CrmAccountAboutAddresses = ({ account, onAddressUpdate, onAddressModalSave }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState('primary');

  const primaryAddress = account?.primary_address || null;
  const billingAddress = account?.billing_address || null;
  const companyLegalName = account?.custom_legal_name ?? '';
  const hasPrimary =
    Boolean(String(companyLegalName).trim()) ||
    (primaryAddress && Object.values(primaryAddress).some(Boolean));
  const hasBilling = billingAddress && Object.values(billingAddress).some(Boolean);

  const handleEditClick = (type) => {
    setEditingType(type);
    setModalOpen(true);
  };

  const handleSave = async ({ primary, billing, custom_legal_name }) => {
    const legalNameChanged =
      custom_legal_name !== undefined &&
      String(custom_legal_name).trim() !== String(companyLegalName).trim();

    if (onAddressModalSave) {
      await onAddressModalSave({
        primary,
        billing,
        ...(legalNameChanged && { custom_legal_name }),
      });
      return;
    }

    if (primary) await onAddressUpdate?.('primary', primary);
    if (billing) await onAddressUpdate?.('billing', billing);
  };

  return (
    <>
      <div className='flex flex-col gap-3 border-t border-stroke-soft-200 py-4'>
        <div className='flex items-center gap-2'>
          <RiMapPin2Line size={20} className='text-text-soft-400' />
          <span className='text-label-md text-text-sub-500'>Address</span>
        </div>

        <div className='flex gap-3'>
          {hasPrimary ? (
            <AddressCard
              title='PRIMARY ADDRESS'
              address={primaryAddress}
              companyLegalName={companyLegalName}
              onEdit={() => handleEditClick('primary')}
            />
          ) : (
            <AddAddressCard title='PRIMARY ADDRESS' onAdd={() => handleEditClick('primary')} />
          )}
          {hasBilling ? (
            <AddressCard
              title='BILLING ADDRESS'
              address={billingAddress}
              onEdit={() => handleEditClick('billing')}
            />
          ) : (
            <AddAddressCard title='BILLING ADDRESS' onAdd={() => handleEditClick('billing')} />
          )}
        </div>
      </div>

      <CrmAccountEditAddressModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        addressType={editingType}
        primaryAddress={primaryAddress}
        billingAddress={billingAddress}
        companyLegalName={companyLegalName}
        onSave={handleSave}
      />
    </>
  );
};

export default CrmAccountAboutAddresses;
