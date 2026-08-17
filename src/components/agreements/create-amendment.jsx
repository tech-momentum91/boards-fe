import React, { useMemo } from 'react';
import CreateNewAgreementDrawer from '@/components/agreements/create-new-agreement';
import { defaultAgreementValues } from '@/schemas/agreements-schema';
import { showSuccessToast } from '@/utils/error-utils';
import { formatToDDMMYYYY } from '@/utils/date-utils';
import { buildAmendmentSpaceDetailsById } from '@/components/agreements/amendment-space-form';

const parseIntegerLike = (value) => {
  if (value == null || value === '') return undefined;
  const num = Number.parseInt(String(value).replaceAll(/\D/g, ''), 10);
  return Number.isNaN(num) ? undefined : num;
};

const parsePercentToNumber = (value) => {
  if (value == null || value === '') return undefined;
  const normalized = String(value).replace('%', '').trim();
  const num = Number(normalized);
  return Number.isNaN(num) ? undefined : num;
};

/** Child-table rows from the API use `space` as a link object; the form expects string ids. */
function normalizeAgreementSpaceToIds(spaceField) {
  const toParts = (raw) => {
    if (raw == null || raw === '') return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object') {
      return [raw];
    }
    const s = String(raw).trim();
    if (!s) return [];
    if (s.includes(',')) {
      return s
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    }
    return [s];
  };

  return toParts(spaceField)
    .map((item) => {
      if (item == null || item === '') return null;
      if (typeof item === 'object') {
        return item.space ?? item.assign_space_id ?? item.name ?? null;
      }
      return String(item);
    })
    .filter(Boolean);
}

const mapAgreementToFormValues = (agreement) => {
  if (!agreement) return;

  return {
    parent_agreement_id: agreement?.name ?? '',
    change_type: '',
    client: agreement.client ?? '',
    center: agreement.center ?? '',
    space: normalizeAgreementSpaceToIds(agreement.space),
    monthly_revenue: agreement.monthly_revenue ?? '',
    no_of_monthly_deposit: parseIntegerLike(agreement.no_of_monthly_deposit),
    sec_deposit_amt: parseIntegerLike(agreement?.sec_deposit_amt ?? undefined),
    notice_period_client: parseIntegerLike(agreement.notice_period_of_client),
    notice_period_devx: parseIntegerLike(agreement.notice_period_of_devx),
    roc: true,
    agreement_start_date: formatToDDMMYYYY(agreement.agreement_start_date),
    rent_start_date: formatToDDMMYYYY(agreement.rent_start_date),
    contract_end_date: formatToDDMMYYYY(agreement.agreement_end_date),
    lock_in_period: parseIntegerLike(agreement.lock_in_period),
    lock_in_end_date: formatToDDMMYYYY(agreement.lock_in_end_date),
    increment_date:
      agreement.increment_date && agreement.increment_date !== '-'
        ? formatToDDMMYYYY(agreement.increment_date)
        : '',
    annual_escalation: parsePercentToNumber(agreement.annual_escalation),
    escalation_years: agreement.escalation_years != null ? String(agreement.escalation_years) : '',
    payment_due_day:
      agreement.payment_due_day != null && agreement.payment_due_day !== ''
        ? String(agreement.payment_due_day)
        : defaultAgreementValues.payment_due_day,
    membership_plan: agreement.membership_plan ?? '',
    no_of_seats: parseIntegerLike(agreement.no_of_seats),
    area: parseIntegerLike(agreement.area),
    price_per_seat: parseIntegerLike(agreement.price_per_seat),
    photos: [],
    notes: agreement.notes ?? '',
  };
};

const CreateAmendment = ({
  open,
  onOpenChange,
  baseAgreement,
  customerSpacesStatus,
  assignSpaceStatusById,
  pendingSpaceDetailsById,
  onSubmit,
}) => {
  const initialValues = useMemo(() => {
    if (!baseAgreement) return;
    const base = mapAgreementToFormValues(baseAgreement);
    let merged = base;
    if (customerSpacesStatus) merged = { ...merged, customerSpacesStatus };
    if (assignSpaceStatusById && Object.keys(assignSpaceStatusById).length > 0) {
      merged = { ...merged, assignSpaceStatusById };
    }
    if (!merged?.parent_agreement_id) return merged;
    const spaceIds = normalizeAgreementSpaceToIds(baseAgreement.space);
    const fromAgreement = buildAmendmentSpaceDetailsById(spaceIds, baseAgreement) || {};
    const fromPending = pendingSpaceDetailsById || {};
    const spaceDetailsById = { ...fromPending, ...fromAgreement };
    return Object.keys(spaceDetailsById).length > 0 ? { ...merged, spaceDetailsById } : merged;
  }, [baseAgreement, customerSpacesStatus, assignSpaceStatusById, pendingSpaceDetailsById]);

  const handleSuccess = (data) => {
    showSuccessToast('Amendment created successfully.');
    if (onSubmit) {
      onSubmit(data, baseAgreement);
    }
  };

  return (
    <CreateNewAgreementDrawer
      open={open}
      setOpen={onOpenChange}
      onSuccess={handleSuccess}
      title='Add Amendment'
      description='Update below details to add an amendment.'
      initialValues={initialValues}
    />
  );
};

export default CreateAmendment;
