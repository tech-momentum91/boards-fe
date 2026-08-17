import React, { Suspense, lazy, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import KnowledgeCenterLanding from '@/pages/profile/knowledge-center-landing';
import {
  KNOWLEDGE_CENTER_CALL_RECORDINGS,
  KNOWLEDGE_CENTER_CASE_STUDIES,
  KNOWLEDGE_CENTER_MEDIA,
  KNOWLEDGE_CENTER_QA,
  KNOWLEDGE_CENTER_ROOT,
} from '@/pages/profile/knowledge-center-paths';
import { cn } from '@/utils/cn';

const KnowledgeCenterQaSection = lazy(() => import('@/pages/profile/knowledge-center-qa-section'));
const KnowledgeCenterMediaSection = lazy(
  () => import('@/pages/profile/knowledge-center-media-section'),
);
const KnowledgeCenterCaseStudiesSection = lazy(
  () => import('@/pages/profile/knowledge-center-case-studies-section'),
);
const KnowledgeCenterCallRecordingsSection = lazy(
  () => import('@/pages/profile/knowledge-center-call-recordings-section'),
);
const KnowledgeCenterDetailDrawer = lazy(
  () => import('@/pages/profile/knowledge-center-detail-drawer'),
);

function KnowledgeCenterSectionSuspenseFallback() {
  return (
    <div className='flex min-h-[200px] items-center justify-center'>
      <p className='paragraph-small text-text-sub-500' aria-live='polite'>
        Loading…
      </p>
    </div>
  );
}

/**
 * Knowledge Center shell: landing hub vs section routes (Q&A, Center Media, etc.).
 */
const KnowledgeCenterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { qaId } = useParams();

  const isKnowledgeCenterLanding = location.pathname === KNOWLEDGE_CENTER_ROOT;
  const isQaSection = location.pathname.startsWith(`${KNOWLEDGE_CENTER_ROOT}/QA`);
  const isMediaSection = location.pathname.startsWith(KNOWLEDGE_CENTER_MEDIA);
  const isCaseStudiesSection = location.pathname.startsWith(KNOWLEDGE_CENTER_CASE_STUDIES);
  const isCallRecordingsSection = location.pathname.startsWith(KNOWLEDGE_CENTER_CALL_RECORDINGS);

  const handleDrawerOpenChange = useCallback(
    (next) => {
      if (!next) {
        navigate(KNOWLEDGE_CENTER_QA);
      }
    },
    [navigate],
  );

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col',
        isQaSection || isMediaSection || isCaseStudiesSection || isCallRecordingsSection
          ? 'min-h-0 flex-1 overflow-hidden'
          : 'gap-5',
      )}
    >
      {isKnowledgeCenterLanding ? <KnowledgeCenterLanding /> : null}

      {isQaSection ? (
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <Suspense fallback={<KnowledgeCenterSectionSuspenseFallback />}>
            <KnowledgeCenterQaSection />
            <KnowledgeCenterDetailDrawer
              open={Boolean(qaId)}
              onOpenChange={handleDrawerOpenChange}
              qaId={qaId}
              panelVariant={qaId === 'new' ? 'extracting' : 'generated'}
            />
          </Suspense>
        </div>
      ) : null}

      {isMediaSection ? (
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <Suspense fallback={<KnowledgeCenterSectionSuspenseFallback />}>
            <KnowledgeCenterMediaSection />
          </Suspense>
        </div>
      ) : null}

      {isCaseStudiesSection ? (
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <Suspense fallback={<KnowledgeCenterSectionSuspenseFallback />}>
            <KnowledgeCenterCaseStudiesSection />
          </Suspense>
        </div>
      ) : null}

      {isCallRecordingsSection ? (
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <Suspense fallback={<KnowledgeCenterSectionSuspenseFallback />}>
            <KnowledgeCenterCallRecordingsSection />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
};

export default KnowledgeCenterPage;
