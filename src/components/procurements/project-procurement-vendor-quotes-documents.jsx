import React, { memo } from 'react';
import { RiFilePdf2Line } from 'react-icons/ri';

const ProjectProcurementVendorQuotesDocuments = memo(({ documents = [] }) => {
  if (documents.length === 0) return null;

  return (
    <div className='border-t border-stroke-soft-200 px-8 py-5'>
      <h4 className='mb-3 text-label-sm font-semibold text-text-sub-500'>Documents</h4>
      <div className='flex flex-col'>
        {documents.map((document) => (
          <div
            key={document.id}
            className='flex items-center gap-3 border-b border-stroke-soft-200 py-3 last:border-b-0'
          >
            <span className='inline-flex size-8 shrink-0 items-center justify-center rounded bg-[#fee4e2]'>
              <RiFilePdf2Line className='size-4 text-[#d92d20]' aria-hidden />
            </span>
            <span className='min-w-0 flex-1 truncate text-paragraph-sm text-text-sub-500'>
              {document.name}
            </span>
            <span className='shrink-0 text-paragraph-sm text-text-soft-400'>
              {document.sizeLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

ProjectProcurementVendorQuotesDocuments.displayName = 'ProjectProcurementVendorQuotesDocuments';

export default ProjectProcurementVendorQuotesDocuments;
