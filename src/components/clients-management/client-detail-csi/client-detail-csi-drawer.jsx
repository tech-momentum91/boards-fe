import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine } from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import ClientDetailCsiDrawerSkeleton from '@/components/clients-management/client-detail-csi/client-detail-csi-drawer-skeleton';
import ClientDetailCsiForm from '@/components/clients-management/client-detail-csi/client-detail-csi-form';
import {
  fetchCsiSurveyDetailThunk,
  submitCsiSurveyThunk,
  selectCsiSurveyDetail,
  setSelectedCsiSurvey,
  clearSelectedCsiSurvey,
} from '@/redux/clientDetailSlice';
import { getInitials } from '@/lib/utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const ClientDetailCsiDrawer = ({
  isOpen,
  onOpenChange,
  surveyName,
  surveys = [],
  onNavigate,
  allowEdit = true,
}) => {
  const dispatch = useDispatch();
  const surveyDetail = useSelector(selectCsiSurveyDetail);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && surveyName) {
      dispatch(fetchCsiSurveyDetailThunk({ surveyName }));
    }
  }, [isOpen, surveyName, dispatch]);

  const handleClose = () => {
    dispatch(clearSelectedCsiSurvey());
    onOpenChange(false);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      // Could show a toast notification here
    });
  };

  const currentIndex = surveys.findIndex((s) => s.name === surveyName);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < surveys.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const previousSurvey = surveys[currentIndex - 1];
      dispatch(setSelectedCsiSurvey(previousSurvey.name));
      if (onNavigate) onNavigate(previousSurvey.name);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextSurvey = surveys[currentIndex + 1];
      dispatch(setSelectedCsiSurvey(nextSurvey.name));
      if (onNavigate) onNavigate(nextSurvey.name);
    }
  };

  const survey = surveyDetail.data || {};
  const { isLoading } = surveyDetail;

  const statusLower = (survey.status || '').toLowerCase();
  const statusAllowsEdit = statusLower === 'pending' || statusLower === 'draft';
  const isEditable = allowEdit && statusAllowsEdit;

  const handleFormSubmit = async ({ serviceRatings, overallComment }) => {
    if (!isEditable) return;

    try {
      setIsSubmitting(true);
      await dispatch(
        submitCsiSurveyThunk({
          surveyName,
          serviceRatings,
          overallComment,
        }),
      ).unwrap();
      showSuccessToast('CSI survey submitted successfully.');
      handleClose();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to submit CSI survey.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={handleClose}>
      <Drawer.Content className='max-w-[600px]'>
        {/* Header */}
        <Drawer.Header
          className='px-6 py-3 border-b border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-center justify-between w-full'>
            <div className='flex items-center gap-3'>
              <ButtonGroup.Root size='xsmall' className='shadow-regular-xs'>
                <ButtonGroup.Item onClick={handlePrevious} disabled={!hasPrevious}>
                  <ButtonGroup.Icon as={RiArrowLeftSLine} />
                </ButtonGroup.Item>
                <ButtonGroup.Item onClick={handleNext} disabled={!hasNext}>
                  <ButtonGroup.Icon as={RiArrowRightSLine} />
                </ButtonGroup.Item>
              </ButtonGroup.Root>

              {/* <Button.Root
                variant='primary'
                mode='stroke'
                size='medium'
                onClick={handleCopyLink}
                className='gap-2 shadow-button-stroke-important'
              >
                <Button.Icon as={RiLink} />
                Copy Link
              </Button.Root> */}
            </div>

            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={handleClose}
              className='shadow-regular-xs'
            >
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        {/* Body */}
        <Drawer.Body className='px-6 py-5 overflow-y-auto'>
          {isLoading ? (
            <ClientDetailCsiDrawerSkeleton isOpen={isOpen} onOpenChange={onOpenChange} />
          ) : (
            <ClientDetailCsiForm
              survey={survey}
              isEditable={isEditable}
              isSubmitting={isSubmitting}
              onSubmit={handleFormSubmit}
              showScoreLabel={true}
            />
          )}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default ClientDetailCsiDrawer;
