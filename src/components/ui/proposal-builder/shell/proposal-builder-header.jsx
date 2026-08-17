import React from 'react';
import {
  RiArrowLeftSLine,
  RiBarChartBoxLine,
  RiBuilding2Line,
  RiCloseLine,
  RiDownloadLine,
  RiGroupLine,
  RiHistoryLine,
  RiMapPinLine,
  RiShareForwardLine,
  RiSparklingLine,
} from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Select from '@/components/ui/select';
import {
  formatProposalVersionTime,
  getActiveProposalVersionLabel,
} from '@/components/ui/proposal-builder/deck/proposal-deck-versions';
import ProposalSharePopover from '@/components/ui/proposal-builder/shell/proposal-share-popover';
import { cn } from '@/utils/cn';

const MetaItem = ({ icon: Icon, children }) => (
  <span className='inline-flex items-center gap-1.5 text-paragraph-small text-text-sub-500'>
    <Icon className='size-5 shrink-0 text-icon-sub-500' aria-hidden />
    <span>{children}</span>
  </span>
);

const Dot = () => <span className='size-1 shrink-0 rounded-full bg-stroke-soft-200' aria-hidden />;

/**
 * Page header aligned with Figma DevX Proposal Builder (31592:1852071).
 */
const ProposalBuilderHeader = ({
  title,
  statusLabel,
  templateLabel,
  account,
  city,
  seats,
  contactName,
  contactInitials,
  onBack,
  onClose,
  onSave,
  onPdf,
  proposalId = null,
  onAiToggle,
  aiOpen,
  saveLabel,
  saveDisabled,
  pdfDisabled,
  readOnly,
  versions = [],
  activeVersionId = null,
  versionsLoading = false,
  onVersionChange,
  canRevert = false,
  onVersionRevert,
  onAnalytics,
  analyticsDisabled = false,
  className,
}) => {
  const versionLabel = getActiveProposalVersionLabel(versions, activeVersionId);

  return (
    <header
      className={cn(
        'flex shrink-0 items-center gap-3 border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-4',
        className,
      )}
    >
      <div className='flex min-w-0 flex-1 items-center gap-4'>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          onClick={onBack}
          aria-label='Back'
        >
          <Button.Icon as={RiArrowLeftSLine} />
        </Button.Root>

        <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
          <div className='flex min-w-0 flex-wrap items-center gap-3'>
            <h1 className='truncate text-label-lg text-text-main-900'>{title}</h1>
            {statusLabel ? (
              <Badge.Root variant='light' color='purple' size='small'>
                {statusLabel}
              </Badge.Root>
            ) : null}
            {templateLabel ? (
              <Badge.Root variant='stroke' color='gray' size='small'>
                {templateLabel}
              </Badge.Root>
            ) : null}
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <MetaItem icon={RiBuilding2Line}>{account}</MetaItem>
            <Dot />
            <MetaItem icon={RiMapPinLine}>{city}</MetaItem>
            <Dot />
            <MetaItem icon={RiGroupLine}>{seats} Seats</MetaItem>
            {contactName ? (
              <>
                <Dot />
                <span className='inline-flex items-center gap-1.5 text-paragraph-small text-text-sub-500'>
                  <span className='flex size-6 items-center justify-center rounded-full bg-blue-lighter text-label-xs text-blue-darker'>
                    {contactInitials || contactName.slice(0, 2).toUpperCase()}
                  </span>
                  {contactName}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          disabled={analyticsDisabled || !proposalId}
          onClick={onAnalytics}
          className='gap-3'
          title='View proposal analytics'
        >
          <Button.Icon as={RiBarChartBoxLine} />
          Analytics
        </Button.Root>

        <Select.Root
          value={activeVersionId || undefined}
          onValueChange={onVersionChange}
          disabled={readOnly || versionsLoading || versions.length === 0}
        >
          <Select.Trigger className='w-[220px]' aria-label='Proposal version history'>
            <Select.Value placeholder={versionsLoading ? 'Loading…' : versionLabel} />
          </Select.Trigger>
          <Select.Content align='end'>
            {versions.map((version) => (
              <Select.Item key={version.name} value={version.name}>
                {version.label}
                {version.saved_at ? ` · ${formatProposalVersionTime(version.saved_at)}` : ''}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        {canRevert ? (
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={onVersionRevert}
            className='gap-1'
            title='Revert to this version and remove all newer versions'
          >
            <Button.Icon as={RiHistoryLine} />
            Revert
          </Button.Root>
        ) : null}

        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          disabled={pdfDisabled}
          onClick={onPdf}
          className='gap-1'
          title='Export PDF via react-pdf renderer'
        >
          <Button.Icon as={RiDownloadLine} />
          PDF
        </Button.Root>

        <ProposalSharePopover
          proposalId={proposalId}
          activeVersionId={activeVersionId}
          readOnly={readOnly}
          disabled={!proposalId}
        >
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='gap-1'
            disabled={!proposalId}
          >
            <Button.Icon as={RiShareForwardLine} />
            Share
          </Button.Root>
        </ProposalSharePopover>

        {/* <Button.Root
          type='button'
          variant='neutral'
          mode='lighter'
          size='small'
          className={cn('bg-gradient-to-br from-[#f6f8fa] to-[#ede9fe]')}
          onClick={onAiToggle}
          aria-label='DevX AI assistant'
          aria-pressed={aiOpen}
        >
          <Button.Icon as={RiSparklingLine} className='text-feature-base' />
        </Button.Root> */}

        {!readOnly ? (
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            disabled={saveDisabled}
            onClick={onSave}
          >
            {saveLabel}
          </Button.Root>
        ) : null}

        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          onClick={onClose ?? onBack}
          aria-label='Close'
        >
          <Button.Icon as={RiCloseLine} />
        </Button.Root>
      </div>
    </header>
  );
};

export default ProposalBuilderHeader;
