import React from 'react';
import {
  RiInformationFill,
  RiShieldCheckLine,
  RiBankLine,
  RiArrowRightSLine,
  RiShieldCheckFill,
  RiBankFill,
  RiDashboardLine,
  RiDashboardFill,
  RiFundsLine,
  RiFundsFill,
  RiPresentationLine,
  RiPresentationFill,
  RiNewspaperLine,
  RiNewspaperFill,
} from 'react-icons/ri';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import {
  ACCOUNT_RESEARCH_SIDEBAR_ITEMS,
  ACCOUNT_RESEARCH_SIDEBAR_KEYS,
  hasScrapedResearchData,
} from '@/utils/scraped-research';

const baseSidebarItems = [
  { key: 'basic', label: 'Basic Details', icon: RiInformationFill, activeIcon: RiInformationFill },
  {
    key: 'statutory',
    label: 'Statutory & Compliance',
    icon: RiShieldCheckLine,
    activeIcon: RiShieldCheckFill,
  },
  { key: 'bank', label: 'Bank Details', icon: RiBankLine, activeIcon: RiBankFill },
];

const researchIconByKey = {
  'company-foundation': { icon: RiDashboardLine, activeIcon: RiDashboardFill },
  'market-position-offerings': { icon: RiPresentationLine, activeIcon: RiPresentationFill },
  'digital-presence-signal': { icon: RiNewspaperLine, activeIcon: RiNewspaperFill },
  'financial-investment-performance': { icon: RiFundsLine, activeIcon: RiFundsFill },
};

const sidebarItems = [
  ...baseSidebarItems,
  ...ACCOUNT_RESEARCH_SIDEBAR_ITEMS.map((item) => ({
    ...item,
    ...researchIconByKey[item.key],
  })),
];

const CrmAccountAboutSidebar = ({ activeItem, onItemChange, account }) => {
  const hasScrappedData = hasScrapedResearchData(account);

  const visibleSidebarItems = React.useMemo(
    () =>
      sidebarItems.filter((item) => {
        if (ACCOUNT_RESEARCH_SIDEBAR_KEYS.includes(item.key)) {
          return hasScrappedData;
        }
        return true;
      }),
    [hasScrappedData],
  );

  React.useEffect(() => {
    const isVisible = visibleSidebarItems.some((item) => item.key === activeItem);
    if (!isVisible) {
      onItemChange('basic');
    }
  }, [activeItem, visibleSidebarItems, onItemChange]);

  return (
    <TabMenuVertical.Root
      value={activeItem}
      onValueChange={onItemChange}
      className='h-full w-[240px] flex flex-col'
    >
      <TabMenuVertical.List className='h-full p-4 bg-bg-weak-100 border-r border-stroke-soft-200'>
        {visibleSidebarItems.map((item) => {
          const Icon = activeItem === item.key ? item.activeIcon : item.icon;
          return (
            <TabMenuVertical.Trigger
              key={item.key}
              value={item.key}
              className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
            >
              <TabMenuVertical.Icon as={Icon} />
              <span className='truncate'>{item.label}</span>
              <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
            </TabMenuVertical.Trigger>
          );
        })}
      </TabMenuVertical.List>
    </TabMenuVertical.Root>
  );
};

export default CrmAccountAboutSidebar;
