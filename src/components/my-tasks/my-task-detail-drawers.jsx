import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { TicketViewDrawer } from '@/components/ticket-management';
import CrmTaskViewDrawer from '@/components/crm-tasks/crm-task-view-drawer';
import ClientTaskViewDrawer from '@/components/clients-management/client-task-view-drawer';
import AgreementViewDrawer from '@/components/agreements/agreement-view-drawer';
import BillingViewDrawer from '@/components/billing/billing-view-drawer';
import { BILLING_DOCTYPE } from '@/components/billing/constants';
import { OpexViewDrawer } from '@/components/opex';

import { isFacilityManager } from '@/constants/users-constants';
import { getModulePermissions } from '@/utils/user-role-utils';
import { showErrorToast } from '@/utils/error-utils';

import {
  addTicketComment,
  sendTicketEmail,
  fetchTicketComments,
  fetchTicketDetail,
  updateTicketField,
} from '@/redux/ticketManagementSlice';
import { clearSelectedTask } from '@/redux/clientDetailSlice';
import {
  getAgreementByIdThunk,
  updateAgreementThunk,
  fetchAgreementComments,
  addAgreementComment,
  selectAgreementComments,
} from '@/redux/agreementsSlice';
import { fetchOpexComments, addOpexComment, updateOpexField } from '@/redux/opexSlice';
import { updateBillingField } from '@/redux/billingSlice';
import { normalizeOpexVendorRows } from '@/utils/opex-vendor-utils';

import { getMyTaskDrawerKind } from './my-task-constants';

/** Same helpers as `pages/Agreements/agreements.jsx` — keep payload aligned with Agreement API. */
function buildAgreementUpdatePayload(apiKey, value) {
  const num = (v) => (v === '' || v == null ? undefined : Number(v));
  const str = (v) => (v === '' || v == null ? undefined : String(v));
  const stripMonths = (v) => (typeof v === 'string' ? v.replaceAll(/\s*months?/gi, '').trim() : v);
  const stripPct = (v) => (typeof v === 'string' ? v.replaceAll('%', '').trim() : v);
  const transforms = {
    status: str,
    no_of_monthly_deposit: num,
    sec_deposit_amount: num,
    agreement_start_date: str,
    rent_start_date: str,
    agreement_end_date: str,
    lock_in_period: (v) => num(stripMonths(v)),
    lock_in_end_date: str,
    landlord_rent_start_date: str,
    landlord_agreement_end_date: str,
    landlord_lock_in_period: (v) => num(stripMonths(v)),
    landlord_lock_in_end_date: str,
    increment_date: str,
    payment_due_day: num,
    annual_escalation: (v) => num(stripPct(v)),
    escalation_years: num,
    notice_period_of_client: (v) => num(stripMonths(v)),
    notice_period_of_devx: (v) => num(stripMonths(v)),
    roc: (v) => (v === true || String(v).toLowerCase() === 'yes' ? 'Yes' : ''),
    change_type: str,
    notes: (v) => (typeof v === 'string' ? v.trim() : ''),
  };

  const transform = transforms[apiKey];
  if (!transform) return null;
  const apiValue = transform(value);
  if (apiValue === undefined) return null;
  return { [apiKey]: apiValue };
}

function isAgreementFieldValueEqual(apiValue, currentVal) {
  if (apiValue === currentVal) return true;
  if (apiValue == null && currentVal == null) return true;
  if (apiValue == null || currentVal == null) return false;
  if (typeof apiValue === 'number' && typeof currentVal === 'number') {
    return (
      Number(apiValue) === Number(currentVal) ||
      (Number.isNaN(apiValue) && Number.isNaN(currentVal))
    );
  }
  if (typeof apiValue === 'number' || typeof currentVal === 'number') {
    return Number(apiValue) === Number(currentVal);
  }
  if (typeof apiValue === 'string' && typeof currentVal === 'string') {
    return String(apiValue).trim() === String(currentVal).trim();
  }
  if (Array.isArray(apiValue) && Array.isArray(currentVal)) {
    if (apiValue.length !== currentVal.length) return false;
    return JSON.stringify(apiValue) === JSON.stringify(currentVal);
  }
  if (typeof apiValue === 'object' && typeof currentVal === 'object') {
    return JSON.stringify(apiValue) === JSON.stringify(currentVal);
  }
  return false;
}

/**
 * Hosts the correct existing view drawer for a My Tasks row (module / submodule).
 */
