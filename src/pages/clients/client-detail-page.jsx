import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getStatusOptions } from '@/api/dynamic-status';
import ClientDetailPageSkeleton from '@/components/clients-management/client-detail-page-skeleton';
import ClientDetailHeader from '@/components/clients-management/client-detail-header';
import ClientDetailMetrics from '@/components/clients-management/client-detail-metrics';
import ClientDetailTabContent from '@/components/clients-management/client-detail-tab-content';
import {
  getClientDetailThunk,
  getClientStatisticsThunk,
  scrapeAndStoreClientDataThunk,
  selectClientDetail,
  selectLocalChanges,
  selectMetrics,
  clearLocalChanges,
  getFieldValue,
  resetClientDetail,
} from '@/redux/clientDetailSlice';
import { showSuccessToast, showErrorToast } from '@/utils/error-utils';
import PageLayout from '@/components/page-layout';
import { useWidgetVisibility } from '@/hooks/use-widget-visibility';
import WidgetVisibilityDropdown from '@/components/ui/widget-visibility-dropdown';

// Main Client Detail Page Component
const ClientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const localChanges = useSelector(selectLocalChanges);
  const metrics = useSelector(selectMetrics);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);
  const lastFetchedClientIdRef = useRef(null);
  const fetchPromiseRef = useRef(null);

  // Widget visibility management with localStorage persistence
  const { widgetVisibility, toggleWidget, hideAllWidgets, WIDGET_KEYS } =
    useWidgetVisibility('client-detail-widgets');
  const [isWidgetVisibilityOpen, setIsWidgetVisibilityOpen] = useState(false);
  const clientId = decodeURIComponent(id);
  const website = getFieldValue(client, localChanges, 'website');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opts = await getStatusOptions({ doctype: 'Customer', field: 'custom_status' });
        if (!cancelled) setDynamicStatusOptions(Array.isArray(opts) ? opts : []);
      } catch {
        if (!cancelled) setDynamicStatusOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const headerStatusColor = useMemo(() => {
    const statusVal = getFieldValue(client, localChanges, 'custom_status');
    const fromOptions = dynamicStatusOptions.find(
      (o) => String(o.value).toLowerCase() === String(statusVal || '').toLowerCase(),
    )?.color;
    return fromOptions ?? client?.custom_status_color ?? null;
  }, [client, localChanges, dynamicStatusOptions]);

  const handleBack = () => {
    navigate('/clients');
  };

  const handleCreateBooking = () => {
    // TODO: Implement create booking
    // console.log('Create booking');
  };

  const handleCreateTicket = () => {
    // Switch to tickets tab - the tab will check for create param in URL
    const currentSearch = new URLSearchParams(window.location.search);
    currentSearch.set('create', 'true');
    currentSearch.set('tab', 'tickets');
    navigate(`/clients/${encodeURIComponent(clientId)}?${currentSearch.toString()}`, {
      replace: true,
    });
  };

  const isWebsiteMissing = !website;

  const handleFetchData = async () => {
    if (clientId && !isFetchingData) {
      setIsFetchingData(true);
      try {
        // 1. Scrape and store client data
        const scrapeResult = await dispatch(scrapeAndStoreClientDataThunk({ clientId })).unwrap();

        await dispatch(getClientDetailThunk(clientId)).unwrap();

        showSuccessToast(scrapeResult?.message || 'Data fetched and updated successfully');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to fetch data' });
      } finally {
        setIsFetchingData(false);
      }
    }
  };

  // Reset local changes when client changes
  useEffect(() => {
    if (lastFetchedClientIdRef.current !== clientId) {
      dispatch(clearLocalChanges());
    }
  }, [clientId, dispatch]);

  // Memoize client matching check
  const clientMatches = useMemo(() => {
    if (!client || !clientId) return false;
    return String(client.name || client.id || '') === String(clientId || '');
  }, [client?.name, client?.id, clientId]);

  // Determine if we should show loading skeleton
  const isDataReady = useMemo(() => {
    return clientDetail.status === 'succeeded' && client && clientMatches;
  }, [clientDetail.status, client, clientMatches]);

  // Track first successful load per client to avoid skeleton during background refetches
  useEffect(() => {
    if (isDataReady) {
      setHasLoadedInitialData(true);
    }
  }, [isDataReady]);

  // Reset initial-load flag when switching clients
  useEffect(() => {
    // Reset hasLoadedInitialData when clientId changes (but don't set lastFetchedClientIdRef here)
    if (lastFetchedClientIdRef.current !== clientId && lastFetchedClientIdRef.current !== null) {
      setHasLoadedInitialData(false);
    }
  }, [clientId]);

  // Show loading skeleton only on the first load for a client
  const isLoading = useMemo(() => {
    return clientId && !hasLoadedInitialData && !isDataReady;
  }, [clientId, isDataReady, hasLoadedInitialData]);

  // Fetch client details when id changes
  useEffect(() => {
    // Early return if no id
    if (!clientId) {
      lastFetchedClientIdRef.current = null;
      fetchPromiseRef.current = null;
      return;
    }

    // Only fetch if client ID changed and we don't have an in-flight request
    const shouldFetch = lastFetchedClientIdRef.current !== id && !fetchPromiseRef.current;

    if (shouldFetch) {
      // Set refs IMMEDIATELY (synchronous) before any async operations
      const currentClientId = String(clientId);
      lastFetchedClientIdRef.current = currentClientId;

      // Create a promise that tracks the fetch
      const detailPromise = dispatch(getClientDetailThunk(currentClientId));

      // Track the promise
      fetchPromiseRef.current = detailPromise;

      // Clear the promise ref when complete
      Promise.resolve(detailPromise).finally(() => {
        // Only clear if this is still the current client (prevent race conditions)
        if (lastFetchedClientIdRef.current === currentClientId) {
          fetchPromiseRef.current = null;
        }
      });
    }

    // Cleanup: clear promise ref if component unmounts or clientId changes
    return () => {
      if (lastFetchedClientIdRef.current !== clientId) {
        fetchPromiseRef.current = null;
      }
    };
  }, [clientId, dispatch]);

  // Fetch client statistics when client is loaded
  useEffect(() => {
    if (client?.name) {
      dispatch(getClientStatisticsThunk(client.name));
    }
  }, [client?.name, dispatch]);

  // Reset state on component unmount
  useEffect(() => {
    return () => {
      dispatch(resetClientDetail());
    };
  }, [dispatch]);

  return (
    <PageLayout showDefaultHeader={false}>
      <div className='flex h-full flex-col'>
        {isLoading || !client ? (
          <ClientDetailPageSkeleton />
        ) : (
          <>
            {/* Header */}
            <ClientDetailHeader
              clientName={client?.customer_name || client?.custom_legal_name || '--'}
              status={getFieldValue(client, localChanges, 'custom_status')}
              statusColor={headerStatusColor}
              onBack={handleBack}
              isWebsiteMissing={isWebsiteMissing}
              onFetchData={handleFetchData}
              isFetchingData={isFetchingData}
              onCreateBooking={handleCreateBooking}
              onCreateTicket={handleCreateTicket}
              widgetVisibilityDropdown={
                <WidgetVisibilityDropdown
                  open={isWidgetVisibilityOpen}
                  onOpenChange={setIsWidgetVisibilityOpen}
                  widgetVisibility={widgetVisibility}
                  onToggleWidget={toggleWidget}
                  onHideAll={hideAllWidgets}
                  tooltipContent={<p>Widget Visibility</p>}
                  size='xsmall'
                />
              }
            />

            {/* Metrics */}
            {widgetVisibility[WIDGET_KEYS.STATS] && <ClientDetailMetrics metrics={metrics} />}

            {/* Tabs + Content (isolated - only this re-renders on tab change) */}
            <ClientDetailTabContent />
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default ClientDetailPage;
