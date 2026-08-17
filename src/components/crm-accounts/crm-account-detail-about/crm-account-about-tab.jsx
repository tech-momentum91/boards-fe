import React, { useState } from 'react';
import CrmAccountAboutSidebar from './crm-account-about-sidebar';
import CrmAccountAboutInfo from './crm-account-about-info';
import CrmAccountAboutAddresses from './crm-account-about-addresses';
import CrmAccountAboutSocialLinks from './crm-account-about-social-links';
import CrmAccountAboutStatutory from './crm-account-about-statutory';
import CrmAccountAboutBank from './crm-account-about-bank';
import AccountResearchPanels from '@/components/shared/account-research-panels';
import { ACCOUNT_RESEARCH_SIDEBAR_KEYS } from '@/utils/scraped-research';

const CrmAccountAboutTab = ({
  account = {},
  onFieldChange,
  onAddressUpdate,
  onAddressModalSave,
  onAddBank,
  onUpdateBank,
  onDeleteBank,
}) => {
  const [activeSidebarItem, setActiveSidebarItem] = useState('basic');

  return (
    <div className='flex flex-1 overflow-hidden'>
      {/* Left sidebar */}
      <div className='h-full shrink-0'>
        <CrmAccountAboutSidebar
          activeItem={activeSidebarItem}
          onItemChange={setActiveSidebarItem}
          account={account}
        />
      </div>

      {/* Content Area */}
      <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6'>
        {activeSidebarItem === 'basic' && (
          <>
            <CrmAccountAboutInfo
              account={account}
              onFieldChange={onFieldChange}
              onAddressUpdate={onAddressUpdate}
            />
            <CrmAccountAboutAddresses
              account={account}
              onAddressUpdate={onAddressUpdate}
              onAddressModalSave={onAddressModalSave}
            />
            <CrmAccountAboutSocialLinks account={account} onFieldChange={onFieldChange} />
          </>
        )}
        {activeSidebarItem === 'statutory' && (
          <CrmAccountAboutStatutory account={account} onFieldChange={onFieldChange} />
        )}
        {activeSidebarItem === 'bank' && (
          <CrmAccountAboutBank
            account={account}
            banks={account?.banks || []}
            onAddBank={onAddBank}
            onUpdateBank={onUpdateBank}
            onDeleteBank={onDeleteBank}
          />
        )}
        {ACCOUNT_RESEARCH_SIDEBAR_KEYS.includes(activeSidebarItem) && (
          <AccountResearchPanels activeSidebarItem={activeSidebarItem} account={account} />
        )}
      </div>
    </div>
  );
};

export default CrmAccountAboutTab;
