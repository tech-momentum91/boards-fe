import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  fetchCsiSurveysThunk,
  fetchCsiSummaryThunk,
  selectCsiSurveys,
  selectSelectedCsiSurvey,
  setSelectedCsiSurvey,
  selectClientDetail,
} from '@/redux/clientDetailSlice';
import ClientDetailCsiSummaryCards from '@/components/clients-management/client-detail-csi/client-detail-csi-summary-cards';
import ClientDetailCsiFilters from '@/components/clients-management/client-detail-csi/client-detail-csi-filters';
import ClientDetailCsiTable from '@/components/clients-management/client-detail-csi/client-detail-csi-table';
import ClientDetailCsiDrawer from '@/components/clients-management/client-detail-csi/client-detail-csi-drawer';
import { CSI_QUARTER_OPTIONS } from '@/constants/csi-constants';

const ClientDetailCsiTab = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const clientName = client?.name || client?.customer_name || id;
  const csiSurveys = useSelector(selectCsiSurveys);
  const selectedCsiSurvey = useSelector(selectSelectedCsiSurvey);
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const getQuarterLabel = (value) => {
    return CSI_QUARTER_OPTIONS.find((q) => q.value === value)?.label || null;
  };
  const quarterParameter = quarterFilter !== 'all' ? getQuarterLabel(quarterFilter) : null;
  const yearParameter = yearFilter && yearFilter !== 'all' ? yearFilter : null;

  // Backend filter: pass quarter/year to API and refetch when filters or client change
  useEffect(() => {
    if (!clientName) return;
    dispatch(fetchCsiSurveysThunk({ clientName, quarter: quarterParameter, year: yearParameter }));
  }, [clientName, quarterParameter, yearParameter, dispatch]);
  // CSI summary from backend (completed-only, same quarter/year filters)
  useEffect(() => {
    if (!clientName) return;
    dispatch(fetchCsiSummaryThunk({ clientName, quarter: quarterParameter, year: yearParameter }));
  }, [clientName, quarterParameter, yearParameter, dispatch]);

  // Backend returns grouped: [{ center_name, surveys }, ...], already filtered by month/year
  const groupedSurveys = csiSurveys.data || [];

  const filteredSurveysFlat = useMemo(
    () => groupedSurveys.flatMap((g) => g.surveys || []),
    [groupedSurveys],
  );

  const handleRowClick = (survey) => {
    dispatch(setSelectedCsiSurvey(survey.name));
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = (open) => {
    setIsDrawerOpen(open);
    if (!open) {
      // Clear selected survey when drawer closes
      dispatch(setSelectedCsiSurvey(null));
    }
  };

  const handleNavigate = (surveyName) => {
    dispatch(setSelectedCsiSurvey(surveyName));
  };

  if (csiSurveys.isLoading) {
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

  if (csiSurveys.error) {
    return (
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6 py-12'>
          <div className='flex flex-col items-center justify-center'>
            <p className='text-paragraph-sm text-error-base mb-2'>Error loading CSI surveys</p>
            <p className='text-paragraph-xs text-text-sub-500'>{csiSurveys.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0'>
        {/* Summary Cards - backend-driven (completed-only, respects quarter/year filters) */}
        <ClientDetailCsiSummaryCards />

        {/* Filters */}
        <ClientDetailCsiFilters
          quarterFilter={quarterFilter}
          yearFilter={yearFilter}
          onQuarterChange={setQuarterFilter}
          onYearChange={setYearFilter}
          onSendCsiForm={() => {
            // TODO: Implement send CSI form functionality
          }}
        />

        {/* Table - grouped by center from backend */}
        <ClientDetailCsiTable groupedSurveys={groupedSurveys} onRowClick={handleRowClick} />

        {/* Drawer */}
        <ClientDetailCsiDrawer
          isOpen={isDrawerOpen}
          onOpenChange={handleDrawerClose}
          surveyName={selectedCsiSurvey.surveyName}
          surveys={filteredSurveysFlat}
          onNavigate={handleNavigate}
          allowEdit={false}
        />
      </div>
    </div>
  );
};

export default ClientDetailCsiTab;
