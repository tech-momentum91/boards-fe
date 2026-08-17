import React, { useState } from 'react';
import CrmContactAboutSidebar from './crm-contact-about-sidebar';
import CrmContactAboutInfo from './crm-contact-about-info';
import CrmContactAboutSubscription from './crm-contact-about-subscription';
import CrmContactAboutSocialLinks from './crm-contact-about-social-links';

const CrmContactAboutTab = ({ contact = {}, onFieldChange, contactOptions = {} }) => {
  const [activeSidebarItem, setActiveSidebarItem] = useState('basic');

  return (
    <div className='flex flex-1 overflow-hidden'>
      {/* Left sidebar */}
      <div className='h-full shrink-0'>
        <CrmContactAboutSidebar
          activeItem={activeSidebarItem}
          onItemChange={setActiveSidebarItem}
        />
      </div>

      {/* Content Area */}
      <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6'>
        {activeSidebarItem === 'basic' && (
          <>
            <CrmContactAboutInfo
              contact={contact}
              onFieldChange={onFieldChange}
              contactOptions={contactOptions}
            />
            <CrmContactAboutSubscription
              contact={contact}
              onFieldChange={onFieldChange}
              contactOptions={contactOptions}
            />
            <CrmContactAboutSocialLinks contact={contact} onFieldChange={onFieldChange} />
          </>
        )}
      </div>
    </div>
  );
};

export default CrmContactAboutTab;
