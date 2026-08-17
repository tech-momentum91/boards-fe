import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine } from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import ClientDetailCsiDrawerSkeleton from '@/components/clients-management/client-detail-csi/client-detail-csi-drawer-skeleton';
import VendorDetailRatingForm from '@/components/vendors-management/vendor-detail-rating/vendor-detail-rating-form';
import {
  fetchVendorRatingDetailThunk,
  submitVendorRatingThunk,
  selectVendorRatingDetail,
  selectSelectedVendorRating,
  setSelectedVendorRating,
  clearSelectedVendorRating,
} from '@/redux/vendorSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { isVendorRatingEditable } from '@/utils/vendor-utils';

const VendorDetailRatingDrawer = ({
  isOpen,
  onOpenChange,
  surveyName,
  surveys = [],
  vendorDisplayName = '',
  onNavigate,
  onSubmitted,
}) => {
  const dispatch = useDispatch();
  const surveyDetail = useSelector(selectVendorRatingDetail);
  const selectedVendorRating = useSelector(selectSelectedVendorRating);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !surveyName) return;
    // Pending rows: list payload has enough for the submit form; avoid parent doc fetch overwriting status.
    if (isVendorRatingEditable(selectedVendorRating.rowData)) return;
    dispatch(fetchVendorRatingDetailThunk({ surveyName }));
  }, [isOpen, surveyName, selectedVendorRating.rowData, dispatch]);

  const handleClose = () => {
    dispatch(clearSelectedVendorRating());
    onOpenChange(false);
  };

  const currentIndex = surveys.findIndex((s) => s.name === surveyName);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < surveys.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const previousSurvey = surveys[currentIndex - 1];
      dispatch(setSelectedVendorRating(previousSurvey));
      if (onNavigate) onNavigate(previousSurvey.name);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextSurvey = surveys[currentIndex + 1];
      dispatch(setSelectedVendorRating(nextSurvey));
      if (onNavigate) onNavigate(nextSurvey.name);
    }
  };

  const row = selectedVendorRating.rowData;
  const survey = useMemo(() => {
    if (isVendorRatingEditable(row)) return row ?? {};
    return surveyDetail.data ?? row ?? {};
  }, [row, surveyDetail.data]);
  const isLoading = surveyDetail.isLoading && !row;

  const statusAllowsEdit = isVendorRatingEditable(row);

  const handleFormSubmit = async ({ serviceRatings, overallComment, submitBy }) => {
    if (!statusAllowsEdit || !surveyName) return;

    try {
      setIsSubmitting(true);
      await dispatch(
        submitVendorRatingThunk({
          ratingName: surveyName,
          serviceRatings,
          overallComment,
          submitBy,
        }),
      ).unwrap();
      showSuccessToast('Vendor rating submitted successfully.');
      onSubmitted?.();
      handleClose();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to submit vendor rating.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={handleClose}>
      <Drawer.Content className='max-w-[600px]'>
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

        <Drawer.Body className='px-6 py-5 overflow-y-auto'>
          {isLoading ? (
            <ClientDetailCsiDrawerSkeleton isOpen={isOpen} onOpenChange={onOpenChange} />
          ) : (
            <VendorDetailRatingForm
              survey={survey}
              vendorDisplayName={vendorDisplayName}
              isEditable
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

export default VendorDetailRatingDrawer;
