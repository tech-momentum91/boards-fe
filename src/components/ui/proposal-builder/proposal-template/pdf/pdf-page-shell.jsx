import React from 'react';
import { Page, View } from '@react-pdf/renderer';

import {
  PDF_COLORS,
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
} from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-constants';
import { pdfStyles } from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-primitives';

export default function PdfPageShell({ children }) {
  return (
    <Page size={[PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]} style={pdfStyles.page} wrap={false}>
      <View
        style={{
          width: PDF_PAGE_WIDTH,
          height: PDF_PAGE_HEIGHT,
          position: 'relative',
          backgroundColor: PDF_COLORS.white,
        }}
      >
        {children}
      </View>
    </Page>
  );
}
