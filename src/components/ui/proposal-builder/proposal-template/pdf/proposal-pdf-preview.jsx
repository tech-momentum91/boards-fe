import './pdf-runtime-setup';

import React, { memo, useEffect, useMemo, useState } from 'react';
import { PDFViewer } from '@react-pdf/renderer';

import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

import { prepareProposalPdfExportContent } from '@/components/ui/proposal-builder/proposal-template/pdf/prepare-proposal-pdf-export-content';
import ProposalPdfDocument from '@/components/ui/proposal-builder/proposal-template/pdf/proposal-pdf-document';

function arePreviewPropsEqual(prev, next) {
  return (
    prev.content === next.content &&
    prev.primaryColor === next.primaryColor &&
    prev.clientAiTheme === next.clientAiTheme &&
    prev.title === next.title &&
    prev.visiblePages === next.visiblePages &&
    prev.layoutInventory === next.layoutInventory &&
    prev.pageInstances === next.pageInstances &&
    prev.contentByInstanceId === next.contentByInstanceId &&
    prev.inventory === next.inventory &&
    prev.className === next.className &&
    prev.showToolbar === next.showToolbar
  );
}

/**
 * In-browser react-pdf preview — same Document tree as PDF export.
 */
function ProposalPdfPreview({
  content = defaultProposalContent,
  contentByInstanceId = null,
  pageInstances = null,
  primaryColor,
  clientAiTheme = false,
  title,
  visiblePages = null,
  layoutInventory = [],
  inventory = [],
  className,
  showToolbar = true,
}) {
  const [pdfPayload, setPdfPayload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const exportOptions = useMemo(
    () => ({
      content,
      contentByInstanceId,
      pageInstances,
      primaryColor,
      clientAiTheme,
      visiblePages,
      layoutInventory,
      inventory,
      origin,
    }),
    [
      content,
      contentByInstanceId,
      pageInstances,
      primaryColor,
      clientAiTheme,
      visiblePages,
      layoutInventory,
      inventory,
      origin,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setPdfPayload(null);

    prepareProposalPdfExportContent(exportOptions)
      .then((prepared) => {
        if (!cancelled) setPdfPayload(prepared);
      })
      .catch((error_) => {
        if (!cancelled) setError(error_?.message || 'PDF preview failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [exportOptions]);

  if (loading) {
    return (
      <div className={className} data-proposal-pdf-preview>
        <div className='flex h-full items-center justify-center text-sm text-text-sub-600 bg-white'>
          Generating PDF preview…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} data-proposal-pdf-preview>
        <div className='flex h-full items-center justify-center px-6 text-center text-sm text-red-600'>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={className} data-proposal-pdf-preview style={{ width: '100%', height: '100%' }}>
      <PDFViewer width='100%' height='100%' showToolbar={showToolbar}>
        <ProposalPdfDocument
          content={pdfPayload?.content}
          contentByInstanceId={pdfPayload?.contentByInstanceId}
          pageInstances={pageInstances}
          primaryColor={primaryColor}
          clientAiTheme={clientAiTheme}
          title={title}
          visiblePages={visiblePages}
          origin={origin}
        />
      </PDFViewer>
    </div>
  );
}

export default memo(ProposalPdfPreview, arePreviewPropsEqual);
