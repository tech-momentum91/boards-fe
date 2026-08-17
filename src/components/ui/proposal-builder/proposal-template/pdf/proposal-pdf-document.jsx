import React from 'react';
import { Document } from '@react-pdf/renderer';

import { defaultProposalContent } from '@/components/ui/proposal-builder/proposal-template/proposal-content';

import PdfPage1 from '@/components/ui/proposal-builder/proposal-template/pdf/pages/pdf-page-1';
import PdfPage2 from '@/components/ui/proposal-builder/proposal-template/pdf/pages/pdf-page-2';
import PdfPage3 from '@/components/ui/proposal-builder/proposal-template/pdf/pages/pdf-page-3';
import PdfPage4 from '@/components/ui/proposal-builder/proposal-template/pdf/pages/pdf-page-4';
import PdfPage5 from '@/components/ui/proposal-builder/proposal-template/pdf/pages/pdf-page-5';
import PdfPage6 from '@/components/ui/proposal-builder/proposal-template/pdf/pages/pdf-page-6';
import PdfPage7 from '@/components/ui/proposal-builder/proposal-template/pdf/pages/pdf-page-7';
import PdfPage8 from '@/components/ui/proposal-builder/proposal-template/pdf/pages/pdf-page-8';
import PdfPage9 from '@/components/ui/proposal-builder/proposal-template/pdf/pages/pdf-page-9';
import { registerProposalPdfFonts } from '@/components/ui/proposal-builder/proposal-template/pdf/register-pdf-fonts';

registerProposalPdfFonts();

const PDF_PAGE_COMPONENTS = {
  page1: PdfPage1,
  page2: PdfPage2,
  page3: PdfPage3,
  page4: PdfPage4,
  page5: PdfPage5,
  page6: PdfPage6,
  page7: PdfPage7,
  page8: PdfPage8,
  page9: PdfPage9,
};

/**
 * Full proposal PDF document — all 9 template pages rendered via @react-pdf/renderer.
 */
export default function ProposalPdfDocument({
  content = defaultProposalContent,
  contentByInstanceId = null,
  pageInstances = null,
  primaryColor,
  clientAiTheme: _clientAiTheme = false,
  title = 'Proposal',
  visiblePages = null,
  origin,
}) {
  const isInstanceMode = Array.isArray(pageInstances);
  const pageNumbers = visiblePages ?? [1, 2, 3, 4, 5, 6, 7, 8, 9];
  // Hero tint is baked into hero images during prepareTemplateContentForPdf.
  const heroTintColor = null;

  return (
    <Document title={title} author='DevX'>
      {(isInstanceMode ? (pageInstances ?? []) : pageNumbers).map((page) => {
        if (isInstanceMode) {
          const pageId = page?.id;
          const templateKey = page?.templateKey;
          const PageComponent = templateKey ? PDF_PAGE_COMPONENTS[templateKey] : null;
          if (!PageComponent || !pageId) return null;
          return (
            <PageComponent
              key={pageId}
              content={contentByInstanceId?.[pageId]}
              primaryColor={primaryColor}
              heroTintColor={heroTintColor}
              origin={origin}
            />
          );
        }

        const pageNum = page;
        const pageKey = `page${pageNum}`;
        const PageComponent = PDF_PAGE_COMPONENTS[pageKey];
        if (!PageComponent) return null;
        return (
          <PageComponent
            key={pageKey}
            content={content[pageKey]}
            primaryColor={primaryColor}
            heroTintColor={heroTintColor}
            origin={origin}
          />
        );
      })}
    </Document>
  );
}
