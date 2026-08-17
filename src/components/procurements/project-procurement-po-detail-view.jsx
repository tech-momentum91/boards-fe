import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiFile3Line, RiInformationFill, RiListCheck3, RiTaskLine } from 'react-icons/ri';

import { fetchProjectProcurementPoDetail } from '@/api/projectProcurements';
import {
  PROJECT_PROCUREMENT_PO_DETAIL_DEFAULT_TAB,
  PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS,
  PROJECT_PROCUREMENT_PO_DETAIL_TABS,
} from '@/components/procurements/constants';
import ProjectProcurementPoDetailApprovalTab from '@/components/procurements/project-procurement-po-detail-approval-tab';
import ProjectProcurementPoDetailBasicDetailsTab from '@/components/procurements/project-procurement-po-detail-basic-details-tab';
import ProjectProcurementPoDetailHeader from '@/components/procurements/project-procurement-po-detail-header';
import ProjectProcurementPoDetailLineItemsTab from '@/components/procurements/project-procurement-po-detail-line-items-tab';
import ProjectProcurementPoDetailPdfPanel from '@/components/procurements/project-procurement-po-detail-pdf-panel';
import ProjectProcurementPoDetailScopeCommercialTab from '@/components/procurements/project-procurement-po-detail-scope-commercial-tab';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { showErrorToast } from '@/utils/error-utils';

const PO_DETAIL_TAB_ICON_MAP = {
  [PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.BASIC_DETAILS]: RiInformationFill,
  [PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.LINE_ITEMS]: RiListCheck3,
  [PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.SCOPE_COMMERCIAL]: RiFile3Line,
  [PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.APPROVAL]: RiTaskLine,
};

function buildPoDetailFromListRow(poRow) {
  const poNumber = poRow?.po_number ?? poRow?.id ?? '—';
  const poValue = Number(poRow?.po_value);
  const paidAmt = Number(poRow?.paid_amt);
  const pendingAmt = Number(poRow?.pending_amt);

  return {
    vendorName: poRow?.vendor_name ?? '—',
    poNumber,
    headerStatus: poRow?.status ?? 'Draft',
    displayAmount: Number.isFinite(poValue) && poValue > 0 ? formatProcurementAmount(poValue) : '—',
    itemCount: 0,
    category: poRow?.category ?? '',
    basicDetails: {
      package: poRow?.package ?? '—',
      category: poRow?.category ?? '—',
      po_date: poRow?.po_date ?? '',
      po_type: poRow?.type ?? '—',
      gst_type: '—',
      payment_template: '—',
      paid_amt: Number.isFinite(paidAmt) ? formatProcurementAmount(paidAmt) : '—',
      pending_amt: Number.isFinite(pendingAmt) ? formatProcurementAmount(pendingAmt) : '—',
      expected_delivery: '',
    },
    pdf: {
      filename: `${poNumber === '—' ? 'PO' : poNumber}.pdf`,
      pages: 1,
      zoom: 100,
    },
    approvalStepsPending: [],
    approvalStepsApproved: [],
    approvalStepsCompleted: [],
    lineItems: { rows: [], totals: { value: '—', disc_value: '—' } },
    scopeCommercialTerms: [],
  };
}

