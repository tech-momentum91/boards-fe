import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  RiCheckLine,
  RiCloseCircleLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiGlobalLine,
  RiTimerLine,
} from 'react-icons/ri';

import SetupDomainModal from './setup-domain-modal';

import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Switch from '@/components/ui/switch';
import EditableFieldWrapper from '@/components/ui/editable-field-wrapper';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { cn } from '@/utils/cn';
import { resolveFileUrl } from '@/lib/utils';
import {
  getClientDetailThunk,
  selectClientDetail,
  updateClientField,
} from '@/redux/clientDetailSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  buildDefaultVmsTenantLink,
  isValidVmsBaseDomain,
  normalizeVmsBaseDomain,
  vmsApiHost,
  vmsKioskHost,
} from '@/utils/vms-domain-utils';
import apiClient from '@/api/axios';

async function copy(text, label = 'Value') {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showSuccessToast(`${label} copied`);
  } catch {
    showErrorToast(`Failed to copy ${label.toLowerCase()}`);
  }
}

const DEFAULT_VMS_MODULES = [
  { module_key: 'visitor', module_label: 'Visitor Check-in', product: 'VMS', enabled: 1 },
  { module_key: 'vendor', module_label: 'Vendor Check-in', product: 'VMS', enabled: 1 },
  { module_key: 'event', module_label: 'Event Participant', product: 'VMS', enabled: 1 },
  { module_key: 'space_inquiry', module_label: 'Space Inquiry', product: 'VMS', enabled: 0 },
  { module_key: 'staff_attendance', module_label: 'Staff Attendance', product: 'VMS', enabled: 0 },
];

const DEFAULT_BRAND_COLOR = '#0d9466';

function buildFormFromClient(client) {
  if (!client) {
    return {
      custom_vms_enabled: false,
      custom_vms_logo: '',
      custom_vms_brand_color: '',
      custom_vms_app_display_name: '',
      custom_vms_slug: '',
      custom_vms_domains: [],
      custom_client_module_access: [...DEFAULT_VMS_MODULES],
    };
  }
  const modules =
    client.custom_client_module_access?.length > 0
      ? client.custom_client_module_access.map((row) => ({
          name: row.name,
          module_key: row.module_key,
          module_label: row.module_label,
          product: row.product || 'VMS',
          enabled: row.enabled ? 1 : 0,
        }))
      : DEFAULT_VMS_MODULES.map((row) => ({ ...row }));

  return {
    custom_vms_enabled: Boolean(client.custom_vms_enabled),
    custom_vms_logo: client.custom_vms_logo || '',
    custom_vms_brand_color: client.custom_vms_brand_color || '',
    custom_vms_app_display_name: client.custom_vms_app_display_name || '',
    custom_vms_slug: client.custom_vms_slug || '',
    custom_vms_domains: (client.custom_vms_domains || []).slice(0, 1).map((row) => ({
      name: row.name,
      hostname: normalizeVmsBaseDomain(row.hostname) || '',
      is_primary: 1,
      setup_status: row.setup_status || 'Not Started',
      setup_error: row.setup_error || '',
    })),
    custom_client_module_access: modules,
  };
}

const SETUP_STATUS_BADGE = {
  Active: { color: 'green', icon: RiCheckLine, label: 'Active' },
  Verifying: { color: 'blue', icon: RiTimerLine, label: 'Verifying' },
  'DNS Pending': { color: 'orange', icon: RiTimerLine, label: 'DNS Pending' },
  Failed: { color: 'red', icon: RiCloseCircleLine, label: 'Failed' },
  'Not Started': null,
};

function SetupStatusBadge({ status }) {
  const config = SETUP_STATUS_BADGE[status];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <Badge.Root variant='lighter' color={config.color} size='small'>
      <Badge.Icon as={Icon} />
      {config.label}
    </Badge.Root>
  );
}

function FieldLabel({ children }) {
  return <label className='text-paragraph-sm opacity-72 text-text-sub-500'>{children}</label>;
}

