import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAlertLine,
  RiCheckLine,
  RiFileCopyLine,
  RiGlobalLine,
  RiLoader4Line,
} from 'react-icons/ri';

import apiClient from '@/api/axios';
import * as Alert from '@/components/ui/alert';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

async function call(method, payload = {}) {
  const { data } = await apiClient.post(`/method/${method}`, payload);
  return data?.message ?? data;
}

async function copy(text, label = 'Value') {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showSuccessToast(`${label} copied`);
  } catch {
    showErrorToast(`Failed to copy ${label.toLowerCase()}`);
  }
}

function CopyField({ label, value, copyable = true }) {
  return (
    <div className='flex flex-col gap-1 min-w-0'>
      <span className='text-paragraph-xs uppercase text-text-sub-500'>{label}</span>
      <div className='flex items-center gap-2'>
        <code
          className={cn(
            'flex-1 truncate rounded-md border border-stroke-soft-200 bg-bg-weak-50 px-2.5 py-1.5 text-paragraph-sm font-mono',
            copyable ? 'text-text-strong-950' : 'text-text-sub-500 italic',
          )}
          title={value}
        >
          {value || '—'}
        </code>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='xsmall'
          onClick={() => copy(value, label)}
          disabled={!copyable}
          aria-label={`Copy ${label}`}
        >
          <Button.Icon as={RiFileCopyLine} />
        </Button.Root>
      </div>
    </div>
  );
}

