import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  fetchVendorRatingsThunk,
  fetchVendorRatingSummaryThunk,
  fetchVendorSurveyServicesThunk,
  selectVendorRatings,
  selectSelectedVendorRating,
  setSelectedVendorRating,
  clearSelectedVendorRating,
  selectVendorDetail,
} from '@/redux/vendorSlice';
import VendorDetailRatingSummaryCards from '@/components/vendors-management/vendor-detail-rating/vendor-detail-rating-summary-cards';
import VendorDetailRatingFilters from '@/components/vendors-management/vendor-detail-rating/vendor-detail-rating-filters';
import VendorDetailRatingTable from '@/components/vendors-management/vendor-detail-rating/vendor-detail-rating-table';
import VendorDetailRatingDrawer from '@/components/vendors-management/vendor-detail-rating/vendor-detail-rating-drawer';
import { CSI_QUARTER_OPTIONS } from '@/constants/csi-constants';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';

const VendorDetailRatingTab = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const vendorDetail = useSelector(selectVendorDetail);
  const vendor = vendorDetail.data;
  const vendorId = vendor?.name || id;
  const vendorDisplayName = vendor?.vendor_name ?? vendor?.supplier_name ?? '';
  const vendorRatings = useSelector(selectVendorRatings);
  const selectedVendorRating = useSelector(selectSelectedVendorRating);
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isFetchingMoreRef = useRef(false);

  const getQuarterLabel = (value) => {
    return CSI_QUARTER_OPTIONS.find((q) => q.value === value)?.label || null;
  };
  const quarterParameter = quarterFilter !== 'all' ? getQuarterLabel(quarterFilter) : null;
  const yearParameter = yearFilter && yearFilter !== 'all' ? yearFilter : null;

  useEffect(() => {
    dispatch(fetchVendorSurveyServicesThunk());
  }, [dispatch]);

  useEffect(() => {
    if (!vendorId) return;
    dispatch(
      fetchVendorRatingsThunk({
        vendorId,
        quarter: quarterParameter,
        year: yearParameter,
      }),
    );
  }, [vendorId, quarterParameter, yearParameter, dispatch]);

  useEffect(() => {
    if (!vendorId) return;
    dispatch(
      fetchVendorRatingSummaryThunk({
        vendorId,
        quarter: quarterParameter,
        year: yearParameter,
      }),
    );
  }, [vendorId, quarterParameter, yearParameter, dispatch]);

  const groupedSurveys = vendorRatings.data || [];
  const isInitialLoading = vendorRatings.isLoading && groupedSurveys.length === 0;

  const handleLoadMore = useCallback(() => {
    if (
      !vendorId ||
      isFetchingMoreRef.current ||
      vendorRatings.isLoading ||
      vendorRatings.isLoadingMore ||
      !vendorRatings.hasMore
    ) {
      return;
    }

    isFetchingMoreRef.current = true;
    dispatch(
      fetchVendorRatingsThunk({
        vendorId,
        quarter: quarterParameter,
        year: yearParameter,
        page: vendorRatings.currentPage + 1,
        pageSize: vendorRatings.pageSize,
        append: true,
      }),
    ).finally(() => {
      isFetchingMoreRef.current = false;
    });
  }, [
    dispatch,
    vendorId,
    quarterParameter,
    yearParameter,
    vendorRatings.currentPage,
    vendorRatings.pageSize,
    vendorRatings.hasMore,
    vendorRatings.isLoading,
    vendorRatings.isLoadingMore,
  ]);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore: vendorRatings.hasMore,
    isLoading: vendorRatings.isLoading || vendorRatings.isLoadingMore,
    threshold: 200,
    enabled: Boolean(vendorId) && groupedSurveys.length > 0,
  });

  const filteredSurveysFlat = useMemo(
    () => groupedSurveys.flatMap((g) => g.surveys || []),
    [groupedSurveys],
  );

  const handleRowClick = (survey) => {
    dispatch(setSelectedVendorRating(survey));
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = (open) => {
    setIsDrawerOpen(open);
    if (!open) {
      dispatch(clearSelectedVendorRating());
    }
  };

  const handleNavigate = (surveyName) => {
    const survey = filteredSurveysFlat.find((s) => s.name === surveyName);
    dispatch(setSelectedVendorRating(survey ?? surveyName));
  };

  const handleRatingSubmitted = () => {
    if (!vendorId) return;
    const filters = {
      vendorId,
      quarter: quarterParameter,
      year: yearParameter,
      page: 1,
      append: false,
    };
    dispatch(fetchVendorRatingsThunk(filters));
    dispatch(fetchVendorRatingSummaryThunk(filters));
  };

  if (isInitialLoading) {
    return (
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0'>
          <div className='flex items-center justify-center h-full'>
            <div className='w-8 h-8 border-4 border-primary-base border-t-transparent rounded-full animate-spin' />
          </div>
        </div>
      </div>
    );
  }

  if (vendorRatings.error) {
    return (
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6 py-12'>
          <div className='flex flex-col items-center justify-center'>
            <p className='text-paragraph-sm text-error-base mb-2'>Error loading vendor ratings</p>
            <p className='text-paragraph-xs text-text-sub-500'>{vendorRatings.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0'>
        <VendorDetailRatingSummaryCards />

        <VendorDetailRatingFilters
          quarterFilter={quarterFilter}
          yearFilter={yearFilter}
          onQuarterChange={setQuarterFilter}
          onYearChange={setYearFilter}
        />

        <VendorDetailRatingTable groupedSurveys={groupedSurveys} onRowClick={handleRowClick} />

        {vendorRatings.hasMore && <div ref={sentinelRef} className='h-1 w-full' />}

        {vendorRatings.isLoadingMore && (
          <div className='flex items-center justify-center py-4'>
            <div className='w-6 h-6 border-2 border-primary-base border-t-transparent rounded-full animate-spin' />
          </div>
        )}

        <VendorDetailRatingDrawer
          isOpen={isDrawerOpen}
          onOpenChange={handleDrawerClose}
          surveyName={selectedVendorRating.surveyName}
          surveys={filteredSurveysFlat}
          vendorDisplayName={vendorDisplayName}
          onNavigate={handleNavigate}
          onSubmitted={handleRatingSubmitted}
        />
      </div>
    </div>
  );
};

export default VendorDetailRatingTab;
