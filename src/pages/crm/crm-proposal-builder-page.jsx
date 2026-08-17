import React, { useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import PageLayout from '@/components/page-layout';
import * as ProposalBuilder from '@/components/ui/proposal-builder';

const CrmProposalBuilderPage = () => {
  const navigate = useNavigate();
  const { proposalId: rawProposalId } = useParams();
  const [searchParams] = useSearchParams();
  const proposalId = decodeURIComponent(rawProposalId || '');
  const leadId = searchParams.get('lead');
  const readOnly = searchParams.get('mode') === 'view';

  const handleExit = useCallback(() => {
    if (leadId) {
      navigate(`/crm/leads/${encodeURIComponent(leadId)}?tab=proposals`, { replace: false });
      return;
    }
    navigate('/crm/proposals', { replace: false });
  }, [navigate, leadId]);

  if (!proposalId) {
    return (
      <PageLayout showSidebar={false} showDefaultHeader={false}>
        <div className='flex h-full items-center justify-center p-6'>
          <p className='paragraph-small text-text-sub-500'>Missing proposal id.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      showSidebar={false}
      showDefaultHeader={false}
      contentAreaClassName='overflow-hidden'
    >
      <ProposalBuilder.Root
        proposalId={proposalId}
        onExit={handleExit}
        readOnly={readOnly}
        className='h-full'
      />
    </PageLayout>
  );
};

export default CrmProposalBuilderPage;
