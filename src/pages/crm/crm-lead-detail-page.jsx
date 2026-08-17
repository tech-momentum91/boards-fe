import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import PageLayout from '@/components/page-layout';
import CrmLeadDetailHeader from '@/components/crm-leads/crm-lead-detail/crm-lead-detail-header';
import CrmLeadStagePipeline from '@/components/crm-leads/crm-lead-detail/crm-lead-stage-pipeline';
import CrmLeadDetailTabContent from '@/components/crm-leads/crm-lead-detail/crm-lead-detail-tab-content';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import {
  getCrmLead,
  updateCrmLead,
  buildLeadFieldPayload,
  getPrimaryLeadForContact,
} from '@/api/crmLeads';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

/** Enriched client-side only — never send to CRM Lead PUT */
const CLIENT_ONLY_LEAD_FIELDS = new Set(['company_legal_name', 'contact_display_name']);

function primaryFromContacts(contacts) {
  const rows = Array.isArray(contacts) ? contacts : [];
  return (
    rows.find((row) => Number(row?.is_primary) === 1)?.contact ||
    rows.find((row) => String(row?.contact || '').trim())?.contact ||
    ''
  );
}

const EMPTY_PRIMARY_MODAL = {
  open: false,
  existingLeadName: '',
  pendingContacts: null,
  pendingExtraFields: null,
  revertLead: null,
};

const CrmLeadDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const leadId = decodeURIComponent(id || '');

  const [lead, setLead] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [error, setError] = useState(null);
  const [primaryLeadModal, setPrimaryLeadModal] = useState(EMPTY_PRIMARY_MODAL);

  const fetchLead = useCallback(async () => {
    if (!leadId) {
      setLead(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCrmLead(leadId);
      setLead(data);
    } catch (error_) {
      setError(error_);
      showErrorToast('Failed to load lead');
      setLead(null);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const leadRef = useRef(lead);
  leadRef.current = lead;

  const from = typeof location.state?.from === 'string' ? location.state.from.trim() : '';
  const backTargetRef = useRef(from);
  if (from) backTargetRef.current = from;

  const handleBack = useCallback(() => {
    navigate(backTargetRef.current || '/crm/leads', { replace: true });
  }, [navigate]);

  const dismissPrimaryLeadModal = useCallback(() => {
    setPrimaryLeadModal((prev) => {
      const snap = prev.revertLead;
      if (snap) {
        queueMicrotask(() => {
          setLead(snap);
          leadRef.current = snap;
        });
      }
      return EMPTY_PRIMARY_MODAL;
    });
  }, []);

  const saveLeadFields = useCallback(
    async (fields, { refresh = true, contactsSave = false } = {}) => {
      const currentLead = leadRef.current;
      if (!currentLead?.name || !fields || typeof fields !== 'object') return;
      const prevLead = { ...currentLead };
      const { contact: _contact, ...rest } = fields;
      const payload = {};
      for (const [key, value] of Object.entries(rest)) {
        if (CLIENT_ONLY_LEAD_FIELDS.has(key)) continue;
        if (key === 'contacts') {
          payload.contacts = Array.isArray(value) ? value : [];
          continue;
        }
        payload[key] = typeof value === 'string' ? value.trim() || '' : (value ?? '');
      }
      if (Object.keys(payload).length === 0) return;

      if (contactsSave) setIsSavingContacts(true);
      else setIsSaving(true);
      try {
        await updateCrmLead(currentLead.name, payload);
        showSuccessToast('Saved');
        setPrimaryLeadModal(EMPTY_PRIMARY_MODAL);
        if (refresh) await fetchLead();
      } catch {
        showErrorToast('Failed to save');
        setLead(prevLead);
        throw new Error('save_failed');
      } finally {
        if (contactsSave) setIsSavingContacts(false);
        else setIsSaving(false);
      }
    },
    [fetchLead],
  );

  const saveContactsWithPrimaryCheck = useCallback(
    async (contacts, extraFields = {}) => {
      const currentLead = leadRef.current;
      if (!currentLead?.name) return;
      const rows = Array.isArray(contacts) ? contacts : [];
      const primary = String(primaryFromContacts(rows) || '').trim();
      const accountTrim = String(extraFields.account ?? currentLead.account ?? '').trim();
      const prevPrimary = String(currentLead.contact || '').trim();
      const revertLead = { ...currentLead };

      if (primary && primary !== prevPrimary && accountTrim) {
        setIsSavingContacts(true);
        let result;
        try {
          result = await getPrimaryLeadForContact(primary);
        } catch {
          showErrorToast('Failed to check contact');
          setIsSavingContacts(false);
          return;
        }
        setIsSavingContacts(false);

        if (result.has_primary_lead && result.lead_name && result.lead_name !== currentLead.name) {
          // Optimistic preview while user decides; dismiss reverts via revertLead
          const optimistic = {
            ...currentLead,
            ...extraFields,
            contacts: rows,
            contact: primary,
          };
          setLead(optimistic);
          setPrimaryLeadModal({
            open: true,
            existingLeadName: result.lead_display_name || result.lead_name || 'Existing lead',
            pendingContacts: rows,
            pendingExtraFields: extraFields,
            revertLead,
          });
          return;
        }

        await saveLeadFields(
          {
            ...extraFields,
            contacts: rows,
            is_primary: result.has_primary_lead ? currentLead.is_primary : 1,
          },
          { contactsSave: true },
        );
        return;
      }

      await saveLeadFields({ ...extraFields, contacts: rows }, { contactsSave: true });
    },
    [saveLeadFields],
  );

  const debouncedSave = useDebouncedCallback(async (field, value) => {
    const currentLead = leadRef.current;
    if (!currentLead?.name) return;
    const payload = buildLeadFieldPayload(field, value);
    if (!payload || Object.keys(payload).length === 0) return;

    setIsSaving(true);
    try {
      await updateCrmLead(currentLead.name, payload);
      showSuccessToast('Saved');
      await fetchLead();
    } catch {
      showErrorToast('Failed to save');
      setLead((prev) => (prev ? { ...prev, [field]: currentLead[field] } : null));
    } finally {
      setIsSaving(false);
    }
  }, 1000);

  const handleFieldChange = useCallback(
    (field, value) => {
      if (!lead?.name) return;
      if (CLIENT_ONLY_LEAD_FIELDS.has(field)) return;

      if (field === 'contacts') {
        saveContactsWithPrimaryCheck(value);
        return;
      }
      if (field === 'contact') {
        // Legacy single-contact field — ignore; use contacts child table APIs
        return;
      }

      const prevSnap = leadRef.current ?? lead;
      if (prevSnap?.name) {
        const nextSnap = { ...prevSnap, [field]: value };
        // Avoid stale Company Legal Name while account changes (refetch fills it).
        if (field === 'account') nextSnap.company_legal_name = '';
        leadRef.current = nextSnap;
      }

      setLead((prev) => {
        if (!prev) return null;
        const next = { ...prev, [field]: value };
        if (field === 'account') next.company_legal_name = '';
        return next;
      });
      debouncedSave(field, value);
    },
    [lead, debouncedSave, saveContactsWithPrimaryCheck],
  );

  const handleBatchFieldChange = useCallback(
    async (fields) => {
      if (!lead?.name || !fields || typeof fields !== 'object') return;

      if (fields.contacts !== undefined) {
        const { contacts, contact: _c, ...extra } = fields;
        await saveContactsWithPrimaryCheck(contacts, extra);
        return;
      }

      const prevLead = { ...lead };
      const accountChanged =
        Object.prototype.hasOwnProperty.call(fields, 'account') &&
        String(fields.account ?? '').trim() !== String(lead.account ?? '').trim();

      setLead((p) => {
        const next = p ? { ...p, ...fields } : null;
        if (accountChanged && next) next.company_legal_name = '';
        if (next) leadRef.current = next;
        return next;
      });

      try {
        await saveLeadFields(fields);
      } catch {
        setLead(prevLead);
      }
    },
    [lead, saveContactsWithPrimaryCheck, saveLeadFields],
  );

  if (isLoading && !lead) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full flex-col items-center justify-center'>
          <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
        </div>
      </PageLayout>
    );
  }

  if (error && !lead) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full flex-col items-center justify-center gap-2'>
          <p className='text-text-sub-600'>Failed to load lead.</p>
          <button
            type='button'
            onClick={() => fetchLead()}
            className='text-primary-base hover:underline'
          >
            Retry
          </button>
        </div>
      </PageLayout>
    );
  }

  if (!lead) {
    return (
      <PageLayout showDefaultHeader={false}>
        <div className='flex h-full flex-col items-center justify-center'>
          <p className='text-text-sub-600'>Lead not found.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showDefaultHeader={false}>
      <div className='flex h-full flex-col'>
        <CrmLeadDetailHeader lead={lead} onBack={handleBack} />
        <CrmLeadStagePipeline
          lead={lead}
          onBatchFieldChange={handleBatchFieldChange}
          isSaving={isSaving}
        />
        <CrmLeadDetailTabContent
          lead={lead}
          onFieldChange={handleFieldChange}
          onBatchFieldChange={handleBatchFieldChange}
          onLeadUpdated={fetchLead}
          isSaving={isSaving}
          isSavingContacts={isSavingContacts}
        />
      </div>

      <Modal.Root
        open={primaryLeadModal.open}
        onOpenChange={(open) => {
          if (!open) dismissPrimaryLeadModal();
        }}
      >
        <Modal.Content className='max-w-[440px]' showClose={true}>
          <Modal.Header>
            <Modal.Title>This contact already has an active lead</Modal.Title>
          </Modal.Header>
          <Modal.Body className='px-6 py-4'>
            <p className='text-paragraph-sm text-text-sub-600'>
              This contact is linked to an active lead:{' '}
              <strong>{primaryLeadModal.existingLeadName}</strong>. Do you want to keep that lead as
              active, or make this lead the active one?
            </p>
          </Modal.Body>
          <Modal.Footer className='px-6 py-4 gap-3 flex justify-end'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isSavingContacts || isSaving}
              onClick={() => {
                if (primaryLeadModal.pendingContacts) {
                  saveLeadFields(
                    {
                      ...primaryLeadModal.pendingExtraFields,
                      contacts: primaryLeadModal.pendingContacts,
                      is_primary: 0,
                    },
                    { contactsSave: true },
                  );
                }
              }}
            >
              Keep current active lead
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              size='small'
              disabled={isSavingContacts || isSaving}
              onClick={() => {
                if (primaryLeadModal.pendingContacts) {
                  saveLeadFields(
                    {
                      ...primaryLeadModal.pendingExtraFields,
                      contacts: primaryLeadModal.pendingContacts,
                      is_primary: 1,
                    },
                    { contactsSave: true },
                  );
                }
              }}
            >
              {isSavingContacts || isSaving ? 'Saving...' : 'Make this lead active'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </PageLayout>
  );
};

export default CrmLeadDetailPage;
