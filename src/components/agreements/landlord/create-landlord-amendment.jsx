import React, { useMemo } from 'react';
import CreateNewLandlordAgreementDrawer from '@/components/agreements/landlord/create-new-landlord-agreement';
import { defaultLandlordAgreementValues } from '@/schemas/landlord-agreements-schema';
import { showSuccessToast } from '@/utils/error-utils';
import { formatToDDMMYYYY } from '@/utils/date-utils';

const parseIntegerLike = (value) => {
  if (value == null || value === '') return undefined;
  const num = Number.parseInt(String(value).replaceAll(/\D/g, ''), 10);
  return Number.isNaN(num) ? undefined : num;
};

const mapLandlordAgreementToFormValues = (agreement) => {
  if (!agreement) return;

  return {
    ...defaultLandlordAgreementValues,
    parent_agreement_id: agreement?.name ?? '',
    landlord: agreement.landlord ?? '',
    center: agreement.center ?? '',
    center_name: agreement.center_name ?? '',
    office: agreement.office ?? '',
    spoc_name: agreement.spoc_name ?? '',
    spoc_contact: agreement.spoc_contact ?? '',
    spoc_email: agreement.spoc_email ?? '',
    parking: agreement.parking ?? '',
    notice_period: parseIntegerLike(agreement.notice_period_of_client ?? agreement.notice_period),
    lock_in_period: parseIntegerLike(agreement.landlord_lock_in_period ?? agreement.lock_in_period),
    agreement_start_date: formatToDDMMYYYY(agreement.agreement_start_date),
    rent_start_date: formatToDDMMYYYY(
      agreement.landlord_rent_start_date ?? agreement.rent_start_date,
    ),
    agreement_end_date: formatToDDMMYYYY(
      agreement.landlord_agreement_end_date ?? agreement.agreement_end_date,
    ),
    lock_in_end_date: formatToDDMMYYYY(
      agreement.landlord_lock_in_end_date ?? agreement.lock_in_end_date,
    ),
    photos: [],
    // For amendment flow, ROC is always true and Change Type is required.
    roc: true,
    change_type: '',
  };
};

const CreateLandlordAmendment = ({
  open,
  onOpenChange,
  baseAgreement,
  onSubmit,
  permissions = {},
}) => {
  const initialValues = useMemo(
    () => mapLandlordAgreementToFormValues(baseAgreement),
    [baseAgreement],
  );

  const handleSuccess = (data) => {
    showSuccessToast('Landlord amendment created successfully.');
    if (onSubmit) {
      onSubmit(data, baseAgreement);
    }
  };

  return (
    <CreateNewLandlordAgreementDrawer
      open={open}
      setOpen={onOpenChange}
      onSuccess={handleSuccess}
      title='Add Landlord Amendment'
      description='Update below details to add a landlord agreement amendment.'
      initialValues={initialValues}
      permissions={permissions}
    />
  );
};

export default CreateLandlordAmendment;