function StatusBadge({ label, ok, pending, error, detail }) {
  let color = 'gray';
  let Icon = RiLoader4Line;
  let iconClass = '';
  if (error) {
    color = 'red';
    Icon = RiAlertLine;
  } else if (ok) {
    color = 'green';
    Icon = RiCheckLine;
  } else if (pending) {
    color = 'orange';
    Icon = RiLoader4Line;
    iconClass = 'animate-spin';
  }
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Badge.Root
          variant='lighter'
          color={color}
          size='medium'
          className='cursor-help'
          aria-label={`${label}: ${detail || (ok ? 'OK' : pending ? 'Pending' : 'Unknown')}`}
        >
          <Badge.Icon as={Icon} className={iconClass} />
          <span className='whitespace-nowrap'>{label}</span>
        </Badge.Root>
      </Tooltip.Trigger>
      <Tooltip.Content variant='light' size='small' className='max-w-[260px]'>
        <div className='flex flex-col gap-0.5 text-left'>
          <span className='font-medium text-text-strong-950'>{label}</span>
          <span className='text-text-sub-600'>
            {detail || (ok ? 'Verified' : pending ? 'Pending' : 'Unknown')}
          </span>
        </div>
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

function DnsRow({ record }) {
  const showWaiting = !record.verified;
  return (
    <div className='rounded-lg border border-stroke-soft-200 p-3 flex flex-col gap-2'>
      <div className='flex items-center justify-between gap-2'>
        <div className='text-paragraph-sm font-medium text-text-strong-950'>{record.purpose}</div>
        {record.verified ? (
          <span className='inline-flex items-center gap-1 rounded-full bg-success-lighter px-2 py-0.5 text-paragraph-xs font-medium text-success-base'>
            <RiCheckLine className='size-3' />
            verified
          </span>
        ) : showWaiting ? (
          <span className='inline-flex items-center gap-1 rounded-full bg-warning-lighter px-2 py-0.5 text-paragraph-xs font-medium text-warning-base'>
            <RiLoader4Line className='size-3 animate-spin' />
            waiting
          </span>
        ) : null}
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-[80px_1fr_1.4fr] gap-3'>
        <div className='flex flex-col gap-1'>
          <span className='text-paragraph-xs uppercase text-text-sub-500'>Type</span>
          <span className='inline-flex items-center justify-center rounded-md border border-stroke-soft-200 bg-bg-weak-50 px-2.5 py-1.5 text-paragraph-sm font-medium text-text-strong-950'>
            {record.type}
          </span>
        </div>
        <CopyField label='Name' value={record.name} copyable={Boolean(record.value_ready)} />
        <CopyField label='Value' value={record.value} copyable={Boolean(record.value_ready)} />
      </div>
      {record.hint ? <p className='text-paragraph-xs text-text-sub-500'>{record.hint}</p> : null}
    </div>
  );
}

const POLL_INTERVAL_MS = 5000;

export default function SetupDomainModal({
  open,
  onOpenChange,
  customerId,
  baseDomain,
  onCompleted,
}) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pollTimer = useRef(null);
  const cancelledRef = useRef(false);
  const completedSignalledRef = useRef(false);

  // Callback props change identity on every parent render (inline arrows).
  // We keep them in refs so the polling effect doesn't tear down/rebuild
  // (which would flicker the modal between "Preparing…" and the records view).
  const onOpenChangeRef = useRef(onOpenChange);
  const onCompletedRef = useRef(onCompleted);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);
  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const refresh = useCallback(
    async ({ isPoll } = { isPoll: false }) => {
      if (!customerId || !baseDomain) return;
      try {
        const result = await call('devx.api.vms_domain_setup.prepare_domain_setup', {
          customer: customerId,
          base_domain: baseDomain,
        });
        if (cancelledRef.current) return;
        setState(result);

        const terminal = result?.status === 'Active' || result?.status === 'Failed';
        if (result?.status === 'Active' && !completedSignalledRef.current) {
          completedSignalledRef.current = true;
          onCompletedRef.current?.(result);
        }

        if (terminal) {
          stopPolling();
          return;
        }
        // Keep polling silently for as long as the modal stays open.
        pollTimer.current = setTimeout(() => refresh({ isPoll: true }), POLL_INTERVAL_MS);
      } catch (error) {
        if (cancelledRef.current) return;
        stopPolling();
        if (!isPoll) {
          showErrorToast(error, { defaultMessage: 'Failed to prepare domain setup' });
          onOpenChangeRef.current?.(false);
        }
      }
    },
    [customerId, baseDomain, stopPolling],
  );

  // Intentionally NOT depending on `refresh` / `stopPolling` — both are
  // stable (their own deps are the same as this effect's), so listing them
  // would just cause spurious re-runs and the "Preparing…" flicker.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    cancelledRef.current = false;
    completedSignalledRef.current = false;
    if (!open || !customerId || !baseDomain) {
      setState(null);
      stopPolling();
      return undefined;
    }
    setLoading(true);
    refresh({ isPoll: false }).finally(() => {
      if (!cancelledRef.current) setLoading(false);
    });
    return () => {
      cancelledRef.current = true;
      stopPolling();
    };
  }, [open, customerId, baseDomain]);

  const handleApiServerSetup = async () => {
    if (!customerId || !baseDomain) return;
    stopPolling();
    setSubmitting(true);
    try {
      const result = await call('devx.api.vms_domain_setup.setup_api_server', {
        customer: customerId,
        base_domain: baseDomain,
      });
      setState(result);
      if (result?.status === 'Active') {
        if (!completedSignalledRef.current) {
          completedSignalledRef.current = true;
          onCompleted?.(result);
        }
        showSuccessToast('Domain is fully active');
      } else {
        showSuccessToast('API server is set up — waiting on Amplify kiosk verification');
        // Resume polling so the user can watch the kiosk side finish.
        pollTimer.current = setTimeout(() => refresh({ isPoll: true }), POLL_INTERVAL_MS);
      }
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'API server setup failed' });
      refresh({ isPoll: false });
    } finally {
      setSubmitting(false);
    }
  };

  const status = state?.status || 'Not Started';
  const allValuesReady = (state?.dns_records || []).every((r) => r.value_ready);
  const apiDnsOk = Boolean(state?.api_dns_ok);
  const nginxProvisioned = Boolean(state?.nginx_provisioned);
  const kioskVerified = Boolean(state?.kiosk_verified);
  const hasFailure = status === 'Failed' && state?.error;
  const fullyActive = status === 'Active';

  const certVerified = useMemo(
    () =>
      (state?.dns_records || []).some((r) => r.purpose?.startsWith('Amplify SSL') && r.verified),
    [state],
  );

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='w-full sm:max-w-[600px]'>
        <Tooltip.Provider delayDuration={150}>
          <Modal.Header>
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-white-0 ring-1 ring-inset ring-stroke-soft-200',
              )}
            >
              <RiGlobalLine className='size-5 text-text-sub-600' />
            </div>
            <div className='flex-1 min-w-0 space-y-1'>
              <Modal.Title>Setup domain</Modal.Title>
              <Modal.Description>
                Add these DNS records at your provider, then set up the API server.
              </Modal.Description>
            </div>
          </Modal.Header>
          <Modal.Body className='flex flex-col gap-4 max-h-[70vh] overflow-y-auto'>
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-paragraph-sm text-text-sub-600'>
              <code className='font-mono text-text-strong-950 break-all'>{baseDomain}</code>
              {state?.kiosk_host ? (
                <>
                  <span>·</span>
                  <span>
                    kiosk <code className='font-mono break-all'>{state.kiosk_host}</code>
                  </span>
                  <span>·</span>
                  <span>
                    API <code className='font-mono break-all'>{state.api_host}</code>
                  </span>
                </>
              ) : null}
            </div>

            {state ? (
              <div className='flex flex-wrap items-center gap-1.5'>
                <StatusBadge
                  label='SSL cert'
                  ok={certVerified}
                  pending={!certVerified && !hasFailure}
                  detail={
                    certVerified
                      ? 'Validation CNAME accepted by ACM'
                      : 'Add the Amplify SSL validation CNAME at your DNS provider'
                  }
                />
                <StatusBadge
                  label='Kiosk'
                  ok={kioskVerified}
                  pending={!kioskVerified && !hasFailure}
                  detail={state.kiosk_state}
                />
                <StatusBadge
                  label='API DNS'
                  ok={apiDnsOk}
                  pending={!apiDnsOk && !hasFailure && !state.api_resolved_ip}
                  error={Boolean(state.api_resolved_ip && !apiDnsOk)}
                  detail={state.api_dns_state}
                />
                <StatusBadge
                  label='API SSL'
                  ok={nginxProvisioned}
                  pending={!nginxProvisioned && !hasFailure}
                  detail={
                    nginxProvisioned
                      ? 'Nginx + Let’s Encrypt cert installed'
                      : 'Run "Set up API server" once API DNS resolves'
                  }
                />
              </div>
            ) : null}

            {loading ? (
              <div className='flex items-center gap-2 text-paragraph-sm text-text-sub-500'>
                <RiLoader4Line className='animate-spin' /> Preparing DNS records…
              </div>
            ) : state?.dns_records?.length ? (
              <div className='flex flex-col gap-2'>
                {state.dns_records.map((rec, i) => (
                  <DnsRow key={`${rec.name}-${i}`} record={rec} />
                ))}
              </div>
            ) : null}

            {fullyActive ? (
              <Alert.Root variant='lighter' status='success' size='small'>
                <div className='flex gap-1'>
                  <Alert.Icon as={RiCheckLine} />
                  Domain is fully active — kiosk and API are both serving.
                </div>
              </Alert.Root>
            ) : !loading && !allValuesReady && !hasFailure ? (
              <Alert.Root variant='lighter' status='warning' size='small'>
                <div className='flex gap-1'>
                  <Alert.Icon as={RiAlertLine} />
                  Amplify hasn&apos;t computed all the record values yet. They&apos;ll appear here
                  automatically — keep this dialog open.
                </div>
              </Alert.Root>
            ) : !loading && allValuesReady && !apiDnsOk && !hasFailure ? (
              <Alert.Root variant='lighter' status='warning' size='small'>
                <div className='flex gap-1'>
                  <Alert.Icon as={RiAlertLine} />
                  Add the records above at your DNS provider. The &quot;Set up API server&quot;
                  button unlocks once the API A record resolves to the EC2 IP.
                </div>
              </Alert.Root>
            ) : null}

            {hasFailure ? (
              <Alert.Root variant='lighter' status='error' size='small'>
                <div className='flex gap-1'>
                  <Alert.Icon as={RiAlertLine} />
                  <pre className='whitespace-pre-wrap text-paragraph-xs leading-relaxed wrap-break-word'>
                    {state.error}
                  </pre>
                </div>
              </Alert.Root>
            ) : null}
          </Modal.Body>
          <Modal.Footer className='flex-col sm:flex-row gap-2'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='ghost'
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className='w-full sm:w-auto'
            >
              {fullyActive ? 'Done' : 'Close'}
            </Button.Root>
            {fullyActive ? null : (
              <Button.Root
                type='button'
                onClick={handleApiServerSetup}
                disabled={loading || submitting || !apiDnsOk}
                title={
                  !apiDnsOk ? 'API A record must resolve to the EC2 IP before setup' : undefined
                }
                className='w-full sm:w-auto'
              >
                {submitting
                  ? 'Setting up…'
                  : nginxProvisioned
                    ? 'Re-run API server setup'
                    : 'Set up API server'}
              </Button.Root>
            )}
          </Modal.Footer>
        </Tooltip.Provider>
      </Modal.Content>
    </Modal.Root>
  );
}
