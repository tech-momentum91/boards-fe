import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { fetchProjectProcurementDetail } from '@/api/projectProcurements';
import { PROCUREMENTS_SECTION_IDS } from '@/components/procurements/constants';
import ProjectProcurementDetailView from '@/components/procurements/project-procurement-detail-view';
import PageLayout from '@/components/page-layout';

export default function ProjectProcurementDetailPage() {
  const { projectId } = useParams();
  const decodedProjectId = decodeURIComponent(projectId ?? '');
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!decodedProjectId) {
      setProject(null);
      setIsLoading(false);
      setLoadFailed(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadFailed(false);

    fetchProjectProcurementDetail(decodedProjectId)
      .then((row) => {
        if (cancelled) return;
        setProject(row);
      })
      .catch(() => {
        if (cancelled) return;
        setProject(null);
        setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [decodedProjectId]);

  if (!decodedProjectId) {
    return (
      <Navigate to={`/procurements/${PROCUREMENTS_SECTION_IDS.PROJECT_PROCUREMENTS}`} replace />
    );
  }

  if (isLoading) {
    return (
      <PageLayout
        showDefaultHeader={false}
        borderDivClassName='hidden'
        contentAreaClassName='overflow-hidden bg-bg-white-0'
      >
        <div className='flex min-h-[320px] flex-1 items-center justify-center'>
          <p className='text-paragraph-sm text-text-soft-400'>Loading project procurement…</p>
        </div>
      </PageLayout>
    );
  }

  if (loadFailed || !project) {
    return (
      <Navigate to={`/procurements/${PROCUREMENTS_SECTION_IDS.PROJECT_PROCUREMENTS}`} replace />
    );
  }

  return (
    <PageLayout
      showDefaultHeader={false}
      borderDivClassName='hidden'
      contentAreaClassName='overflow-hidden bg-bg-white-0'
    >
      <ProjectProcurementDetailView project={project} />
    </PageLayout>
  );
}
