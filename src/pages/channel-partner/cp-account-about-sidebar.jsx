import React from 'react';
import {
  RiArrowRightSLine,
  RiInformationFill,
  RiShieldCheckLine,
  RiShieldCheckFill,
  RiBankLine,
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

const BASE_SIDEBAR_ITEMS = [
  { key: 'basic', label: 'Basic Details', icon: RiInformationFill, activeIcon: RiInformationFill },
  {
    key: 'statutory',
    label: 'Statutory & Compliance',
    icon: RiShieldCheckLine,
    activeIcon: RiShieldCheckFill,
  },
  { key: 'bank', label: 'Bank Details', icon: RiBankLine, activeIcon: RiBankFill },
];

const RESEARCH_ICON_BY_KEY = {
  'company-foundation': { icon: RiDashboardLine, activeIcon: RiDashboardFill },
  'market-position-offerings': { icon: RiPresentationLine, activeIcon: RiPresentationFill },
  'digital-presence-signal': { icon: RiNewspaperLine, activeIcon: RiNewspaperFill },
  'financial-investment-performance': { icon: RiFundsLine, activeIcon: RiFundsFill },
};

const RESEARCH_SIDEBAR_ITEMS = ACCOUNT_RESEARCH_SIDEBAR_ITEMS.map((item) => ({
  ...item,
  ...RESEARCH_ICON_BY_KEY[item.key],
}));

const SIDEBAR_ITEMS = [...BASE_SIDEBAR_ITEMS, ...RESEARCH_SIDEBAR_ITEMS];

/**
 * Sidebar for About CP Account: Basic Details, Statutory & Compliance, Bank Details.
 * Selection is controlled by parent via value and onValueChange.
 */
const CpAccountAboutSidebar = ({ value, onValueChange, account }) => {
  const hasScrappedData = hasScrapedResearchData(account);

  const visibleSidebarItems = React.useMemo(
    () =>
      SIDEBAR_ITEMS.filter((item) => {
        if (ACCOUNT_RESEARCH_SIDEBAR_KEYS.includes(item.key)) {
          return hasScrappedData;
        }
        return true;
      }),
    [hasScrappedData],
  );

  React.useEffect(() => {
    const isVisible = visibleSidebarItems.some((item) => item.key === value);
    if (!isVisible) {
      onValueChange('basic');
    }
  }, [value, visibleSidebarItems, onValueChange]);

  return (
    <TabMenuVertical.Root
      value={value}
      onValueChange={onValueChange}
      className='h-full flex flex-col'
    >
      <TabMenuVertical.List className='h-full min-w-[240px] p-4 bg-bg-weak-100 border-r border-stroke-soft-200'>
        {visibleSidebarItems.map((item) => {
          const Icon = item.icon;
          const ActiveIcon = item.activeIcon;
          return (
            <TabMenuVertical.Trigger
              key={item.key}
              value={item.key}
              className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
            >
              <TabMenuVertical.Icon as={value === item.key ? ActiveIcon : Icon} />
              <span className='truncate'>{item.label}</span>
              <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
            </TabMenuVertical.Trigger>
          );
        })}
      </TabMenuVertical.List>
    </TabMenuVertical.Root>
  );
};

export default CpAccountAboutSidebar;
export { SIDEBAR_ITEMS };
