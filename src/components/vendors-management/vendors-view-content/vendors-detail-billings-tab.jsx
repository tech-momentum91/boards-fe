import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVendorBillsThunk, selectVendorBillsListview } from '@/redux/vendorSlice';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useDebounce } from '@/hooks/use-debounce';
import { fetchOpexComments, addOpexComment, updateOpexField } from '@/redux/opexSlice';
import { OpexViewDrawer } from '@/components/opex';
import { showErrorToast } from '@/utils/error-utils';
import VendorBillToolbar from '../vendor-bill-toolbar';
import VendorsBillingTable from '../vendors-billing-table';

const VendorBills = ({ vendorId }) => {
  const dispatch = useDispatch();
  const vendorBills = useSelector(selectVendorBillsListview);
  const tableRef = useRef(null);
  const isFetchingRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const [selectedOpexId, setSelectedOpexId] = useState(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);

  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'vendors-bills-table',
    'compact',
  );

  useEffect(() => {
    if (!vendorId) return;
    dispatch(
      fetchVendorBillsThunk({ vendorId, page: 1, limit_page_length: 20, keyword: debouncedSearch }),
    );
  }, [dispatch, vendorId, debouncedSearch]);

  const handleLoadMore = useCallback(() => {
    if (
      isFetchingRef.current ||
      vendorBills.isLoading ||
      vendorBills.isLoadingMore ||
      !vendorBills.hasMore ||
      vendorBills.currentPage >= vendorBills.totalPages
    )
      return;

    isFetchingRef.current = true;
    dispatch(
      fetchVendorBillsThunk({
        vendorId,
        page: vendorBills.currentPage + 1,
        limit_page_length: 20,
        keyword: debouncedSearch,
      }),
    ).finally(() => {
      isFetchingRef.current = false;
    });
  }, [dispatch, vendorId, vendorBills, debouncedSearch]);

  const handleRowSelect = useCallback((row) => {
    setSelectedOpexId(row.name);
    setIsViewDrawerOpen(true);
  }, []);

  const handleViewDrawerClose = useCallback(() => {
    setIsViewDrawerOpen(false);
    setSelectedOpexId(null);
  }, []);

  const handleFieldUpdate = useCallback(
    async (opexId, fieldname, value) => {
      try {
        await dispatch(updateOpexField({ name: opexId, fieldname, value })).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update field.' });
      }
    },
    [dispatch],
  );

  const handleAddComment = useCallback(
    async (opexId, content, attachments = [], _visibleToClient = false, parentCommentId = null) => {
      try {
        await dispatch(addOpexComment({ opexId, content, attachments, parentCommentId })).unwrap();
        await dispatch(fetchOpexComments(opexId));
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to add comment.' });
      }
    },
    [dispatch],
  );

  const handleRefreshComments = useCallback(
    (opexId) => {
      if (opexId) dispatch(fetchOpexComments(opexId));
    },
    [dispatch],
  );

  return (
    <div className='flex flex-col gap-6 p-6 h-full'>
      <VendorBillToolbar
        tableRef={tableRef}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        tableVariant={tableVariant}
        onTableVariantToggle={toggleTableVariant}
      />
      <VendorsBillingTable
        ref={tableRef}
        rows={vendorBills.data}
        isLoading={vendorBills.isLoading}
        error={vendorBills.error}
        tableVariant={tableVariant}
        enableScrollPagination={true}
        onLoadMore={handleLoadMore}
        hasMore={vendorBills.hasMore}
        isLoadingMore={vendorBills.isLoadingMore}
        onRowSelect={handleRowSelect}
      />

      {isViewDrawerOpen && (
        <OpexViewDrawer
          isOpen={isViewDrawerOpen}
          onClose={handleViewDrawerClose}
          opexId={selectedOpexId}
          onFieldUpdate={handleFieldUpdate}
          onAddComment={handleAddComment}
          onRefreshComments={handleRefreshComments}
          permissions={{ canEdit: false }}
          hasPrevious={false}
          hasNext={false}
        />
      )}
    </div>
  );
};

export default VendorBills;
