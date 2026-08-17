/**
 * @deprecated Use CrmSetup from `./crm-setup` instead.
 * Kept for backward compatibility with any direct imports.
 */
import CrmSetupMasterList from './crm-setup-master-list';

const LOST_REASON_API_BASE =
  '/method/devx.devx_crm.doctype.crm_lead_lost_reason.crm_lead_lost_reason';

const DropReason = () => (
  <CrmSetupMasterList
    apiBase={LOST_REASON_API_BASE}
    getMethod='get_lost_reasons_by_stage_status'
    upsertMethod='upsert_lost_reason'
    disableMethod='disable_lost_reason'
    valueField='lost_reason'
    title='Drop Reasons'
    subtitle='Manage CRM lead drop reasons'
    columnHeader='Drop Reason'
    addButtonLabel='Add Reason'
    searchPlaceholder='Search drop reason'
    newItemPlaceholder='Enter drop reason and press Enter'
    emptyTitle='No drop reasons found'
    emptySearchMessage='Try searching with a different keyword.'
    emptyDefaultMessage='Create your first drop reason to show it here.'
    requiredMessage='Drop reason is required'
    duplicateMessage='This drop reason already exists.'
    createSuccessMessage='Drop reason created successfully.'
    updateSuccessMessage='Drop reason updated successfully.'
    disableSuccessMessage='Drop reason disabled successfully.'
    loadErrorMessage='Unable to load drop reasons.'
    createErrorMessage='Unable to create drop reason.'
    updateErrorMessage='Unable to update drop reason.'
    disableErrorMessage='Unable to disable drop reason.'
    disableModalTitle='Disable drop reason?'
    disableModalDescription='This drop reason will no longer be available for new CRM leads.'
  />
);

export default DropReason;