function SectionHeading({ title, description, action }) {
  return (
    <div className='flex items-start justify-between gap-4'>
      <div className='min-w-0'>
        <h3 className='text-label-md font-semibold text-text-strong-950'>{title}</h3>
        {description ? (
          <p className='mt-0.5 text-paragraph-sm text-text-sub-500'>{description}</p>
        ) : null}
      </div>
      {action ? <div className='shrink-0'>{action}</div> : null}
    </div>
  );
}

const ClientDetailCustomVmsTab = () => {
  const dispatch = useDispatch();
  const { id: clientId } = useParams();
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;

  const [form, setForm] = useState(() => buildFormFromClient(null));
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [setupDomain, setSetupDomain] = useState(null);
  const [hostnameError, setHostnameError] = useState('');
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removingDomain, setRemovingDomain] = useState(false);
  const logoInputRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    setForm(buildFormFromClient(client));
  }, [client]);

  const openSetupForDomain = useCallback((rawDomain) => {
    const base = normalizeVmsBaseDomain(rawDomain || '');
    if (!base) return;
    setSetupDomain(base);
  }, []);

  const handleSetupCompleted = useCallback(() => {
    if (clientId) dispatch(getClientDetailThunk(clientId));
  }, [clientId, dispatch]);

  /**
   * Send one field update through the queue so concurrent edits serialize.
   * Refetches on success; reverts the local form state (via refetch) on failure.
   */
  const persistField = useCallback(
    (fieldname, value, { silent = false } = {}) => {
      if (!clientId) return Promise.resolve();
      saveQueueRef.current = saveQueueRef.current
        .catch(() => {})
        .then(async () => {
          const result = await dispatch(updateClientField({ clientId, fieldname, value }));
          if (result.type === 'clientDetail/updateClientField/rejected') {
            showErrorToast(result.payload, {
              defaultMessage: `Failed to update ${fieldname}.`,
            });
            await dispatch(getClientDetailThunk(clientId));
            return;
          }
          await dispatch(getClientDetailThunk(clientId));
          if (!silent) showSuccessToast('Saved');
        });
      return saveQueueRef.current;
    },
    [clientId, dispatch],
  );

  const vmsEnabled = form.custom_vms_enabled;
  const vmsModules = useMemo(
    () =>
      form.custom_client_module_access.filter(
        (row) => row.product === 'VMS' || row.product === 'Both',
      ),
    [form.custom_client_module_access],
  );
  const logoPreviewUrl = useMemo(
    () => (form.custom_vms_logo ? resolveFileUrl(form.custom_vms_logo) : ''),
    [form.custom_vms_logo],
  );
  const brandColorValue = form.custom_vms_brand_color || DEFAULT_BRAND_COLOR;
  const domainRow = form.custom_vms_domains[0] || null;
  const normalizedHostname = normalizeVmsBaseDomain(domainRow?.hostname || '');
  const vmsSlug = (client?.custom_vms_slug || '').trim();
  const defaultVmsLink = buildDefaultVmsTenantLink(vmsSlug);

  // ----------------------------- handlers ----------------------------------

  const handleEnableToggle = (checked) => {
    setForm((prev) => ({ ...prev, custom_vms_enabled: checked }));
    persistField('custom_vms_enabled', checked ? 1 : 0, { silent: true });
  };

  const handleDomainHostnameChange = (raw) => {
    setForm((prev) => {
      const current = prev.custom_vms_domains[0] || { hostname: '', is_primary: 1 };
      return {
        ...prev,
        custom_vms_domains: [{ ...current, hostname: raw, is_primary: 1 }],
      };
    });
    if (hostnameError) setHostnameError('');
  };

  const handleDomainHostnameBlur = () => {
    const raw = domainRow?.hostname || '';
    const normalized = normalizeVmsBaseDomain(raw);
    if (!normalized) {
      setHostnameError('');
      return;
    }
    if (!isValidVmsBaseDomain(normalized)) {
      setHostnameError('Enter a valid base domain (e.g. msglobal.com)');
      return;
    }
    setHostnameError('');
    const previous = normalizeVmsBaseDomain(client?.custom_vms_domains?.[0]?.hostname || '');
    if (normalized === previous) return;

    const payload = [
      {
        hostname: normalized,
        is_primary: 1,
        doctype: 'Customer VMS Domain',
        ...(domainRow?.name ? { name: domainRow.name } : {}),
      },
    ];
    setForm((prev) => ({
      ...prev,
      custom_vms_domains: [{ ...prev.custom_vms_domains[0], hostname: normalized, is_primary: 1 }],
    }));
    persistField('custom_vms_domains', payload);
  };

  const handleAppNameBlur = (raw) => {
    const value = (raw || '').trim();
    const previous = (client?.custom_vms_app_display_name || '').trim();
    if (value === previous) return;
    persistField('custom_vms_app_display_name', value || null);
  };

  const handleBrandColorChange = (hex) => {
    setForm((prev) => ({ ...prev, custom_vms_brand_color: hex }));
  };

  const handleBrandColorBlur = (raw) => {
    let hex = (raw || '').trim();
    if (hex && !hex.startsWith('#')) hex = `#${hex}`;
    if (hex && !/^#[\dA-Fa-f]{6}$/.test(hex)) return;
    const previous = (client?.custom_vms_brand_color || '').trim();
    if (hex === previous) return;
    setForm((prev) => ({ ...prev, custom_vms_brand_color: hex }));
    persistField('custom_vms_brand_color', hex || null);
  };

  const handleRemoveDomain = async () => {
    if (!clientId || !domainRow) {
      setRemoveConfirmOpen(false);
      return;
    }
    setRemovingDomain(true);
    try {
      const wasSetUp = domainRow.setup_status && domainRow.setup_status !== 'Not Started';
      const serverHostname = normalizeVmsBaseDomain(
        client?.custom_vms_domains?.[0]?.hostname || domainRow.hostname || '',
      );

      // Tear down infrastructure (Amplify + Nginx + cert) if setup was ever started.
      if (wasSetUp && serverHostname) {
        try {
          await apiClient.post('/method/devx.api.vms_domain_setup.teardown_domain', {
            customer: clientId,
            base_domain: serverHostname,
          });
        } catch (error) {
          showErrorToast(error, {
            defaultMessage:
              'Could not tear down infrastructure. Resolve the issue and try again, or remove manually.',
          });
          return; // keep the row so the user can retry / inspect status
        }
      }

      const result = await dispatch(
        updateClientField({ clientId, fieldname: 'custom_vms_domains', value: [] }),
      );
      if (result.type === 'clientDetail/updateClientField/rejected') {
        showErrorToast(result.payload, { defaultMessage: 'Failed to remove domain.' });
        return;
      }

      await dispatch(getClientDetailThunk(clientId));
      setForm((prev) => ({ ...prev, custom_vms_domains: [] }));
      setHostnameError('');
      setRemoveConfirmOpen(false);
      showSuccessToast('Domain removed');
    } finally {
      setRemovingDomain(false);
    }
  };

  const handleModuleToggle = (moduleKey, enabled) => {
    const nextModules = form.custom_client_module_access.map((row) =>
      row.module_key === moduleKey ? { ...row, enabled: enabled ? 1 : 0 } : row,
    );
    setForm((prev) => ({ ...prev, custom_client_module_access: nextModules }));
    const payload = nextModules.map((row) => ({
      module_key: row.module_key,
      module_label: row.module_label,
      product: row.product || 'VMS',
      enabled: row.enabled ? 1 : 0,
      doctype: 'Client Module Access',
      ...(row.name ? { name: row.name } : {}),
    }));
    persistField('custom_client_module_access', payload, { silent: true });
  };

  const handleLogoUpload = async (event) => {
    const inputEl = event.target;
    const file = inputEl.files?.[0];
    if (!file || !clientId) return;
    setUploadingLogo(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('doctype', 'Customer');
      uploadFormData.append('docname', clientId);
      uploadFormData.append('fieldname', 'custom_vms_logo');
      uploadFormData.append('filename', file.name);
      uploadFormData.append('file', file);
      uploadFormData.append('is_private', '0');
      const { data } = await apiClient.post(
        '/method/devx.api.core.upload_attachment',
        uploadFormData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const fileUrl = data?.message?.file_url || data?.message?.file_name || data?.file_url;
      if (fileUrl) {
        setForm((prev) => ({ ...prev, custom_vms_logo: fileUrl }));
        showSuccessToast('Logo uploaded');
        await dispatch(getClientDetailThunk(clientId));
      }
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Logo upload failed' });
    } finally {
      setUploadingLogo(false);
      inputEl.value = '';
    }
  };

  // ----------------------------- render ------------------------------------

  if (clientDetail.isLoading && !client) {
    return (
      <div className='flex flex-1 items-center justify-center bg-white min-h-[320px]'>
        <div className='size-8 border-4 border-primary-base border-t-transparent rounded-full animate-spin' />
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6'>
      <div className='flex flex-col gap-6 py-5'>
        {/* Enable toggle */}
        <div className='flex items-center justify-between gap-4'>
          <div className='min-w-0'>
            <p className='text-label-md font-semibold text-text-strong-950'>Enable Custom VMS</p>
            <p className='mt-0.5 text-paragraph-sm text-text-sub-500'>
              White-label kiosk for this client&apos;s domain.
            </p>
          </div>
          <Switch.Root checked={vmsEnabled} onCheckedChange={handleEnableToggle} />
        </div>

        {!vmsEnabled ? (
          <p className='text-paragraph-sm text-text-sub-500'>
            Turn on Custom VMS to configure the domain, branding, and module access.
          </p>
        ) : null}

        {vmsEnabled ? (
          <>
            {/* ---------- Default link ---------- */}
            <div className='border-t border-stroke-soft-200 pt-5 flex flex-col gap-5'>
              <SectionHeading
                title='Default VMS link'
                description='Instant kiosk link hosted by DevX (works without custom domain setup).'
              />

              <div className='flex flex-wrap gap-3'>
                <div className='flex flex-1 flex-col gap-1 min-w-[240px]'>
                  <FieldLabel>Slug</FieldLabel>
                  <div className='flex items-center gap-2'>
                    <code
                      className={cn(
                        'flex-1 truncate rounded-md border border-stroke-soft-200 bg-bg-weak-50 px-2.5 py-1.5 text-paragraph-sm font-mono',
                        vmsSlug ? 'text-text-strong-950' : 'text-text-sub-500 italic',
                      )}
                      title={vmsSlug}
                    >
                      {vmsSlug || '—'}
                    </code>
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      onClick={() => copy(vmsSlug, 'Slug')}
                      disabled={!vmsSlug}
                      aria-label='Copy VMS slug'
                    >
                      <Button.Icon as={RiFileCopyLine} />
                    </Button.Root>
                  </div>
                </div>

                <div className='flex flex-[2] flex-col gap-1 min-w-[320px]'>
                  <FieldLabel>Default link</FieldLabel>
                  <div className='flex items-center gap-2'>
                    <code
                      className={cn(
                        'flex-1 truncate rounded-md border border-stroke-soft-200 bg-bg-weak-50 px-2.5 py-1.5 text-paragraph-sm font-mono',
                        defaultVmsLink ? 'text-text-strong-950' : 'text-text-sub-500 italic',
                      )}
                      title={defaultVmsLink}
                    >
                      {defaultVmsLink || '—'}
                    </code>
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      onClick={() => copy(defaultVmsLink, 'Link')}
                      disabled={!defaultVmsLink}
                      aria-label='Copy default VMS link'
                    >
                      <Button.Icon as={RiFileCopyLine} />
                    </Button.Root>
                  </div>
                  <span className='text-paragraph-xs text-text-soft-400'>
                    Share this link with the client now; custom domain can be added later.
                  </span>
                </div>
              </div>
            </div>

            {/* ---------- Client domain ---------- */}
            <div className='border-t border-stroke-soft-200 pt-5 flex flex-col gap-5'>
              <SectionHeading
                title='Client domain'
                description='One domain per client. Edit the hostname inline; click Setup to wire DNS + SSL.'
                action={
                  domainRow?.setup_status && domainRow.setup_status !== 'Not Started' ? (
                    <SetupStatusBadge status={domainRow.setup_status} />
                  ) : null
                }
              />

              <div className='flex gap-3'>
                <div className='flex flex-1 flex-col gap-1'>
                  <FieldLabel>Domain</FieldLabel>
                  <EditableFieldWrapper editable iconClassName='mr-2'>
                    <Input.Root
                      key={`vms-domain-${domainRow?.name || 'new'}`}
                      variant='borderless'
                      size='xsmall'
                      className='-ml-2'
                      hasError={Boolean(hostnameError)}
                    >
                      <Input.Wrapper>
                        <Input.Input
                          value={domainRow?.hostname || ''}
                          onChange={(e) => handleDomainHostnameChange(e.target.value)}
                          onBlur={handleDomainHostnameBlur}
                          placeholder='msglobal.com'
                          className='text-label-sm text-text-main-900'
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </EditableFieldWrapper>
                  {hostnameError ? (
                    <span className='text-paragraph-xs text-error-base'>{hostnameError}</span>
                  ) : (
                    <span className='text-paragraph-xs text-text-soft-400'>
                      Base domain only (e.g. msglobal.com). No <code>vms.</code> or{' '}
                      <code>https://</code> prefix.
                    </span>
                  )}
                </div>

                <div className='flex flex-1 flex-col gap-1'>
                  <FieldLabel>Resolves to</FieldLabel>
                  {normalizedHostname ? (
                    <div className='flex flex-col gap-1 text-paragraph-sm text-text-sub-600'>
                      <span>
                        Kiosk:{' '}
                        <code className='font-mono text-text-strong-950'>
                          {vmsKioskHost(normalizedHostname)}
                        </code>
                      </span>
                      <span>
                        API:{' '}
                        <code className='font-mono text-text-strong-950'>
                          {vmsApiHost(normalizedHostname)}
                        </code>
                      </span>
                    </div>
                  ) : (
                    <span className='text-paragraph-sm text-text-soft-400'>
                      Enter a domain to see the hosts.
                    </span>
                  )}
                </div>
              </div>

              <div className='flex items-center justify-end gap-2'>
                {domainRow?.name ? (
                  <Button.Root
                    type='button'
                    variant='error'
                    mode='ghost'
                    size='small'
                    onClick={() => setRemoveConfirmOpen(true)}
                    disabled={removingDomain}
                    className='gap-1'
                  >
                    <Button.Icon as={RiDeleteBinLine} />
                    Remove domain
                  </Button.Root>
                ) : null}
                <Button.Root
                  type='button'
                  variant='primary'
                  mode='stroke'
                  size='small'
                  onClick={() => openSetupForDomain(domainRow?.hostname)}
                  disabled={!normalizedHostname || !domainRow?.name}
                  title={!domainRow?.name ? 'Save the domain first' : undefined}
                  className='gap-1'
                >
                  <Button.Icon as={RiGlobalLine} />
                  Setup domain
                </Button.Root>
              </div>

              {domainRow?.setup_status === 'Failed' && domainRow?.setup_error ? (
                <div className='rounded-md border border-error-base/30 bg-error-lighter/40 px-3 py-2 text-paragraph-xs text-error-base whitespace-pre-wrap'>
                  {domainRow.setup_error}
                </div>
              ) : null}
            </div>

            {/* ---------- Branding ---------- */}
            <div className='border-t border-stroke-soft-200 pt-5 flex flex-col gap-5'>
              <SectionHeading
                title='Branding'
                description='Logo and colors shown on the client kiosk splash, login, and header.'
              />

              <div className='flex flex-col gap-1'>
                <FieldLabel>Logo</FieldLabel>
                <div className='flex flex-wrap items-center gap-3'>
                  <div className='flex h-14 min-w-[120px] items-center justify-center rounded-md border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-4'>
                    {logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
                        alt='VMS logo preview'
                        className='max-h-10 max-w-[160px] object-contain'
                      />
                    ) : (
                      <span className='text-paragraph-xs text-text-soft-400'>No logo</span>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type='file'
                    accept='image/png,image/jpeg,image/svg+xml,image/webp'
                    className='sr-only'
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                  />
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                  </Button.Root>
                </div>
              </div>

              <div className='flex gap-3'>
                <div className='flex flex-1 flex-col gap-1'>
                  <FieldLabel>Brand color</FieldLabel>
                  <div className='flex items-center gap-3'>
                    <label className='relative flex h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-stroke-soft-200'>
                      <input
                        type='color'
                        value={brandColorValue}
                        onChange={(e) => {
                          handleBrandColorChange(e.target.value);
                        }}
                        onBlur={(e) => handleBrandColorBlur(e.target.value)}
                        className='absolute inset-0 h-full w-full cursor-pointer border-0 p-0'
                        aria-label='Pick brand color'
                      />
                    </label>
                    <div className='flex-1 min-w-[120px]'>
                      <EditableFieldWrapper editable iconClassName='mr-2'>
                        <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                          <Input.Wrapper>
                            <Input.Input
                              value={form.custom_vms_brand_color}
                              onChange={(e) => handleBrandColorChange(e.target.value)}
                              onBlur={(e) => handleBrandColorBlur(e.target.value)}
                              placeholder='#0D9466'
                              maxLength={7}
                              className='text-label-sm text-text-main-900 font-mono'
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </EditableFieldWrapper>
                    </div>
                  </div>
                </div>

                <div className='flex flex-1 flex-col gap-1'>
                  <FieldLabel>App display name</FieldLabel>
                  <EditableFieldWrapper editable iconClassName='mr-2'>
                    <Input.Root variant='borderless' size='xsmall' className='-ml-2'>
                      <Input.Wrapper>
                        <Input.Input
                          value={form.custom_vms_app_display_name}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              custom_vms_app_display_name: e.target.value,
                            }))
                          }
                          onBlur={(e) => handleAppNameBlur(e.target.value)}
                          placeholder='Client VMS'
                          className='text-label-sm text-text-main-900'
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </EditableFieldWrapper>
                </div>
              </div>
            </div>

            {/* ---------- Module access ---------- */}
            <div className='border-t border-stroke-soft-200 pt-5 flex flex-col gap-3'>
              <SectionHeading
                title='VMS module access'
                description='Internal SOP modules (Space Inquiry, Staff Attendance) are off by default for clients.'
              />
              <div className='flex flex-col divide-y divide-stroke-soft-200'>
                {vmsModules.map((row) => (
                  <div
                    key={row.module_key}
                    className='flex items-center justify-between gap-4 py-3'
                  >
                    <span className='text-paragraph-sm text-text-strong-950'>
                      {row.module_label || row.module_key}
                    </span>
                    <Switch.Root
                      checked={Boolean(row.enabled)}
                      onCheckedChange={(checked) => handleModuleToggle(row.module_key, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <SetupDomainModal
        open={Boolean(setupDomain)}
        onOpenChange={(next) => {
          if (!next) setSetupDomain(null);
        }}
        customerId={clientId}
        baseDomain={setupDomain || ''}
        onCompleted={handleSetupCompleted}
      />

      <DeleteConfirmModal
        isOpen={removeConfirmOpen}
        onOpenChange={(next) => {
          if (!removingDomain) setRemoveConfirmOpen(next);
        }}
        title='Remove domain?'
        description={
          domainRow?.setup_status && domainRow.setup_status !== 'Not Started'
            ? `This will tear down the SSL certificate, Nginx config, and Amplify domain association for ${normalizedHostname || domainRow.hostname}, then remove the mapping from this client.`
            : `This will remove ${normalizedHostname || domainRow?.hostname || 'this domain'} from this client.`
        }
        note={
          ['Active', 'Verifying'].includes(domainRow?.setup_status)
            ? 'The kiosk and the API server will stop serving immediately. Custom VMS will stay enabled — add a new domain anytime to point it elsewhere.'
            : null
        }
        confirmLabel='Remove'
        loadingLabel='Removing…'
        isLoading={removingDomain}
        onConfirm={handleRemoveDomain}
      />
    </div>
  );
};

export default ClientDetailCustomVmsTab;
