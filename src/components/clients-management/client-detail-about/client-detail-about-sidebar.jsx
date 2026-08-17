import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  RiInformationFill,
  RiShieldCheckLine,
  RiBankLine,
  RiArrowRightSLine,
  RiShieldCheckFill,
  RiBankFill,
  RiBillLine,
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
  selectActiveSidebarItem,
  setActiveSidebarItem,
  selectClientDetail,
} from '@/redux/clientDetailSlice';
import { hasScrapedResearchData } from '@/utils/scraped-research';

const sidebarItems = [
  { key: 'basic', label: 'Basic Details', icon: RiInformationFill, activeIcon: RiInformationFill },
  {
    key: 'statutory',
    label: 'Statutory & Compliance',
    icon: RiShieldCheckLine,
    activeIcon: RiShieldCheckFill,
  },
  { key: 'bank', label: 'Bank Details', icon: RiBankLine, activeIcon: RiBankFill },
  {
    key: 'company-foundation',
    label: 'Company Foundation',
    icon: RiDashboardLine,
    activeIcon: RiDashboardFill,
  },
  {
    key: 'market-position-offerings',
    label: 'Market Position & Offering',
    icon: RiPresentationLine,
    activeIcon: RiPresentationFill,
  },
  {
    key: 'digital-presence-signal',
    label: 'Digital Presence & Signal',
    icon: RiNewspaperLine,
    activeIcon: RiNewspaperFill,
  },
  {
    key: 'financial-investment-performance',
    label: 'Financial Investment & Performance',
    icon: RiFundsLine,
    activeIcon: RiFundsFill,
  },
];

const ClientDetailAboutSidebar = () => {
  const dispatch = useDispatch();
  const activeItem = useSelector(selectActiveSidebarItem);
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;

  const hasScrappedData = hasScrapedResearchData(client);

  const researchItemKeys = [
    'company-foundation',
    'market-position-offerings',
    'digital-presence-signal',
    'financial-investment-performance',
  ];

  const visibleSidebarItems = React.useMemo(() => {
    return sidebarItems.filter((item) => {
      // If it's a research item, only show if we have scrapped data
      if (researchItemKeys.includes(item.key)) {
        return hasScrappedData;
      }
      // All other items are always shown
      return true;
    });
  }, [hasScrappedData]);

  // Reset active item if it's no longer visible (e.g., when scrapped data is cleared)
  React.useEffect(() => {
    const isVisible = visibleSidebarItems.some((item) => item.key === activeItem);
    if (!isVisible) {
      dispatch(setActiveSidebarItem('basic'));
    }
  }, [activeItem, visibleSidebarItems, dispatch]);

  return (
    <TabMenuVertical.Root
      value={activeItem}
      onValueChange={(value) => dispatch(setActiveSidebarItem(value))}
      className='h-full w-[240px] flex flex-col'
    >
      <TabMenuVertical.List className='h-full p-4 bg-bg-weak-100 border-r border-stroke-soft-200'>
        {visibleSidebarItems.map((item) => {
          const Icon = item.icon;
          const ActiveIcon = item.activeIcon;
          return (
            <TabMenuVertical.Trigger
              key={item.key}
              value={item.key}
              className='data-[state=active]:bg-white data-[state=active]:shadow-regular-sm'
            >
              <TabMenuVertical.Icon as={activeItem === item.key ? ActiveIcon : Icon} />
              <span className='truncate'>{item.label}</span>
              <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
            </TabMenuVertical.Trigger>
          );
        })}
      </TabMenuVertical.List>
    </TabMenuVertical.Root>
  );
};

export default ClientDetailAboutSidebar;
