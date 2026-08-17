import React from 'react';
import AgreementsToolbar from '@/components/agreements/agreements-toolbar';
import AgreementsTable from '@/components/agreements/agreements-table';

/**
 * Active agreements list (client mode). Tabs are passed as slotBeforeToolbar from AgreementsListPage.
 */
const ClientAgreementsList = ({ slotBeforeToolbar, toolbarProps, tableProps }) => {
  const { ref: tableRefProp, ...tableRest } = tableProps || {};
  return (
    <div className='flex-1 min-h-0 flex flex-col gap-5 w-full h-full'>
      <AgreementsToolbar {...toolbarProps} slotBeforeToolbar={slotBeforeToolbar} />
      <AgreementsTable ref={tableRefProp} {...tableRest} />
    </div>
  );
};

export default ClientAgreementsList;