function buildPoDetailFromApi(apiDetail, listRow) {
  const fallback = buildPoDetailFromListRow(listRow);
  if (!apiDetail || typeof apiDetail !== 'object') return fallback;

  return {
    vendorName: apiDetail.vendor_name ?? fallback.vendorName,
    poNumber: apiDetail.po_number ?? fallback.poNumber,
    headerStatus: apiDetail.header_status ?? apiDetail.status ?? fallback.headerStatus,
    displayAmount: apiDetail.display_amount ?? fallback.displayAmount,
    itemCount: Number(apiDetail.item_count) || fallback.itemCount,
    category: apiDetail.detail_category ?? apiDetail.category ?? fallback.category,
    basicDetails: {
      package: apiDetail.basic_details?.package ?? fallback.basicDetails.package,
      category: apiDetail.basic_details?.category ?? fallback.basicDetails.category,
      po_date: apiDetail.basic_details?.po_date ?? fallback.basicDetails.po_date,
      po_type: apiDetail.basic_details?.po_type ?? fallback.basicDetails.po_type,
      gst_type: apiDetail.basic_details?.gst_type ?? fallback.basicDetails.gst_type,
      payment_template:
        apiDetail.basic_details?.payment_template ?? fallback.basicDetails.payment_template,
      paid_amt: apiDetail.basic_details?.paid_amt ?? fallback.basicDetails.paid_amt,
      pending_amt: apiDetail.basic_details?.pending_amt ?? fallback.basicDetails.pending_amt,
      expected_delivery:
        apiDetail.basic_details?.expected_delivery ?? fallback.basicDetails.expected_delivery,
    },
    pdf: {
      filename: apiDetail.pdf?.filename ?? fallback.pdf.filename,
      pages: Number(apiDetail.pdf?.pages) || fallback.pdf.pages,
      zoom: Number(apiDetail.pdf?.zoom) || fallback.pdf.zoom,
    },
    approvalStepsPending: Array.isArray(apiDetail.approval_steps_pending)
      ? apiDetail.approval_steps_pending
      : fallback.approvalStepsPending,
    approvalStepsApproved: Array.isArray(apiDetail.approval_steps_approved)
      ? apiDetail.approval_steps_approved
      : fallback.approvalStepsApproved,
    approvalStepsCompleted: Array.isArray(apiDetail.approval_steps_completed)
      ? apiDetail.approval_steps_completed
      : fallback.approvalStepsCompleted,
    lineItems: {
      totals: {
        value: apiDetail.line_items?.totals?.value ?? fallback.lineItems.totals.value,
        disc_value:
          apiDetail.line_items?.totals?.disc_value ?? fallback.lineItems.totals.disc_value,
      },
      rows: Array.isArray(apiDetail.line_items?.rows)
        ? apiDetail.line_items.rows
        : fallback.lineItems.rows,
    },
    scopeCommercialTerms: Array.isArray(apiDetail.scope_commercial_terms)
      ? apiDetail.scope_commercial_terms
      : fallback.scopeCommercialTerms,
  };
}

