import React from 'react';
import { RiImageLine } from 'react-icons/ri';

import { stockImagesToAttachments } from '@/components/stocks/shared/stock-images';
import AttachmentList from '@/components/ui/attachment-list';

const StockImagesDisplay = ({
  stockImages = [],
  title = 'Stock photos',
  emptyMessage = 'No stock photos attached.',
  icon: Icon = RiImageLine,
}) => {
  const attachments = stockImagesToAttachments(stockImages);

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
        <Icon className='size-5 shrink-0 text-text-sub-600' aria-hidden />
        {title}
      </div>
      {attachments.length > 0 ? (
        <AttachmentList
          attachments={attachments}
          emptyStateMessage={emptyMessage}
          emptyStateDescription=''
        />
      ) : (
        <div className='rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-5 py-4'>
          <p className='text-paragraph-sm text-text-sub-600'>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
};

export default StockImagesDisplay;
