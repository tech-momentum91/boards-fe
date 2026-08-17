import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiErrorWarningLine, RiLoader4Line } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import ProposalBuilderShell from '@/components/ui/proposal-builder/shell/proposal-builder-shell';
import { cn } from '@/utils/cn';
import {
  BUILDER_STATUS,
  loadProposalBuilder,
  resetProposalBuilder,
  selectBuilderError,
  selectBuilderStatus,
} from '@/redux/crmProposalBuilderSlice';

import '@/components/ui/proposal-builder/styles/proposal-builder.css';

const ProposalBuilderRoot = ({ proposalId, onExit, readOnly = false, className }) => {
  const dispatch = useDispatch();
  const status = useSelector(selectBuilderStatus);
  const error = useSelector(selectBuilderError);

  useEffect(() => {
    if (!proposalId) return undefined;
    dispatch(loadProposalBuilder({ proposalId, readOnly }));
    return () => {
      dispatch(resetProposalBuilder());
    };
  }, [dispatch, proposalId, readOnly]);

  const isLoading = status === BUILDER_STATUS.LOADING || status === BUILDER_STATUS.IDLE;
  const isError = status === BUILDER_STATUS.ERROR;
  const isReady = status === BUILDER_STATUS.READY || status === BUILDER_STATUS.SAVING;

  return (
    <div className={cn('isolate flex h-full min-h-0 flex-col overflow-hidden', className)}>
      {isLoading ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-3'>
          <RiLoader4Line className='size-8 animate-spin text-primary-base' aria-hidden />
          <p className='paragraph-small text-text-sub-500'>Loading proposal…</p>
        </div>
      ) : null}

      {isError ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center'>
          <RiErrorWarningLine className='size-10 text-error-base' aria-hidden />
          <p className='paragraph-small text-text-sub-500'>{error}</p>
          <Button.Root type='button' variant='neutral' mode='stroke' size='small' onClick={onExit}>
            Go back
          </Button.Root>
        </div>
      ) : null}

      {isReady ? <ProposalBuilderShell onExit={onExit} /> : null}
    </div>
  );
};

export default ProposalBuilderRoot;
