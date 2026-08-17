import './pdf-runtime-setup';

import { pdf } from '@react-pdf/renderer';
import React from 'react';

import ProposalPdfDocument from '@/components/ui/proposal-builder/proposal-template/pdf/proposal-pdf-document';
import { prepareProposalPdfExportContent } from '@/components/ui/proposal-builder/proposal-template/pdf/prepare-proposal-pdf-export-content';
import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

/**
 * Generate proposal PDF blob client-side via @react-pdf/renderer.
 * Preserves clickable links (e.g. video cards on page 8) and vector text.
 */
export async function exportProposalTemplatePdfBlob({
  content = defaultProposalContent,
  contentByInstanceId = null,
  pageInstances = null,
  primaryColor,
  clientAiTheme = false,
  title = 'Proposal',
  visiblePages = null,
  origin = typeof window !== 'undefined' ? window.location.origin : '',
  layoutInventory = [],
  embeddedPage6LayoutDetail = null,
  page6LayoutDetailsByKey = null,
  inventory = null,
  skipLiveLayoutFetch = false,
} = {}) {
  const pageNumbers = visiblePages ?? [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const pdfPayload = await prepareProposalPdfExportContent({
    content,
    contentByInstanceId,
    pageInstances,
    primaryColor,
    clientAiTheme,
    visiblePages: pageNumbers,
    origin,
    layoutInventory,
    embeddedPage6LayoutDetail,
    page6LayoutDetailsByKey,
    inventory,
    skipLiveLayoutFetch,
  });

  const instance = pdf(
    <ProposalPdfDocument
      content={pdfPayload?.content}
      contentByInstanceId={pdfPayload?.contentByInstanceId}
      pageInstances={pageInstances}
      primaryColor={primaryColor}
      clientAiTheme={clientAiTheme}
      title={title}
      visiblePages={visiblePages}
      origin={origin}
    />,
  );

  return instance.toBlob();
}

/**
 * Trigger browser download of the proposal PDF.
 */
export async function downloadProposalTemplatePdf(options = {}) {
  const filename = options.filename || 'proposal.pdf';
  const blob = await exportProposalTemplatePdfBlob(options);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return blob;
}
