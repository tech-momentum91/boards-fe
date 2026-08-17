import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';
import ProjectExternalSnagForm from '@/components/projects/snags/project-external-snag-form';
import ErrorStateCard from '@/components/ui/error-state-card';
import {
  clearPublicSnagForm,
  fetchPublicSnagFormContext,
  selectPublicSnagFormContext,
  selectPublicSnagFormError,
  selectPublicSnagFormLoading,
  selectPublicSnagSubmitLoading,
  submitPublicSnag,
} from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

export default function PublicProjectSnagFormPage() {
  const dispatch = useDispatch();
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const key = searchParams.get('key');

  const context = useSelector(selectPublicSnagFormContext);
  const isLoading = useSelector(selectPublicSnagFormLoading);
  const error = useSelector(selectPublicSnagFormError);
  const isSubmitting = useSelector(selectPublicSnagSubmitLoading);

  useEffect(() => {
    if (!projectId || !key) return undefined;

    dispatch(fetchPublicSnagFormContext({ projectId, key }));

    return () => {
      dispatch(clearPublicSnagForm());
    };
  }, [dispatch, projectId, key]);

  const handleSubmit = async (values, attachments, markerCoordinates) => {
    if (!projectId || !key) return;

    try {
      await dispatch(
        submitPublicSnag({ projectId, key, values, attachments, markerCoordinates }),
      ).unwrap();
      showSuccessToast('Snag submitted successfully');
    } catch (submitError) {
      showErrorToast(extractErrorMessage(submitError));
      throw submitError;
    }
  };

  if (!projectId || !key) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-bg-weak-50 px-6 py-12'>
        <ErrorStateCard
          title='Invalid snag form link'
          message='Please contact the project team for a valid link.'
        />
      </div>
    );
  }

  const errorMessage = error ? extractErrorMessage(error) : null;

  return (
    <div className='min-h-screen bg-bg-weak-50 px-4 py-8 sm:px-6'>
      <div className='mx-auto w-full max-w-[800px]'>
        {isLoading ? (
          <div className='flex min-h-[320px] items-center justify-center text-paragraph-sm text-text-sub-500'>
            Loading snag form…
          </div>
        ) : errorMessage ? (
          <ErrorStateCard title='Unable to open snag form' message={errorMessage} />
        ) : (
          <ProjectExternalSnagForm
            context={context}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