export default function ProjectProcurementPoDetailView({ po, onClose }) {
  const poId = po?.id ?? po?.po_number ?? '';
  const [apiDetail, setApiDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(Boolean(poId));
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState(PROJECT_PROCUREMENT_PO_DETAIL_DEFAULT_TAB);
  const [approvalState, setApprovalState] = useState('pending');

  useEffect(() => {
    if (!poId) {
      setApiDetail(null);
      setIsLoadingDetail(false);
      setLoadError(null);
      return;
    }

    const signal = { cancelled: false };
    setIsLoadingDetail(true);
    setLoadError(null);

    fetchProjectProcurementPoDetail(poId)
      .then((detail) => {
        if (signal.cancelled) return;
        setApiDetail(detail);
      })
      .catch((error) => {
        if (signal.cancelled) return;
        setApiDetail(null);
        setLoadError(error);
        showErrorToast(error, { defaultMessage: 'Failed to load purchase order details.' });
      })
      .finally(() => {
        if (signal.cancelled) return;
        setIsLoadingDetail(false);
      });

    return () => {
      signal.cancelled = true;
    };
  }, [poId]);

  const detail = useMemo(() => buildPoDetailFromApi(apiDetail, po), [apiDetail, po]);

  let approvalSteps = detail.approvalStepsPending;
  if (approvalState === 'completed') {
    approvalSteps = detail.approvalStepsCompleted;
  } else if (approvalState === 'partial') {
    approvalSteps = detail.approvalStepsApproved;
  }

  const handleApproveCurrent = useCallback(() => {
    setApprovalState((current) => {
      if (current === 'pending') return 'partial';
      if (current === 'partial') return 'completed';
      return current;
    });
  }, []);

  const handleRejectCurrent = useCallback(() => {
    setApprovalState('pending');
  }, []);

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-white-0'>
      <ProjectProcurementPoDetailHeader
        vendorName={detail.vendorName}
        headerStatus={detail.headerStatus}
        poNumber={detail.poNumber}
        displayAmount={detail.displayAmount}
        itemCount={detail.itemCount}
        category={detail.category}
        onClose={onClose}
      />

      {loadError && !isLoadingDetail && !apiDetail ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center'>
          <p className='text-label-md text-text-strong-950'>Failed to load purchase order</p>
          <p className='text-paragraph-sm text-text-sub-500'>
            Check your permissions or try opening the PO again.
          </p>
        </div>
      ) : (
        <div className='flex min-h-0 flex-1 overflow-hidden'>
          <div className='flex h-full min-w-0 w-1/2 flex-col border-r border-stroke-soft-200'>
            <TabMenuHorizontal.Root
              value={activeTab}
              onValueChange={setActiveTab}
              className='flex min-h-0 flex-1 flex-col'
            >
              <TabMenuHorizontal.List
                wrapperClassName='w-full shrink-0'
                className='h-auto min-h-0 gap-6 border-t-0 border-b border-stroke-soft-200 px-8 py-3.5'
              >
                {PROJECT_PROCUREMENT_PO_DETAIL_TABS.map((tab) => {
                  const Icon = PO_DETAIL_TAB_ICON_MAP[tab.id] ?? RiInformationFill;
                  return (
                    <TabMenuHorizontal.Trigger
                      key={tab.id}
                      value={tab.id}
                      className='h-auto gap-1.5 py-0 text-label-sm tracking-[-0.084px] data-[state=active]:text-text-main-900'
                    >
                      <TabMenuHorizontal.Icon as={Icon} className='size-5' />
                      {tab.label}
                    </TabMenuHorizontal.Trigger>
                  );
                })}
              </TabMenuHorizontal.List>

              <div className='min-h-0 flex-1 overflow-y-auto'>
                {isLoadingDetail && !apiDetail ? (
                  <div className='flex min-h-[240px] items-center justify-center px-6'>
                    <p className='text-paragraph-sm text-text-soft-400'>Loading purchase order…</p>
                  </div>
                ) : (
                  <>
                    <TabMenuHorizontal.Content
                      value={PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.BASIC_DETAILS}
                      className='outline-none'
                    >
                      <div className='px-6 py-5'>
                        <ProjectProcurementPoDetailBasicDetailsTab details={detail.basicDetails} />
                      </div>
                    </TabMenuHorizontal.Content>

                    <TabMenuHorizontal.Content
                      value={PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.LINE_ITEMS}
                      className='outline-none'
                    >
                      <ProjectProcurementPoDetailLineItemsTab lineItems={detail.lineItems} />
                    </TabMenuHorizontal.Content>

                    <TabMenuHorizontal.Content
                      value={PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.SCOPE_COMMERCIAL}
                      className='outline-none'
                    >
                      <ProjectProcurementPoDetailScopeCommercialTab
                        terms={detail.scopeCommercialTerms}
                      />
                    </TabMenuHorizontal.Content>

                    <TabMenuHorizontal.Content
                      value={PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.APPROVAL}
                      className='outline-none'
                    >
                      <ProjectProcurementPoDetailApprovalTab
                        steps={approvalSteps}
                        onApproveCurrent={handleApproveCurrent}
                        onRejectCurrent={handleRejectCurrent}
                      />
                    </TabMenuHorizontal.Content>
                  </>
                )}
              </div>
            </TabMenuHorizontal.Root>
          </div>

          <div className='flex h-full min-w-0 w-1/2 flex-col'>
            <ProjectProcurementPoDetailPdfPanel
              filename={detail.pdf.filename}
              pages={detail.pdf.pages}
              zoom={detail.pdf.zoom}
            />
          </div>
        </div>
      )}
    </div>
  );
}
