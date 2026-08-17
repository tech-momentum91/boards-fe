import React from 'react';

import PdfCoverPage from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-cover-page';

export default function PdfPage1(props) {
  return <PdfCoverPage {...props} pagePrefix='page1' galleryRadius={28} />;
}
