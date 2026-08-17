import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getProjectBillingQcVendors } from '@/api/projectBillingQc';
import ProjectBillingQcVendorDetailView from '@/components/projects/billing-qc/project-billing-qc-vendor-detail-view';
import PageLayout from '@/components/page-layout';
import ErrorStateCard from '@/components/ui/error-state-card';
import {
  fetchProjectDetail,
  selectProjectDetail,
  selectProjectDetailError,
  selectProjectDetailLoading,
} from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

function formatBillingAmount(value) {
  const amount = Number(value) || 0;
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function mapBillingQcRow(row) {
  return {
    ...row,
    po_value: typeof row.po_value === 'number' ? formatBillingAmount(row.po_value) : row.po_value,
    gmr_value:
      typeof row.gmr_value === 'number' ? formatBillingAmount(row.gmr_value) : row.gmr_value,
  };
}

export default function ProjectBillingQcVendorDetailPage() {
  const dispatch = useDispatch();
  const { projectId, vendorId } = useParams();
  const decodedProjectId = decodeURIComponent(projectId ?? '');
  const decodedVendorId = decodeURIComponent(vendorId ?? '');

  const projectDetail = useSelector(selectProjectDetail);
  const isProjectDetailLoading = useSelector(selectProjectDetailLoading);
  const projectDetailError = useSelector(selectProjectDetailError);

  const [vendor, setVendor] = useState(null);
  const [isVendorLoading, setIsVendorLoading] = useState(true);
  const [vendorLoadError, setVendorLoadError] = useState(null);

  useEffect(() => {
    if (!decodedProjectId || !decodedVendorId) return;
    let cancelled = false;

    setIsVendorLoading(true);
    setVendorLoadError(null);

    getProjectBillingQcVendors(decodedProjectId)
      .then((response) => {
        if (cancelled) return;
        const match = (response?.vendors ?? []).find((row) => row.id === decodedVendorId);
        if (match) {
          setVendor(mapBillingQcRow(match));
        } else {
          setVendor(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = extractErrorMessage(error);
          setVendorLoadError(message);
          showErrorToast(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsVendorLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [decodedProjectId, decodedVendorId]);

  useEffect(() => {
    if (!decodedProjectId) return;
    dispatch(fetchProjectDetail(decodedProjectId)).catch((error) => {
      showErrorToast(extractErrorMessage(error));
    });
  }, [dispatch, decodedProjectId]);

  if (!decodedProjectId || !decodedVendorId) {
    return <Navigate to='/procurements/project-procurements' replace />;
  }

  if (isVendorLoading) {
    return (
      <PageLayout
        showDefaultHeader={false}
        borderDivClassName='hidden'
        contentAreaClassName='bg-bg-white-0'
      >
        <div className='flex min-h-[50vh] items-center justify-center text-paragraph-sm text-text-sub-500'>
          Loading billing & QC vendor...
        </div>
      </PageLayout>
    );
  }

  if (vendorLoadError) {
    return (
      <PageLayout
        showDefaultHeader={false}
        borderDivClassName='hidden'
        contentAreaClassName='bg-bg-white-0'
      >
        <div className='flex min-h-full flex-col px-6 py-8'>
          <ErrorStateCard
            title='Unable to load vendor'
            message={vendorLoadError}
            onRetry={() => {
              setIsVendorLoading(true);
              setVendorLoadError(null);
              getProjectBillingQcVendors(decodedProjectId)
                .then((response) => {
                  const match = (response?.vendors ?? []).find((row) => row.id === decodedVendorId);
                  setVendor(match ? mapBillingQcRow(match) : null);
                })
                .catch((error) => setVendorLoadError(extractErrorMessage(error)))
                .finally(() => setIsVendorLoading(false));
            }}
          />
        </div>
      </PageLayout>
    );
  }

  if (!vendor) {
    return (
      <Navigate
        to={`/procurements/project-procurements/${encodeURIComponent(decodedProjectId)}?tab=billing-qc`}
        replace
      />
    );
  }

  const projectDetailErrorMessage = projectDetailError
    ? extractErrorMessage(projectDetailError, 'Failed to load project details')
    : null;

  if (!isProjectDetailLoading && projectDetailErrorMessage && !projectDetail) {
    return (
      <PageLayout
        showDefaultHeader={false}
        borderDivClassName='hidden'
        contentAreaClassName='bg-bg-white-0'
      >
        <div className='flex min-h-full flex-col px-6 py-8'>
          <ErrorStateCard
            title='Unable to load project'
            message={projectDetailErrorMessage}
            onRetry={() => dispatch(fetchProjectDetail(decodedProjectId))}
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      showDefaultHeader={false}
      borderDivClassName='hidden'
      contentAreaClassName='overflow-hidden bg-bg-white-0'
    >
      <ProjectBillingQcVendorDetailView
        projectId={decodedProjectId}
        projectDetail={projectDetail}
        vendor={vendor}
      />
    </PageLayout>
  );
}
