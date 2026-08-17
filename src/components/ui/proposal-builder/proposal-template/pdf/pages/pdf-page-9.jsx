import React from 'react';

import PdfCoverPage from '@/components/ui/proposal-builder/proposal-template/pdf/pdf-cover-page';

export default function PdfPage9(props) {
  return <PdfCoverPage {...props} pagePrefix='page9' galleryRadius={32} />;
}
