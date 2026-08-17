import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';
import { RiFileList2Line } from 'react-icons/ri';

import PageLayout from '@/components/page-layout';
import ErrorStateCard from '@/components/ui/error-state-card';
import ClientDetailCsiForm from '@/components/clients-management/client-detail-csi/client-detail-csi-form';
import CsiThankYou from '@/components/clients-management/client-detail-csi/csi-thank-you';
import {
  fetchPublicCsiSurveyThunk,
  selectCsiSurveyDetail,
  submitCsiSurveyThunk,
} from '@/redux/clientDetailSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

const PublicCsiPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const key = searchParams.get('key');

  const dispatch = useDispatch();
  const csiSurveyDetail = useSelector(selectCsiSurveyDetail);
  const { data: survey, isLoading, error } = csiSurveyDetail;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!id || !key) return;
    dispatch(fetchPublicCsiSurveyThunk({ surveyId: id, key }));
  }, [dispatch, id, key]);

  const handleSubmit = async ({ serviceRatings, overallComment, submitBy }) => {
    if (!id || !key) return;

    try {
      setIsSubmitting(true);
      await dispatch(
        submitCsiSurveyThunk({
          surveyName: id,
          serviceRatings,
          overallComment,
          submitBy,
          key,
          isPublic: true,
        }),
      ).unwrap();
      showSuccessToast('CSI survey submitted successfully.');
      setIsSubmitted(true);
    } catch (error_) {
      showErrorToast(error_, { defaultMessage: 'Failed to submit CSI survey.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (id && key) {
      dispatch(fetchPublicCsiSurveyThunk({ surveyId: id, key }));
    }
  };

  const renderContent = () => {
    if (!id || !key) {
      return (
        <div className='flex items-center justify-center px-6 py-12'>
          <ErrorStateCard
            title='Invalid survey link'
            message='Please contact support for a new link.'
          />
        </div>
      );
    }

    if (isLoading && !survey) {
      return (
        <div className='flex items-center justify-center h-full px-6'>
          <div className='flex flex-col items-center gap-3'>
            <div className='w-8 h-8 border-4 border-primary-base border-t-transparent rounded-full animate-spin' />
            <p className='text-paragraph-sm text-text-sub-500'>Loading survey...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className='flex items-center justify-center px-6 py-12'>
          <ErrorStateCard
            title='Unable to load this CSI survey'
            message={extractErrorMessage(error)}
            onRetry={handleRetry}
          />
        </div>
      );
    }

    if (!survey) {
      return (
        <div className='flex items-center justify-center px-6 py-12'>
          <ErrorStateCard
            title='Survey not available'
            message='This CSI survey link is no longer available.'
          />
        </div>
      );
    }

    const statusLower = (survey.status || '').toLowerCase();
    const isCompleted = statusLower === 'completed' || isSubmitted;

    if (isCompleted) {
      return <CsiThankYou />;
    }

    return (
      <div className='w-full h-full flex items-start justify-center px-6 py-8'>
        <div className='w-full max-w-2xl rounded-2xl border border-stroke-soft-200 p-6'>
          <ClientDetailCsiForm
            survey={survey}
            isEditable
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            showScoreLabel={false}
          />
        </div>
      </div>
    );
  };

  return (
    <PageLayout
      pageTitle='Customer Satisfaction Survey'
      pageIcon={<RiFileList2Line size={24} />}
      pageDescription='Please rate your recent experience.'
      sidebarInitialOpen={false}
      showSidebar={false}
    >
      {renderContent()}
    </PageLayout>
  );
};

export default PublicCsiPage;
