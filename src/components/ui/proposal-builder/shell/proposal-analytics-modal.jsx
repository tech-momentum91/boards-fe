import React from 'react';
import { BarChart3 } from 'lucide-react';

import { ProposalAnalyticsDashboard } from '@/components/proposal-analytics';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import { cn } from '@/utils/cn';

/**
 * Full-screen analytics modal opened from the proposal builder header.
 */
export function ProposalAnalyticsModal({ open, onOpenChange, proposalId = '' }) {
  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className={cn(
          'flex max-h-[min(92vh,880px)] w-full max-w-[min(100vw-2rem,960px)] flex-col overflow-hidden',
        )}
      >
        <Modal.Header>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-white-0 ring-1 ring-inset ring-stroke-soft-200'>
            <BarChart3 className='size-5 text-text-sub-600' aria-hidden />
          </div>
          <div className='flex-1 space-y-1'>
            <Modal.Title>Proposal Analytics</Modal.Title>
            <Modal.Description>
              Traffic, sections, and live visitor engagement for this proposal across all dates.
            </Modal.Description>
          </div>
        </Modal.Header>

        <Modal.Body
          data-proposal-analytics-scroll=''
          className='min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-bg-weak-50/60 px-8 py-6 sm:px-10'
        >
          <ProposalAnalyticsDashboard proposalId={proposalId} enabled={open} />
        </Modal.Body>

        <Modal.Footer className='flex-shrink-0 justify-end gap-2'>
          <Modal.Close asChild>
            <Button.Root type='button' variant='neutral' mode='stroke' size='small'>
              Close
            </Button.Root>
          </Modal.Close>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

export default ProposalAnalyticsModal;
