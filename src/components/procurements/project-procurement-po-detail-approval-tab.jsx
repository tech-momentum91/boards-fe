import React, { useState } from 'react';

import * as Avatar from '@/components/ui/avatar';
import { cn } from '@/utils/cn';

function RoleBadge({ children }) {
  return (
    <span className='inline-flex items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 px-2 py-[2px] text-[12px] font-medium leading-4 text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === 'approved') {
    return (
      <span className='inline-flex items-center justify-center rounded-full bg-[#b5dfcc] px-2 py-[2px] text-[11px] font-medium uppercase leading-[12px] tracking-[0.22px] text-[#045933]'>
        Approved
      </span>
    );
  }

  if (status === 'pending' || status === 'pending_action') {
    return (
      <span className='inline-flex items-center justify-center rounded-full bg-[#ffdac2] px-2 py-[2px] text-[11px] font-medium uppercase leading-[12px] tracking-[0.22px] text-[#6e330c]'>
        Approval Pending
      </span>
    );
  }

  return null;
}

function ApprovalAvatar({ initials }) {
  return (
    <Avatar.Root size={32} color='gray' className='shrink-0 border border-black/[0.08]'>
      <span className='text-paragraph-sm font-semibold text-[#667085]'>{initials}</span>
    </Avatar.Root>
  );
}

function SignatureActionCard({ onApprove, onReject }) {
  const [hasSignature, setHasSignature] = useState(false);

  return (
    <div className='border-b border-stroke-soft-200 bg-white px-3 py-2.5'>
      <button
        type='button'
        onClick={() => setHasSignature(true)}
        className='flex w-full flex-col gap-2 rounded-2xl border border-stroke-soft-200 bg-[rgba(246,248,250,0.4)] p-6 text-left shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'
        aria-label={hasSignature ? 'Signature added' : 'Add signature'}
      >
        <p
          className={cn(
            'min-h-[112px] text-[40px] font-medium leading-[48px] tracking-[-0.4px]',
            hasSignature
              ? 'font-serif italic text-text-main-900 opacity-80'
              : 'text-text-main-900 opacity-10',
          )}
        >
          {hasSignature ? 'Signed' : 'Sign Here'}
        </p>
        <div className='flex w-full flex-col gap-2'>
          <div className='h-px w-full bg-stroke-soft-200' aria-hidden />
          <p className='text-[12px] font-medium leading-[18px] text-text-main-900 opacity-50'>
            {hasSignature ? 'Signature added — you can approve' : 'To approve add your signature'}
          </p>
        </div>
      </button>

      <div className='mt-2 flex items-center gap-2'>
        <button
          type='button'
          onClick={onApprove}
          disabled={!hasSignature}
          className={cn(
            'rounded-lg px-2.5 py-1 text-paragraph-sm font-medium',
            hasSignature
              ? 'bg-primary-base text-white shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              : 'cursor-not-allowed bg-bg-weak-100 text-text-disabled-300',
          )}
        >
          Approve
        </button>
        <button
          type='button'
          onClick={onReject}
          className='rounded-lg bg-[#df1c41] px-2.5 py-1 text-paragraph-sm font-medium text-white shadow-[0px_1px_2px_0px_rgba(233,53,53,0.08)]'
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function ApprovalStepCard({ step, onApprove, onReject }) {
  const showSignature = step.status === 'pending_action' && step.actionType === 'signature';
  const showComment = step.status === 'approved' || step.status === 'pending_action';
  const isRemarksPlaceholder = step.remarksPlaceholder;

  return (
    <div className='flex gap-2'>
      <div className='py-1'>
        <ApprovalAvatar initials={step.initials} />
      </div>

      <div className='min-w-0 flex-1 overflow-hidden rounded-[10px] border border-stroke-soft-200 bg-[#fbfbfb] shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
        <div className='flex items-center justify-between gap-3 border-b border-stroke-soft-200 bg-[#fbfbfb] px-3 py-2 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
          <div className='flex min-w-0 flex-wrap items-center gap-2'>
            <span className='truncate text-paragraph-sm font-medium text-text-main-900'>
              {step.name}
            </span>
            <RoleBadge>{step.role}</RoleBadge>
          </div>
          <StatusBadge status={step.status} />
        </div>

        {showSignature ? <SignatureActionCard onApprove={onApprove} onReject={onReject} /> : null}

        {showComment && step.comment && !showSignature ? (
          <div className='border-b border-stroke-soft-200 bg-white px-3 py-2.5'>
            <p
              className={cn(
                'text-paragraph-sm',
                isRemarksPlaceholder
                  ? 'font-normal text-text-soft-400'
                  : 'font-medium text-[#525866] opacity-70',
              )}
            >
              {step.comment}
            </p>
          </div>
        ) : null}

        {step.timestamp && !showSignature ? (
          <div className='bg-[#fbfbfb] px-3 py-2'>
            <p className='text-[12px] font-medium leading-[18px] text-text-soft-400'>
              {step.timestamp}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ProjectProcurementPoDetailApprovalTab({
  steps = [],
  onApproveCurrent,
  onRejectCurrent,
}) {
  return (
    <div className='relative px-6 py-5'>
      <div className='absolute bottom-5 left-[40px] top-9 w-px bg-stroke-soft-200' aria-hidden />

      <div className='relative flex flex-col gap-3'>
        {steps.map((step) => (
          <ApprovalStepCard
            key={step.id}
            step={step}
            onApprove={step.status === 'pending_action' ? onApproveCurrent : undefined}
            onReject={step.status === 'pending_action' ? onRejectCurrent : undefined}
          />
        ))}
      </div>
    </div>
  );
}