const MyTaskDetailDrawers = ({ selectedRow, onClose, onTasksRefresh }) => {
  const dispatch = useDispatch();
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const roleMap = userSideBarPerm?.data?.message?.role;
  const isFacilityManagerUser = isFacilityManager(roleMap);

  const agreementCommentsState = useSelector(selectAgreementComments);

  const opexTaskVendorRows = useMemo(
    () => normalizeOpexVendorRows(selectedRow?.vendor_list),
    [selectedRow?.vendor_list],
  );

  const kind = useMemo(
    () => (selectedRow ? getMyTaskDrawerKind(selectedRow) : null),
    [selectedRow],
  );

  const ticketModulePermissions = useMemo(
    () => getModulePermissions(userSideBarPerm, 'HD Ticket'),
    [userSideBarPerm],
  );

  const defaultTicketPermissions = useMemo(
    () => ({
      scope: 'self',
      canAssign: false,
      canChangeStatus: false,
      canAddInternalComment: false,
      canAddClientComment: false,
      canUploadAttachment: false,
      canResolve: false,
      canClose: false,
      canViewAnalytics: false,
      canEscalate: false,
    }),
    [],
  );

  const ticketPermissions = useMemo(() => {
    if (!ticketModulePermissions) {
      return {
        ...defaultTicketPermissions,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
        canViewAll: false,
      };
    }
    return {
      ...defaultTicketPermissions,
      canCreate: ticketModulePermissions.create === true,
      canEdit: ticketModulePermissions.write === true,
      canDelete: ticketModulePermissions.delete === true,
      canExport: ticketModulePermissions.export === true,
      canViewAll: ticketModulePermissions.read === true,
    };
  }, [ticketModulePermissions, defaultTicketPermissions]);

  const agreementModulePermissions = useMemo(
    () => getModulePermissions(userSideBarPerm, 'Agreement'),
    [userSideBarPerm],
  );

  const agreementPermissions = useMemo(() => {
    const base = {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
      canViewAll: false,
    };
    if (!agreementModulePermissions) return base;
    return {
      canCreate: agreementModulePermissions.create === true,
      canEdit: agreementModulePermissions.write === true,
      canDelete: agreementModulePermissions.delete === true,
      canExport: agreementModulePermissions.export === true,
      canViewAll: agreementModulePermissions.read === true,
    };
  }, [agreementModulePermissions]);

  const billingModulePermissions = useMemo(
    () => getModulePermissions(userSideBarPerm, BILLING_DOCTYPE),
    [userSideBarPerm],
  );
  const billingPermissions = useMemo(
    () => ({ canEdit: billingModulePermissions?.write === true }),
    [billingModulePermissions],
  );

  const agreementId = selectedRow?.name;
  const agreementMode =
    String(selectedRow?.submodule || '').toLowerCase() === 'landlord' ? 'landlord' : 'client';

  const agreementCommentsData = agreementCommentsState?.data ?? {
    comments: [],
    history: [],
    communications: [],
    views: [],
    calls: [],
  };
  const agreementCommentsLoading = agreementCommentsState?.status === 'loading';

  useEffect(() => {
    if (!selectedRow || kind !== 'agreement' || !agreementId) return;
    dispatch(fetchAgreementComments({ agreementId }));
  }, [dispatch, selectedRow, kind, agreementId]);

  const handleTicketFieldUpdate = useCallback(
    async (
      ticketId,
      fieldname,
      value,
      meta = { refreshActivities: true },
      currentAssignees = null,
    ) => {
      const ticketIdString = String(ticketId);
      try {
        const updateResult = await dispatch(
          updateTicketField({ name: ticketIdString, fieldname, value, currentAssignees }),
        );
        if (updateResult.type === 'ticketManagement/updateTicketField/rejected') {
          const { payload } = updateResult;
          const isPermissionErrorString =
            typeof payload === 'string' &&
            (payload.toLowerCase().includes('not permitted') ||
              payload.toLowerCase().includes('not allowed via controller permission check'));

          if (isFacilityManagerUser && fieldname === 'assigned_to' && isPermissionErrorString) {
            showErrorToast('You do not have access to view this ticket.', {
              defaultMessage: 'You do not have access to view this ticket.',
            });
            onClose?.();
            return;
          }
          showErrorToast(updateResult, {
            defaultMessage: 'Failed to update ticket field. Please try again.',
          });
          return;
        }
        if (updateResult.type === 'ticketManagement/updateTicketField/fulfilled') {
          await dispatch(fetchTicketDetail(ticketIdString));
          if (meta?.refreshActivities) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            await dispatch(fetchTicketComments(ticketIdString));
          }
        }
        onTasksRefresh?.();
      } catch (error) {
        console.error('Failed to update ticket field:', error);
        showErrorToast(error, { defaultMessage: 'Failed to update ticket. Please try again.' });
      }
    },
    [dispatch, isFacilityManagerUser, onClose, onTasksRefresh],
  );

  const handleTicketPriorityChange = useCallback(
    (ticketId, newPriority) => {
      handleTicketFieldUpdate(ticketId, 'priority', newPriority);
    },
    [handleTicketFieldUpdate],
  );

  const handleAddTicketComment = useCallback(
    async (
      ticketId,
      content,
      attachments = [],
      isVisibleToClient = false,
      parentCommentId = null,
    ) => {
      try {
        await dispatch(
          addTicketComment({
            ticketId,
            content,
            attachments,
            visibleToClient: isVisibleToClient,
            parentCommentId,
          }),
        );
        await dispatch(fetchTicketComments(ticketId));
      } catch (error) {
        console.error('Failed to add comment:', error);
      }
    },
    [dispatch],
  );

  const handleSendTicketEmail = useCallback(
    async (ticketId, emailData) => {
      try {
        await dispatch(
          sendTicketEmail({
            ticketId,
            to: emailData.to,
            cc: emailData.cc,
            bcc: emailData.bcc,
            subject: emailData.subject,
            message: emailData.content,
            attachments: emailData.attachments,
          }),
        );
        await dispatch(fetchTicketComments(ticketId));
      } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
      }
    },
    [dispatch],
  );

  const handleRefreshTicketComments = useCallback(
    async (ticketId) => {
      try {
        await dispatch(fetchTicketComments(ticketId));
      } catch (error) {
        console.error('Failed to refresh comments:', error);
      }
    },
    [dispatch],
  );

  const crmDrawerTask = useMemo(() => {
    if (!selectedRow || kind !== 'crm') return undefined;
    return {
      id: selectedRow.name,
      title: selectedRow.title,
      status: selectedRow.status,
      assignees: selectedRow.assignees || [],
      type: selectedRow.submodule,
      dueDate: selectedRow.due_date,
      priority: selectedRow.priority,
    };
  }, [selectedRow, kind]);

  const handleCrmTaskUpdate = useCallback(() => {
    onTasksRefresh?.();
  }, [onTasksRefresh]);

  const handleClientTaskDrawerClose = useCallback(() => {
    dispatch(clearSelectedTask());
    onTasksRefresh?.();
    onClose?.();
  }, [dispatch, onTasksRefresh, onClose]);

  const handleAgreementFieldUpdate = useCallback(
    async (agreement, apiKey, value) => {
      const name = agreement?.name ?? agreement?.id;
      if (!name) return;
      const payload = buildAgreementUpdatePayload(apiKey, value);
      if (!payload) return;
      const payloadKey = Object.keys(payload)[0];
      const apiValue = payload[payloadKey];
      const currentVal = agreement?.[payloadKey];
      if (isAgreementFieldValueEqual(apiValue, currentVal)) return;
      try {
        await dispatch(updateAgreementThunk({ name, payload })).unwrap();
        await dispatch(getAgreementByIdThunk(name)).unwrap();
        await dispatch(fetchAgreementComments({ agreementId: name })).unwrap();
        onTasksRefresh?.();
      } catch (error) {
        console.error('Agreement update failed:', error);
        showErrorToast(error, { defaultMessage: 'Failed to update agreement. Please try again.' });
      }
    },
    [dispatch, onTasksRefresh],
  );

  const handleAddAgreementComment = useCallback(
    async (agreementId, content, attachments, _visibleToClient, parentCommentId) => {
      if (!agreementId) return;
      try {
        await dispatch(
          addAgreementComment({
            agreementId,
            content,
            attachments,
            visibleToClient: false,
            parentCommentId,
          }),
        ).unwrap();
        await dispatch(fetchAgreementComments({ agreementId })).unwrap();
      } catch (error) {
        console.error('Failed to add agreement comment:', error);
        showErrorToast(error, { defaultMessage: 'Failed to add comment. Please try again.' });
      }
    },
    [dispatch],
  );

  const handleRefreshAgreementComments = useCallback(() => {
    if (!agreementId) return;
    dispatch(fetchAgreementComments({ agreementId }));
  }, [dispatch, agreementId]);

  const handleOpexFieldUpdate = useCallback(
    async (opexId, fieldname, value) => {
      try {
        await dispatch(updateOpexField({ name: opexId, fieldname, value })).unwrap();
        onTasksRefresh?.();
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to update OPEX field. Please try again.',
        });
      }
    },
    [dispatch, onTasksRefresh],
  );

  const handleOpexAddComment = useCallback(
    async (opexId, content, attachments = [], _visibleToClient = false, parentCommentId = null) => {
      try {
        await dispatch(
          addOpexComment({
            opexId,
            content,
            attachments,
            parentCommentId,
          }),
        ).unwrap();
        await dispatch(fetchOpexComments(opexId));
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to add comment. Please try again.',
        });
      }
    },
    [dispatch],
  );

  const handleOpexRefreshComments = useCallback(
    (opexId) => {
      if (opexId) dispatch(fetchOpexComments(opexId));
    },
    [dispatch],
  );

  const handleBillingFieldUpdate = useCallback(
    async (billingId, fieldname, value) => {
      if (!billingId || !fieldname) return;
      try {
        await dispatch(updateBillingField({ name: billingId, fieldname, value })).unwrap();
        onTasksRefresh?.();
      } catch {
        // Error toast is handled inside the thunk utilities
      }
    },
    [dispatch, onTasksRefresh],
  );

  if (!selectedRow || !kind) return null;

  if (kind === 'ticket') {
    return (
      <TicketViewDrawer
        isOpen
        onClose={onClose}
        ticketId={selectedRow.name}
        onPriorityChange={handleTicketPriorityChange}
        onFieldUpdate={handleTicketFieldUpdate}
        onNavigatePrevious={() => {}}
        onNavigateNext={() => {}}
        hasPrevious={false}
        hasNext={false}
        permissions={ticketPermissions}
        onAddComment={handleAddTicketComment}
        onRefreshComments={handleRefreshTicketComments}
        onSendEmail={handleSendTicketEmail}
      />
    );
  }

  if (kind === 'crm') {
    return (
      <CrmTaskViewDrawer
        open
        onOpenChange={(open) => {
          if (!open) onClose?.();
        }}
        onNavigatePrevious={() => {}}
        onNavigateNext={() => {}}
        hasPrevious={false}
        hasNext={false}
        showLifecycleFields={false}
        task={crmDrawerTask}
        onTaskUpdate={handleCrmTaskUpdate}
      />
    );
  }

  if (kind === 'client') {
    const isEngagement = selectedRow.submodule === 'Client Engagement';
    return (
      <ClientTaskViewDrawer
        isOpen
        onClose={handleClientTaskDrawerClose}
        taskId={selectedRow.name}
        taskType={isEngagement ? 'engagement' : 'onboarding'}
        tasks={[]}
        taskSubjectFallback={selectedRow.title}
        onTaskChange={() => {}}
        permissions={{ canEdit: true }}
      />
    );
  }

  if (kind === 'agreement') {
    return (
      <AgreementViewDrawer
        mode={agreementMode}
        isOpen
        onClose={onClose}
        agreementId={agreementId}
        onFieldUpdate={handleAgreementFieldUpdate}
        onAddComment={handleAddAgreementComment}
        onRefreshComments={handleRefreshAgreementComments}
        commentsData={agreementCommentsData}
        commentsLoading={agreementCommentsLoading}
        commentsFetchStatus={agreementCommentsState?.status ?? 'idle'}
        permissions={agreementPermissions}
      />
    );
  }

  if (kind === 'opex') {
    return (
      <OpexViewDrawer
        isOpen
        onClose={onClose}
        opexId={selectedRow.name}
        onNavigatePrevious={() => {}}
        onNavigateNext={() => {}}
        hasPrevious={false}
        hasNext={false}
        onFieldUpdate={handleOpexFieldUpdate}
        onAddComment={handleOpexAddComment}
        onRefreshComments={handleOpexRefreshComments}
        permissions={{ canEdit: true }}
        vendors={opexTaskVendorRows}
      />
    );
  }

  if (kind === 'billing') {
    return (
      <BillingViewDrawer
        isOpen
        onClose={onClose}
        billingId={selectedRow.name ?? selectedRow.id}
        onNavigatePrevious={() => {}}
        onNavigateNext={() => {}}
        hasPrevious={false}
        hasNext={false}
        onFieldUpdate={handleBillingFieldUpdate}
        permissions={billingPermissions}
      />
    );
  }

  return null;
};

export default MyTaskDetailDrawers;
